import { NextRequest, NextResponse } from "next/server";
import { jkt48Fetch, Jkt48ApiError, isJkt48ApiKeyConfigured } from "@/lib/jkt48";
import type { Jkt48SocialUpdate, Jkt48UpdatesResponse } from "@/types/jkt48";

const ERINE_KEYS = ["erine", "catherina", "catherine", "vallencia", "valencia"];

function checkIsErine(name?: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return ERINE_KEYS.some((k) => lower.includes(k));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = (searchParams.get("platform") || "all").toLowerCase();
    const cursor = searchParams.get("cursor") || "";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "25", 10), 5), 50);

    if (!isJkt48ApiKeyConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "JKT48CONNECT_API_KEY belum dikonfigurasi.",
          data: { updates: [], next_cursor: null, has_more: false },
        },
        { status: 503 }
      );
    }

    let allUpdates: Jkt48SocialUpdate[] = [];
    let nextCursor: string | null = null;
    let hasMore = false;

    // 1. Twitter / X Updates
    if (platform === "all" || platform === "x") {
      try {
        const xData = await jkt48Fetch<any>(
          "/api/x/updates",
          { after: cursor || undefined, limit },
          { revalidate: 90 }
        );
        const list = Array.isArray(xData?.updates) ? xData.updates : [];
        for (const item of list) {
          const tweet = item.tweet || item;
          const memberName = tweet.member?.name || tweet.user?.name || "JKT48";
          allUpdates.push({
            cursor: String(item.cursor || tweet.id || `x-${Math.random()}`),
            platform: "x",
            member: {
              name: memberName,
              username: tweet.member?.username || tweet.user?.screen_name || "",
              avatar: tweet.member?.avatar || tweet.user?.profile_image_url || "",
              slug: tweet.member?.slug || "",
            },
            text: tweet.text || tweet.full_text || "",
            url: item.url || tweet.url || (tweet.id ? `https://x.com/i/status/${tweet.id}` : ""),
            media_urls: tweet.media_urls || [],
            created_at: tweet.created_at || new Date().toISOString(),
          });
        }
        if (platform === "x") {
          nextCursor = xData?.next_cursor || null;
          hasMore = Boolean(xData?.has_more);
        }
      } catch (err) {
        console.warn("[JKT48 Updates] X fetch warning:", err);
      }
    }

    // 2. Instagram Updates
    if (platform === "all" || platform === "instagram") {
      try {
        const igData = await jkt48Fetch<any>(
          "/api/instagram/updates",
          { after: cursor || undefined, limit },
          { revalidate: 90 }
        );
        const list = Array.isArray(igData?.updates) ? igData.updates : [];
        for (const item of list) {
          const post = item.post || item;
          const memberName = post.member?.name || post.user?.username || "JKT48";
          allUpdates.push({
            cursor: String(item.cursor || post.id || `ig-${Math.random()}`),
            platform: "instagram",
            member: {
              name: memberName,
              username: post.member?.username || post.user?.username || "",
              avatar: post.member?.avatar || "",
              slug: post.member?.slug || "",
            },
            text: post.text || post.caption || "",
            url: item.url || post.url || (post.shortcode ? `https://instagram.com/p/${post.shortcode}` : ""),
            media_urls: post.media_urls || (post.display_url ? [post.display_url] : []),
            created_at: post.created_at || new Date().toISOString(),
          });
        }
        if (platform === "instagram") {
          nextCursor = igData?.next_cursor || null;
          hasMore = Boolean(igData?.has_more);
        }
      } catch (err) {
        console.warn("[JKT48 Updates] Instagram fetch warning:", err);
      }
    }

    // 3. TikTok Posts (khusus Erine: catherina-vallencia)
    if (platform === "all" || platform === "tiktok") {
      try {
        const ttData = await jkt48Fetch<any>(
          "/api/tiktok/posts",
          { member: "catherina-vallencia", limit: 5 },
          { revalidate: 120 }
        );
        const list = Array.isArray(ttData?.posts)
          ? ttData.posts
          : Array.isArray(ttData)
          ? ttData
          : [];

        for (const item of list) {
          allUpdates.push({
            cursor: String(item.cursor || item.id || `tt-${Math.random()}`),
            platform: "tiktok",
            member: {
              name: item.member_name || "Catherina Vallencia",
              username: item.author_username || "jkt48.erine",
              avatar: item.author_avatar || "",
              slug: "catherina-vallencia",
            },
            text: item.text || item.title || item.desc || "",
            url: item.url || (item.id ? `https://www.tiktok.com/@jkt48.erine/video/${item.id}` : ""),
            media_urls: item.cover ? [item.cover] : [],
            created_at: item.created_at || new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn("[JKT48 Updates] TikTok fetch warning:", err);
      }
    }

    // Urutkan feed terbaru ke terlama
    allUpdates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Filter Erine jika di tab "all" supaya fokus Erine di halaman About Erine
    // Namun tetap sertakan yang relevan
    const finalUpdates = allUpdates;

    const response: Jkt48UpdatesResponse = {
      updates: finalUpdates,
      next_cursor: nextCursor,
      has_more: hasMore || (allUpdates.length >= limit),
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    const status = error instanceof Jkt48ApiError ? error.status : 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memuat pembaruan media sosial.",
      },
      { status }
    );
  }
}
