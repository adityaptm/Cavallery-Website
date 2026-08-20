import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { query, isMySqlConfigured } from "@/lib/mysql";

const isVercel = process.env.VERCEL === "1";
const DATA_DIR = isVercel ? "/tmp" : path.join(process.cwd(), "src", "data");
const BOT_CONFIG_PATH = path.join(DATA_DIR, "bot_config.json");
const defaultRules = [
  {
    id: "rule_1",
    triggers: [["siapa", "kenal"], ["erine", "catherina"]],
    response: "Erine (Catherina Vallencia Kurniawan) itu member JKT48 generasi 12 yang sekarang berada di Team Passion! Dia diperkenalkan pertama kali tanggal 18 November 2023 di JakJapan Matsuri. Orangnya super gemesin dan berbakat banget!"
  },
  {
    id: "rule_2",
    triggers: [["setlist", "teater", "show"]],
    response: "Erine udah membawakan total 7 setlist lho! Mulai dari Aitakatta (hebatnya dia pernah bawain semua unit song di sini!), Pajama Drive, Renai Kinshi Jourei (RKJ), Te Wo Tsunaginagara (TWT), Kira Kira Girls (dia jadi global center!), terus setelah naik ke member inti ada Ramune no Nomikata dan setlist tim Passion yaitu Passion 200%!"
  },
  {
    id: "rule_3",
    triggers: [["projek", "project", "rose", "rh", "request hour", "obscura"]],
    response: "Saat ini Cavallery lagi ngadain projek Blue Rose dengan hestek #RoseObscura untuk Request Hour (RH) bertema #Memory! Kita juga ada hestek #NabungRine buat persiapan menyukseskan Erine di RH 2026 nanti. Yuk ikutan!"
  },
  {
    id: "rule_4",
    triggers: [["lahir", "umur", "usia", "tanggal"]],
    response: "Erine lahir tanggal 21 Agustus 2007 (Zodiak Leo). Sekarang dia udah makin dewasa dan terus bersinar bersama JKT48!"
  },
  {
    id: "rule_5",
    triggers: [["hometown", "asal", "tinggal", "bekasi"]],
    response: "Erine berasal dari Bekasi, Jawa Barat, Indonesia! Anak Bekasi kebanggaan Cavallery nih, hehe."
  },
  {
    id: "rule_6",
    triggers: [["maskot", "bebek", "rinara"]],
    response: "Maskot resmi Cavallery namanya Rinara! Bentuknya bebek lucu yang nemenin perjuangan kita selama SSK 2024 kemarin."
  },
  {
    id: "rule_7",
    triggers: [["golongan darah", "goldar"]],
    response: "Golongan darah Erine itu B ya guys!"
  },
  {
    id: "rule_8",
    triggers: [["tinggi", "tb"]],
    response: "Tinggi badan Erine itu 162 cm. Pas banget dan ideal!"
  },
  {
    id: "rule_9",
    triggers: [["makanan", "kesukaan", "favorit", "suka"]],
    response: "Erine suka banget makan seafood, mala tang, dan dubai chewy cookie! Hewan kesukaannya Sealion. Manis dan gurih semuanya disapu bersih, haha."
  },
  {
    id: "rule_10",
    triggers: [["mv", "video musik"]],
    response: "Erine sejauh ini udah tampil di 2 MV JKT48! Pertama, MV Undergirls 'Bibir yang Telah Dicuri' (Nusumareta Kuchibiru) berkat rank 18 di SSK 2024. Kedua, MV Team Passion yang judulnya 'Dekat Namun Jauh'!"
  },
  {
    id: "rule_11",
    triggers: [["hestek", "hashtag", "diesvenerine"]],
    response: "Erine punya banyak hestek seru! Ada #DiesVenErine (khusus hari Jumat), #MemoRine (jurnal), #SahuRine, #Ngabuburine, #BukbeRine, #GameRine (mini games), dan #NgabaRine untuk PM mingguan!"
  },
  {
    id: "rule_12",
    triggers: [["cavallery", "fanbase"]],
    response: "Cavallery adalah fanbase resmi pendukung Catherina Vallencia (Erine) JKT48! Dibentuk tanggal 18 November 2023, bertepatan dengan debut Erine. Kita solid banget lho, yuk gabung!"
  },
  {
    id: "rule_13",
    triggers: [["ssk", "sousenkyo", "rank", "peringkat"]],
    response: "Erine berhasil meraih peringkat ke-18 di SSK JKT48 2024 dan masuk to jajaran Undergirls! Keren banget kan? Selama SSK juga ada maskot Cavallery bernama Rinara si bebek lucu."
  },
  {
    id: "rule_14",
    triggers: [["team", "tim", "passion"]],
    response: "Erine sekarang ada di Team Passion! Dia dipromosikan jadi member inti JKT48 pada 25 Oktober 2025 saat event Sister Reunion. Bangga banget sama pencapaiannya!"
  },
  {
    id: "rule_15",
    triggers: [["zodiak", "leo"]],
    response: "Zodiak Erine itu Leo karena lahir tanggal 21 Agustus! Cocok banget sama kepribadiannya yang percaya diri dan bersinar di panggung."
  },
  {
    id: "rule_16",
    triggers: [["brand", "ambassador", "bihunku", "freefire", "free fire"]],
    response: "Erine menjadi Brand Ambassador BihunKu dan FreeFire bareng member JKT48 lainnya. Keren banget ya bisa jadi BA brand besar!"
  },
  {
    id: "rule_17",
    triggers: [["halo", "hai", "hey", "hi ", "hi"]],
    response: "Halo juga! Aku asisten dari Jenderal Cavallery. Mau tanya apa nih soal Erine? Aku siap bantu!"
  },
  {
    id: "rule_18",
    triggers: [["lagi apa", "kabar", "gimana", "apa kabar"]],
    response: "Erine lagi sibuk banget nih sama kegiatan JKT48 di Team Passion! Jadwal teater, latihan setlist, dan berbagai event seru lainnya. Kalau mau tau jadwal shownya, cek aja di halaman utama Cavallery ya!"
  },
  {
    id: "rule_19",
    triggers: [["terima kasih", "makasih", "thanks", "thx"]],
    response: "Sama-sama ya! Seneng bisa bantu. Jangan lupa terus dukung Erine dan Cavallery ya!"
  }
];

