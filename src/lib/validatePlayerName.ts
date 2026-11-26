/**
 * Client-safe player name validation utility.
 * This file is safe to import in "use client" components because it
 * does NOT depend on any server-only modules (mysql2, fs, path).
 */

// Indonesian Simple Bad Words Filter
const BAD_WORDS = [
  "anjing", "babi", "bangsat", "kontol", "memek", "jembut", "pantek", "itil",
  "perek", "lonte", "pepek", "ngentot", "tai", "bajingan", "asu", "kampang",
  "kimak", "puki", "bocil", "tolol", "goblok", "idiot", "bego", "fak", "fuck",
  "bitch", "shit", "asshole", "cunt", "dick", "pussy"
];

export function validatePlayerName(name: string): { valid: boolean; error?: string; cleanName: string } {
  const trimmed = (name || "").trim();
  if (trimmed.length < 3) {
    return { valid: false, error: "Nama minimal 3 karakter.", cleanName: trimmed };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: "Nama maksimal 20 karakter.", cleanName: trimmed };
  }
  // Only letters, numbers, underscore, space
  const nameRegex = /^[a-zA-Z0-9_ ]+$/;
  if (!nameRegex.test(trimmed)) {
    return { valid: false, error: "Nama hanya boleh berisi huruf, angka, spasi, dan underscore.", cleanName: trimmed };
  }

  // Check bad words
  const lower = trimmed.toLowerCase();
  for (const word of BAD_WORDS) {
    if (lower.includes(word)) {
      return { valid: false, error: "Nama mengandung kata yang tidak pantas. Gunakan nama lain ya!", cleanName: trimmed };
    }
  }

  return { valid: true, cleanName: trimmed };
}
