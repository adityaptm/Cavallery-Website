import { NextRequest, NextResponse } from "next/server";
import { jkt48Fetch, Jkt48ApiError, isJkt48ApiKeyConfigured } from "@/lib/jkt48";
import type { Jkt48SocialUpdate, Jkt48UpdatesResponse } from "@/types/jkt48";

const ERINE_KEYS = [
  "erine",
  "catherina",
  "catherine",
  "vallencia",
  "valencia",
  "c_erinejkt48",
  "jkt48.erine",
];

function checkIsErine(member?: { name?: string; username?: string; slug?: string } | null, text?: string): boolean {
  if (member) {
    const combined = `${member.name || ""} ${member.username || ""} ${member.slug || ""}`.toLowerCase();
    if (ERINE_KEYS.some((k) => combined.includes(k))) return true;
  }
  if (text) {
    const t = text.toLowerCase();
    if (ERINE_KEYS.some((k) => t.includes(k))) return true;
  }
  return false;
}

function extractMediaUrls(item: any, tweetOrPost: any): string[] {
  const urls: string[] = [];
  const add = (u: any) => {
    if (typeof u === "string" && u.trim() && !urls.includes(u.trim())) {
      urls.push(u.trim());
    }
  };

  // Direct media_urls array
  if (Array.isArray(item?.media_urls)) item.media_urls.forEach(add);
  if (Array.isArray(tweetOrPost?.media_urls)) tweetOrPost.media_urls.forEach(add);

  // Twitter extended_entities
  if (Array.isArray(tweetOrPost?.extended_entities?.media)) {
    tweetOrPost.extended_entities.media.forEach((m: any) => {
      add(m.media_url_https || m.media_url || m.url);
    });
  }
  // Twitter entities
  if (Array.isArray(tweetOrPost?.entities?.media)) {
    tweetOrPost.entities.media.forEach((m: any) => {
      add(m.media_url_https || m.media_url || m.url);
    });
  }
  // Twitter photos or media array
  if (Array.isArray(tweetOrPost?.photos)) {
    tweetOrPost.photos.forEach((p: any) => add(typeof p === "string" ? p : p.url));
  }
  if (Array.isArray(tweetOrPost?.media)) {
    tweetOrPost.media.forEach((m: any) =>
      add(typeof m === "string" ? m : m.url || m.media_url || m.preview_image_url)
    );
  }
  if (Array.isArray(item?.media)) {
    item.media.forEach((m: any) =>
      add(typeof m === "string" ? m : m.url || m.media_url)
    );
  }

  // Instagram fields
  add(tweetOrPost?.display_url);
  add(tweetOrPost?.image_url);
  add(tweetOrPost?.thumbnail_url);
  if (Array.isArray(tweetOrPost?.images)) {
    tweetOrPost.images.forEach((img: any) =>
      add(typeof img === "string" ? img : img.url || img.src)
    );
  }
  if (Array.isArray(tweetOrPost?.carousel_media)) {
    tweetOrPost.carousel_media.forEach((c: any) =>
      add(c.image_versions2?.candidates?.[0]?.url || c.display_url || c.image_url)
    );
  }

  // TikTok fields
  add(tweetOrPost?.cover);
  add(tweetOrPost?.cover_url);
  add(tweetOrPost?.thumbnail);
  add(tweetOrPost?.video?.cover);
  add(tweetOrPost?.video?.origin_cover);
  add(item?.cover);

  return urls;
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

    // 1. Twitter / X Updates (Fokus Erine)
    if (platform === "all" || platform === "x") {
      try {
        // Coba endpoint khusus tweets Erine terlebih dahulu
        let xData: any = null;
        try {
          xData = await jkt48Fetch<any>(
            "/api/x/tweets",
            { member: "catherina-vallencia", limit: 10 },
            { revalidate: 90 }
          );
        } catch {
          try {
            xData = await jkt48Fetch<any>(
              "/api/x/tweets",
              { member: "erine", limit: 10 },
              { revalidate: 90 }
            );
          } catch {
            xData = null;
          }
        }

        // Jika endpoint khusus tidak ada / kosong, gunakan /api/x/updates
        if (!xData || (!xData.tweets && !xData.updates && !Array.isArray(xData))) {
          xData = await jkt48Fetch<any>(
            "/api/x/updates",
            { after: cursor || undefined, limit: 50 },
            { revalidate: 90 }
          );
        }

        const rawList = Array.isArray(xData)
          ? xData
          : Array.isArray(xData?.tweets)
          ? xData.tweets
          : Array.isArray(xData?.updates)
          ? xData.updates
          : [];

        for (const item of rawList) {
          const tweet = item.tweet || item;
          const memberObj = tweet.member || {
            name: tweet.user?.name || "Catherina Vallencia",
            username: tweet.user?.screen_name || "CErine_JKT48",
            avatar: tweet.user?.profile_image_url || "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
            slug: "catherina-vallencia",
          };

          // HANYA masukkan tweet milik Erine jika berasal dari stream campuran
          if (xData?.updates && !checkIsErine(memberObj, tweet.text)) {
            continue;
          }

          const mediaList = extractMediaUrls(item, tweet);

          allUpdates.push({
            cursor: String(item.cursor || tweet.id || `x-${Math.random()}`),
            platform: "x",
            member: {
              name: memberObj.name || "Catherina Vallencia",
              username: memberObj.username || "CErine_JKT48",
              avatar: memberObj.avatar || "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
              slug: memberObj.slug || "catherina-vallencia",
            },
            text: tweet.text || tweet.full_text || "",
            url: item.url || tweet.url || (tweet.id ? `https://x.com/i/status/${tweet.id}` : "https://x.com/CErine_JKT48"),
            media_urls: mediaList,
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

    // 2. Instagram Updates (Fokus Erine)
    if (platform === "all" || platform === "instagram") {
      try {
        let igData: any = null;
        try {
          igData = await jkt48Fetch<any>(
            "/api/instagram/posts",
            { member: "catherina-vallencia", limit: 10 },
            { revalidate: 90 }
          );
        } catch {
          try {
            igData = await jkt48Fetch<any>(
              "/api/instagram/posts",
              { member: "erine", limit: 10 },
              { revalidate: 90 }
            );
          } catch {
            igData = null;
          }
        }

        if (!igData || (!igData.posts && !igData.updates && !Array.isArray(igData))) {
          igData = await jkt48Fetch<any>(
            "/api/instagram/updates",
            { after: cursor || undefined, limit: 50 },
            { revalidate: 90 }
          );
        }

        const rawIgList = Array.isArray(igData)
          ? igData
          : Array.isArray(igData?.posts)
          ? igData.posts
          : Array.isArray(igData?.updates)
          ? igData.updates
          : [];

        for (const item of rawIgList) {
          const post = item.post || item;
          const memberObj = post.member || {
            name: post.user?.username || "Catherina Vallencia",
            username: post.user?.username || "jkt48.erine",
            avatar: "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
            slug: "catherina-vallencia",
          };

          if (igData?.updates && !checkIsErine(memberObj, post.text)) {
            continue;
          }

          const mediaList = extractMediaUrls(item, post);

          allUpdates.push({
            cursor: String(item.cursor || post.id || `ig-${Math.random()}`),
            platform: "instagram",
            member: {
              name: memberObj.name || "Catherina Vallencia",
              username: memberObj.username || "jkt48.erine",
              avatar: memberObj.avatar || "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
              slug: memberObj.slug || "catherina-vallencia",
            },
            text: post.text || post.caption || "",
            url: item.url || post.url || (post.shortcode ? `https://instagram.com/p/${post.shortcode}` : "https://instagram.com/jkt48.erine"),
            media_urls: mediaList,
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
        let ttData: any = null;
        try {
          ttData = await jkt48Fetch<any>(
            "/api/tiktok/posts",
            { member: "catherina-vallencia", limit: 10 },
            { revalidate: 120 }
          );
        } catch {
          try {
            ttData = await jkt48Fetch<any>(
              "/api/tiktok/posts",
              { member: "erine", limit: 10 },
              { revalidate: 120 }
            );
          } catch {
            ttData = null;
          }
        }

        const list = Array.isArray(ttData?.posts)
          ? ttData.posts
          : Array.isArray(ttData)
          ? ttData
          : [];

        for (const item of list) {
          const mediaList = extractMediaUrls(item, item);

          allUpdates.push({
            cursor: String(item.cursor || item.id || `tt-${Math.random()}`),
            platform: "tiktok",
            member: {
              name: item.member_name || "Catherina Vallencia",
              username: item.author_username || "jkt48.erine",
              avatar: item.author_avatar || "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
              slug: "catherina-vallencia",
            },
            text: item.text || item.title || item.desc || "",
            url: item.url || (item.id ? `https://www.tiktok.com/@jkt48.erine/video/${item.id}` : "https://www.tiktok.com/@jkt48.erine"),
            media_urls: mediaList,
            created_at: item.created_at || new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn("[JKT48 Updates] TikTok fetch warning:", err);
      }
    }

    // Urutkan feed terbaru ke terlama
    allUpdates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const finalUpdates = allUpdates.slice(0, limit);

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