let inMemoryBotConfig: any = null;

function ensureDataDirectory() {
  try {
    const dir = path.dirname(BOT_CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    console.warn("Could not ensure data directory for bot_config:", e);
  }
}

export function readBotConfig() {
  if (inMemoryBotConfig) {
    return inMemoryBotConfig;
  }

  ensureDataDirectory();
  try {
    if (fs.existsSync(BOT_CONFIG_PATH)) {
      const content = fs.readFileSync(BOT_CONFIG_PATH, "utf-8");
      inMemoryBotConfig = JSON.parse(content);
      return inMemoryBotConfig;
    }
  } catch (e) {
    console.error("Error reading bot_config.json:", e);
  }

  const defaultConfig = {
    apiKey: process.env.GEMINI_API_KEY || "AIzaSyA6SbeC1Ktwu1l1nC2ES1WF3kQagN0NiX0",
    fallbackResponse: "Wah pertanyaan seru nih! Sayangnya aku belum punya info detail soal itu. Coba tanyain aku soal Erine, setlist teaternya, projek Cavallery kayak #RoseObscura, atau hestek-hestek seru lainnya ya! Aku pasti bisa bantu.",
    rules: defaultRules
  };

  try {
    fs.writeFileSync(BOT_CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write initial bot_config.json:", e);
  }

  inMemoryBotConfig = defaultConfig;
  return inMemoryBotConfig;
}

function writeBotConfig(config: any) {
  inMemoryBotConfig = config;
  ensureDataDirectory();
  try {
    fs.writeFileSync(BOT_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not persist bot_config.json to disk:", e);
  }
}

export async function GET() {
  try {
    if (isMySqlConfigured()) {
      const rows = await query<any[]>("SELECT `content_json` FROM `about_erine` WHERE `section_key`='bot_config' LIMIT 1");
      if (rows && rows.length > 0) {
        try {
          const parsed = JSON.parse(rows[0].content_json);
          if (parsed && typeof parsed === "object") {
            inMemoryBotConfig = parsed;
            return NextResponse.json({ status: true, data: parsed });
          }
        } catch {}
      }
    }
    const config = readBotConfig();
    return NextResponse.json({ status: true, data: config });
  } catch (error: any) {
    const fallbackConfig = {
      apiKey: process.env.GEMINI_API_KEY || "AIzaSyA6SbeC1Ktwu1l1nC2ES1WF3kQagN0NiX0",
      fallbackResponse: "Wah pertanyaan seru nih! Sayangnya aku belum punya info detail soal itu. Coba tanyain aku soal Erine!",
      rules: defaultRules
    };
    return NextResponse.json({ status: true, data: fallbackConfig });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = readBotConfig();

    if (body.apiKey !== undefined) {
      config.apiKey = body.apiKey.trim();
    }
    if (body.fallbackResponse !== undefined) {
      config.fallbackResponse = body.fallbackResponse.trim();
    }
    if (body.rules !== undefined && Array.isArray(body.rules)) {
      config.rules = body.rules;
    }

    if (isMySqlConfigured()) {
      await query(
        "INSERT INTO `about_erine` (`section_key`, `title`, `content_json`) VALUES ('bot_config', 'Bot AI Configuration', ?) ON DUPLICATE KEY UPDATE `content_json`=VALUES(`content_json`)",
        [JSON.stringify(config)]
      );
    }

    writeBotConfig(config);
    return NextResponse.json({ status: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

