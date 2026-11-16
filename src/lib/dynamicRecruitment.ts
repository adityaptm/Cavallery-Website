import { query, isMySqlConfigured } from "@/lib/mysql";
import getPool from "@/lib/mysql";

export type QuestionType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "phone"
  | "date"
  | "select"
  | "radio"
  | "checkbox"
  | "file"
  | "url"
  | "social_handle";

export interface QuestionValidation {
  min?: number;
  max?: number;
  regex?: string;
  fileTypes?: string[]; // e.g. ["image/jpeg", "image/png", "application/pdf"]
  maxSizeMB?: number; // e.g. 5
  customError?: string;
}

export interface Recruitment {
  id: number;
  title: string;
  slug: string;
  role_id: string; // 'member', 'admin', 'volunteer', or custom
  description: string | null;
  banner_url: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: number | boolean;
  created_at?: string;
  updated_at?: string;
  question_count?: number;
  submission_count?: number;
}

export interface RecruitmentQuestion {
  id: number;
  recruitment_id: number;
  label: string;
  field_key: string;
  type: QuestionType;
  placeholder: string | null;
  help_text: string | null;
  is_required: number | boolean;
  options: string[] | null;
  validation: QuestionValidation | null;
  sort_order: number;
  is_active: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RecruitmentSubmission {
  id: number;
  recruitment_id: number | null;
  role_id: string;
  full_name: string;
  nickname: string | null;
  email: string | null;
  city: string;
  whatsapp: string;
  line_id: string | null;
  line_display_name: string | null;
  division: string | null;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  extra_data?: any;
  answers?: RecruitmentAnswer[];
}

export interface RecruitmentAnswer {
  id: number;
  submission_id: number;
  question_id: number;
  question_label: string;
  field_key: string;
  answer_value: string | null;
  created_at?: string;
}

let tablesEnsured = false;

/**
 * Pastikan tabel-tabel dynamic recruitment tersedia di database.
 */
export async function ensureDynamicRecruitmentTables(): Promise<void> {
  if (tablesEnsured || !isMySqlConfigured()) return;

  try {
    // 1. Table recruitments
    await query(`
      CREATE TABLE IF NOT EXISTS \`recruitments\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`title\` VARCHAR(150) NOT NULL,
        \`slug\` VARCHAR(150) NOT NULL UNIQUE,
        \`role_id\` VARCHAR(50) NOT NULL DEFAULT 'member',
        \`description\` TEXT NULL,
        \`banner_url\` VARCHAR(500) NULL,
        \`start_date\` DATE NULL,
        \`end_date\` DATE NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_slug\` (\`slug\`),
        INDEX \`idx_active\` (\`is_active\`),
        INDEX \`idx_role\` (\`role_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Table recruitment_questions
    await query(`
      CREATE TABLE IF NOT EXISTS \`recruitment_questions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`recruitment_id\` INT NOT NULL,
        \`label\` VARCHAR(255) NOT NULL,
        \`field_key\` VARCHAR(100) NOT NULL,
        \`type\` VARCHAR(50) NOT NULL,
        \`placeholder\` VARCHAR(255) NULL,
        \`help_text\` TEXT NULL,
        \`is_required\` TINYINT(1) NOT NULL DEFAULT 0,
        \`options\` JSON NULL,
        \`validation\` JSON NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`uk_rec_field\` (\`recruitment_id\`, \`field_key\`),
        INDEX \`idx_rec_sort\` (\`recruitment_id\`, \`sort_order\`),
        CONSTRAINT \`fk_rec_questions_rec\` FOREIGN KEY (\`recruitment_id\`) REFERENCES \`recruitments\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Ensure recruitment_submissions has recruitment_id, ip_address, user_agent
    try {
      const existingCols = await query<any[]>("SHOW COLUMNS FROM `recruitment_submissions`");
      const colSet = new Set((existingCols || []).map((c: any) => c.Field));

      if (!colSet.has("recruitment_id")) {
        await query("ALTER TABLE `recruitment_submissions` ADD COLUMN `recruitment_id` INT NULL AFTER `id`");
        await query("ALTER TABLE `recruitment_submissions` ADD INDEX `idx_sub_rec` (`recruitment_id`)");
      }
      if (!colSet.has("ip_address")) {
        await query("ALTER TABLE `recruitment_submissions` ADD COLUMN `ip_address` VARCHAR(45) NULL");
      }
      if (!colSet.has("user_agent")) {
        await query("ALTER TABLE `recruitment_submissions` ADD COLUMN `user_agent` VARCHAR(255) NULL");
      }
    } catch (colErr: any) {
      console.warn("[ensureDynamicRecruitmentTables] Alter submissions warning:", colErr?.message);
    }

    // 4. Table recruitment_answers
    await query(`
      CREATE TABLE IF NOT EXISTS \`recruitment_answers\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`submission_id\` INT NOT NULL,
        \`question_id\` INT NOT NULL,
        \`question_label\` VARCHAR(255) NOT NULL,
        \`field_key\` VARCHAR(100) NOT NULL,
        \`answer_value\` LONGTEXT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_submission\` (\`submission_id\`),
        INDEX \`idx_question\` (\`question_id\`),
        CONSTRAINT \`fk_rec_answers_sub\` FOREIGN KEY (\`submission_id\`) REFERENCES \`recruitment_submissions\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    tablesEnsured = true;
  } catch (err: any) {
    console.error("[ensureDynamicRecruitmentTables] Error creating tables:", err?.message);
  }
}

/**
 * Format string slug yang aman untuk field_key / recruitment slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "_")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 50);
}

// ─────────────────────────────────────────────────────────────
// RECRUITMENT CRUD
// ─────────────────────────────────────────────────────────────

export async function getAllRecruitments(onlyActive = false): Promise<Recruitment[]> {
  await ensureDynamicRecruitmentTables();
  if (!isMySqlConfigured()) return [];

  let sql = `
    SELECT r.*,
      (SELECT COUNT(*) FROM recruitment_questions q WHERE q.recruitment_id = r.id AND q.is_active = 1) AS question_count,
      (SELECT COUNT(*) FROM recruitment_submissions s WHERE s.recruitment_id = r.id) AS submission_count
    FROM recruitments r
  `;
  const params: any[] = [];

  if (onlyActive) {
    sql += ` WHERE r.is_active = 1 
      AND (r.start_date IS NULL OR r.start_date <= CURDATE())
      AND (r.end_date IS NULL OR r.end_date >= CURDATE())`;
  }

  sql += ` ORDER BY r.is_active DESC, r.created_at DESC, r.id DESC`;

  const rows = await query<any[]>(sql, params);
  if (!rows) return [];

  return rows.map((r) => ({
    ...r,
    is_active: Boolean(r.is_active),
    question_count: Number(r.question_count || 0),
    submission_count: Number(r.submission_count || 0),
  }));
}

export async function getRecruitmentById(id: number): Promise<Recruitment | null> {
  await ensureDynamicRecruitmentTables();
  if (!isMySqlConfigured()) return null;

  const rows = await query<any[]>(
    `SELECT r.*,
      (SELECT COUNT(*) FROM recruitment_questions q WHERE q.recruitment_id = r.id) AS question_count,
      (SELECT COUNT(*) FROM recruitment_submissions s WHERE s.recruitment_id = r.id) AS submission_count
     FROM recruitments r WHERE r.id = ? LIMIT 1`,
    [id]
  );
  if (!rows || rows.length === 0) return null;

  const r = rows[0];
  return {
    ...r,
    is_active: Boolean(r.is_active),
    question_count: Number(r.question_count || 0),
    submission_count: Number(r.submission_count || 0),
  };
}

export async function getRecruitmentBySlug(slug: string): Promise<Recruitment | null> {
  await ensureDynamicRecruitmentTables();
  if (!isMySqlConfigured()) return null;

  const rows = await query<any[]>(
    `SELECT r.*,
      (SELECT COUNT(*) FROM recruitment_questions q WHERE q.recruitment_id = r.id AND q.is_active = 1) AS question_count
     FROM recruitments r WHERE r.slug = ? LIMIT 1`,
    [slug]
  );
  if (!rows || rows.length === 0) return null;

  const r = rows[0];
  return {
    ...r,
    is_active: Boolean(r.is_active),
    question_count: Number(r.question_count || 0),
  };
}

export async function createRecruitment(data: {
  title: string;
  slug?: string;
  role_id?: string;
  description?: string | null;
  banner_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean | number;
}): Promise<number | null> {
  await ensureDynamicRecruitmentTables();
  if (!isMySqlConfigured()) return null;

  let finalSlug = data.slug ? slugify(data.slug) : slugify(data.title);
  if (!finalSlug) finalSlug = `recruitment-${Date.now()}`;

  // Check unique slug
  const existing = await query<any[]>("SELECT id FROM recruitments WHERE slug = ? LIMIT 1", [finalSlug]);
  if (existing && existing.length > 0) {
    finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
  }

  const res: any = await query(
    `INSERT INTO recruitments 
      (title, slug, role_id, description, banner_url, start_date, end_date, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title.trim(),
      finalSlug,
      data.role_id || "member",
      data.description || null,
      data.banner_url || null,
      data.start_date || null,
      data.end_date || null,
      data.is_active === undefined ? 1 : data.is_active ? 1 : 0,
    ]
  );

  return res?.insertId || null;
}

export async function updateRecruitment(
  id: number,
  data: {
    title?: string;
    slug?: string;
    role_id?: string;
    description?: string | null;
    banner_url?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    is_active?: boolean | number;
  }
): Promise<boolean> {
  await ensureDynamicRecruitmentTables();
  if (!isMySqlConfigured()) return false;

  const updates: string[] = [];
  const params: any[] = [];

  if (data.title !== undefined) {
    updates.push("title = ?");
    params.push(data.title.trim());
  }
  if (data.slug !== undefined) {
    const s = slugify(data.slug);
    updates.push("slug = ?");
    params.push(s);
  }
  if (data.role_id !== undefined) {
    updates.push("role_id = ?");
    params.push(data.role_id);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    params.push(data.description);
  }
  if (data.banner_url !== undefined) {
    updates.push("banner_url = ?");
    params.push(data.banner_url);
  }
  if (data.start_date !== undefined) {
    updates.push("start_date = ?");
    params.push(data.start_date || null);
  }
  if (data.end_date !== undefined) {
    updates.push("end_date = ?");
    params.push(data.end_date || null);
  }
  if (data.is_active !== undefined) {
    updates.push("is_active = ?");
    params.push(data.is_active ? 1 : 0);
  }

  if (updates.length === 0) return true;

  params.push(id);
  const res: any = await query(`UPDATE recruitments SET ${updates.join(", ")} WHERE id = ?`, params);
  return Boolean(res && res.affectedRows > 0);
}

export async function deleteRecruitment(id: number): Promise<boolean> {
  await ensureDynamicRecruitmentTables();
  if (!isMySqlConfigured()) return false;

  // Backup data ke trash sebelum delete (jika tabel trash tersedia)
  try {
    const existing = await getRecruitmentById(id);
    if (existing) {
      await query(
        `INSERT INTO \`trash_records\` 
          (\`source_table\`, \`record_id\`, \`title\`, \`data_payload\`, \`deleted_by\`, \`deleted_at\`)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        ["recruitments", id, existing.title, JSON.stringify(existing), "admin"]
      );
    }
  } catch {
    // Abaikan jika tabel trash_records belum ada
  }

  const res: any = await query("DELETE FROM recruitments WHERE id = ?", [id]);
  return Boolean(res && res.affectedRows > 0);
}

// ─────────────────────────────────────────────────────────────
// QUESTIONS CRUD
// ─────────────────────────────────────────────────────────────

export async function getQuestionsByRecruitment(
  recruitmentId: number,
  onlyActive = false
): Promise<RecruitmentQuestion[]> {
  await ensureDynamicRecruitmentTables();
  if (!isMySqlConfigured()) return [];

  let sql = `SELECT * FROM recruitment_questions WHERE recruitment_id = ?`;
  const params: any[] = [recruitmentId];

  if (onlyActive) {
    sql += ` AND is_active = 1`;
  }

  sql += ` ORDER BY sort_order ASC, id ASC`;

  const rows = await query<any[]>(sql, params);
  if (!rows) return [];

  return rows.map((q) => {
    let options: string[] | null = null;
    if (q.options) {
      try {
        options = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
      } catch {
        options = null;
      }
    }

    let validation: QuestionValidation | null = null;
    if (q.validation) {
      try {
        validation = typeof q.validation === "string" ? JSON.parse(q.validation) : q.validation;
      } catch {
        validation = null;
      }
    }

    return {
      ...q,
      is_required: Boolean(q.is_required),
      is_active: Boolean(q.is_active),
      options,
      validation,
    };
  });
}

export async function createQuestion(data: {
  recruitment_id: number;
  label: string;
  field_key?: string;
  type: QuestionType;
  placeholder?: string | null;
  help_text?: string | null;
  is_required?: boolean | number;
  options?: string[] | null;
  validation?: QuestionValidation | null;
  sort_order?: number;
  is_active?: boolean | number;
}): Promise<number | null> {
  await ensureDynamicRecruitmentTables();
  if (!isMySqlConfigured()) return null;

  let fieldKey = data.field_key ? slugify(data.field_key) : slugify(data.label);
  if (!fieldKey) fieldKey = `q_${Date.now()}`;

  // Cek apakah fieldKey sudah dipakai di recruitment_id yang sama
  const existing = await query<any[]>(
    "SELECT id FROM recruitment_questions WHERE recruitment_id = ? AND field_key = ? LIMIT 1",
    [data.recruitment_id, fieldKey]
  );
  if (existing && existing.length > 0) {
    fieldKey = `${fieldKey}_${Date.now().toString().slice(-4)}`;
  }

  // Cari max sort_order jika sort_order tidak diberikan
  let sortOrder = data.sort_order;
  if (sortOrder === undefined) {
    const maxSortRow = await query<any[]>(
      "SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM recruitment_questions WHERE recruitment_id = ?",
      [data.recruitment_id]
    );
    sortOrder = Number(maxSortRow?.[0]?.max_sort ?? -1) + 1;
  }

  const optionsJson = data.options ? JSON.stringify(data.options) : null;
  const validationJson = data.validation ? JSON.stringify(data.validation) : null;

  const res: any = await query(
    `INSERT INTO recruitment_questions 
      (recruitment_id, label, field_key, type, placeholder, help_text, is_required, options, validation, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.recruitment_id,
      data.label.trim(),
      fieldKey,
      data.type,
      data.placeholder || null,
      data.help_text || null,
      data.is_required ? 1 : 0,
      optionsJson,
      validationJson,
      sortOrder,
      data.is_active === undefined ? 1 : data.is_active ? 1 : 0,
    ]
  );

  return res?.insertId || null;
}

export async function updateQuestion(
  id: number,
  data: {
    label?: string;
    field_key?: string;
    type?: QuestionType;
    placeholder?: string | null;
    help_text?: string | null;
    is_required?: boolean | number;
    options?: string[] | null;
    validation?: QuestionValidation | null;
    sort_order?: number;
    is_active?: boolean | number;
  }
): Promise<boolean> {
  await ensureDynamicRecruitmentTables();
  if (!isMySqlConfigured()) return false;

  const updates: string[] = [];
  const params: any[] = [];

  if (data.label !== undefined) {
    updates.push("label = ?");
    params.push(data.label.trim());
  }
  if (data.field_key !== undefined) {
    updates.push("field_key = ?");
    params.push(slugify(data.field_key));
  }
  if (data.type !== undefined) {
    updates.push("type = ?");
    params.push(data.type);
  }
  if (data.placeholder !== undefined) {
    updates.push("placeholder = ?");
    params.push(data.placeholder || null);
  }
  if (data.help_text !== undefined) {
    updates.push("help_text = ?");
    params.push(data.help_text || null);
  }
  if (data.is_required !== undefined) {
    updates.push("is_required = ?");
    params.push(data.is_required ? 1 : 0);
  }
  if (data.options !== undefined) {
    updates.push("options = ?");
    params.push(data.options ? JSON.stringify(data.options) : null);
  }
  if (data.validation !== undefined) {
    updates.push("validation = ?");
    params.push(data.validation ? JSON.stringify(data.validation) : null);
  }
  if (data.sort_order !== undefined) {
    updates.push("sort_order = ?");
    params.push(Number(data.sort_order));
  }
  if (data.is_active !== undefined) {
    updates.push("is_active = ?");
    params.push(data.is_active ? 1 : 0);
  }

  if (updates.length === 0) return true;

  params.push(id);
  const res: any = await query(`UPDATE recruitment_questions SET ${updates.join(", ")} WHERE id = ?`, params);
  return Boolean(res && res.affectedRows > 0);
}

/**
 * Hapus pertanyaan: Jika sudah ada jawaban dari pendaftar, lakukan soft delete (is_active = 0)
 * Jika belum ada jawaban sama sekali, lakukan hard delete dari database.
 */
export async function deleteQuestion(id: number): Promise<{ success: boolean; softDeleted: boolean }> {
  await ensureDynamicRecruitmentTables();
  if (!isMySqlConfigured()) return { success: false, softDeleted: false };

  // Cek apakah question ini sudah memiliki jawaban
  const answerRows = await query<any[]>(
    "SELECT COUNT(*) AS total FROM recruitment_answers WHERE question_id = ?",
    [id]
  );
  const totalAnswers = Number(answerRows?.[0]?.total || 0);

  if (totalAnswers > 0) {
    // Soft delete
    await query("UPDATE recruitment_questions SET is_active = 0 WHERE id = ?", [id]);
    return { success: true, softDeleted: true };
  } else {
    // Hard delete
    await query("DELETE FROM recruitment_questions WHERE id = ?", [id]);
    return { success: true, softDeleted: false };
  }
}

export async function reorderQuestions(recruitmentId: number, orderedIds: number[]): Promise<boolean> {
  await ensureDynamicRecruitmentTables();
  if (!isMySqlConfigured()) return false;

  for (let i = 0; i < orderedIds.length; i++) {
    await query(
      "UPDATE recruitment_questions SET sort_order = ? WHERE id = ? AND recruitment_id = ?",
      [i, orderedIds[i], recruitmentId]
    );
  }
  return true;
}

export async function cloneQuestions(sourceRecruitmentId: number, targetRecruitmentId: number): Promise<number> {
  await ensureDynamicRecruitmentTables();
  if (!isMySqlConfigured()) return 0;

  const sourceQuestions = await getQuestionsByRecruitment(sourceRecruitmentId);
  if (sourceQuestions.length === 0) return 0;

  let clonedCount = 0;
  for (const q of sourceQuestions) {
    await createQuestion({
      recruitment_id: targetRecruitmentId,
      label: q.label,
      field_key: q.field_key,
      type: q.type,
      placeholder: q.placeholder,
      help_text: q.help_text,
      is_required: q.is_required,
      options: q.options,
      validation: q.validation,
      sort_order: q.sort_order,
      is_active: q.is_active,
    });
    clonedCount++;
  }

  return clonedCount;
}

// ─────────────────────────────────────────────────────────────
// SUBMISSION & ANSWERS HANDLING (TRANSACTIONAL)
// ─────────────────────────────────────────────────────────────

export async function submitApplication(params: {
  recruitmentId: number;
  answers: Record<string, any>;
  meta?: { ip?: string; userAgent?: string };
}): Promise<{ success: boolean; submissionId?: number; message?: string }> {
  await ensureDynamicRecruitmentTables();
  if (!isMySqlConfigured()) {
    return { success: false, message: "Koneksi database tidak tersedia." };
  }

  const { recruitmentId, answers, meta } = params;

  // 1. Ambil recruitment & pastikan aktif
  const recruitment = await getRecruitmentById(recruitmentId);
  if (!recruitment || !recruitment.is_active) {
    return { success: false, message: "Pendaftaran rekrutmen ini sedang ditutup atau tidak aktif." };
  }

  // 2. Ambil semua pertanyaan aktif untuk recruitment ini
  const questions = await getQuestionsByRecruitment(recruitmentId, true);
  if (questions.length === 0) {
    return { success: false, message: "Belum ada formulir pertanyaan yang diatur untuk pendaftaran ini." };
  }

  // 3. Validasi Server Side untuk setiap pertanyaan
  for (const q of questions) {
    const val = answers[q.field_key];

    // Cek Required
    if (q.is_required) {
      if (
        val === undefined ||
        val === null ||
        (typeof val === "string" && val.trim() === "") ||
        (Array.isArray(val) && val.length === 0) ||
        (q.type === "checkbox" && (val === false || val === 0 || val === "false"))
      ) {
        return {
          success: false,
          message: `Pertanyaan "${q.label}" wajib diisi.`,
        };
      }
    }

    if (val !== undefined && val !== null && val !== "") {
      // Validasi per Type
      if (q.type === "email" && typeof val === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val.trim())) {
          return { success: false, message: `Format email tidak valid pada "${q.label}".` };
        }
      }

      if (q.type === "phone" && typeof val === "string") {
        const phoneClean = val.replace(/\D/g, "");
        if (phoneClean.length < 8 || phoneClean.length > 16) {
          return { success: false, message: `Nomor telepon/WhatsApp harus antara 8 - 16 digit pada "${q.label}".` };
        }
      }

      if (q.type === "number") {
        const num = Number(val);
        if (isNaN(num)) {
          return { success: false, message: `Pertanyaan "${q.label}" harus berupa angka.` };
        }
        if (q.validation?.min !== undefined && num < q.validation.min) {
          return { success: false, message: `Nilai "${q.label}" minimal ${q.validation.min}.` };
        }
        if (q.validation?.max !== undefined && num > q.validation.max) {
          return { success: false, message: `Nilai "${q.label}" maksimal ${q.validation.max}.` };
        }
      }

      // Validasi Min / Max Length untuk teks
      if (typeof val === "string" && (q.type === "text" || q.type === "textarea")) {
        if (q.validation?.min !== undefined && val.trim().length < q.validation.min) {
          return {
            success: false,
            message: `"${q.label}" minimal ${q.validation.min} karakter.`,
          };
        }
        if (q.validation?.max !== undefined && val.trim().length > q.validation.max) {
          return {
            success: false,
            message: `"${q.label}" maksimal ${q.validation.max} karakter.`,
          };
        }
      }

      // Validasi Regex Kustom jika ada
      if (q.validation?.regex && typeof val === "string") {
        try {
          const reg = new RegExp(q.validation.regex);
          if (!reg.test(val)) {
            return {
              success: false,
              message: q.validation.customError || `Format isian "${q.label}" tidak memenuhi syarat.`,
            };
          }
        } catch {
          // Abaikan jika regex tidak valid
        }
      }
    }
  }

  // 4. Petakan jawaban standar untuk kolom `recruitment_submissions`
  // Supaya kompatibel dengan dashboard lama dan tabel umum
  const findAnswer = (keywords: string[]): string | null => {
    for (const q of questions) {
      const key = q.field_key.toLowerCase();
      const lbl = q.label.toLowerCase();
      if (keywords.some((kw) => key === kw || key.includes(kw) || lbl.includes(kw))) {
        const v = answers[q.field_key];
        if (v !== undefined && v !== null) {
          return Array.isArray(v) ? v.join(", ") : String(v).trim();
        }
      }
    }
    return null;
  };

  const fullName = findAnswer(["nama", "full_name", "fullname"]) || "Pendaftar";
  const nickname = findAnswer(["panggilan", "nickname"]);
  const email = findAnswer(["email", "surel"]);
  const city = findAnswer(["kota", "domisili", "city"]) || "-";
  const whatsapp = findAnswer(["wa", "whatsapp", "telepon", "phone", "kontak"]) || "-";
  const lineId = findAnswer(["line_id", "id_line", "line"]);
  const lineDisplayName = findAnswer(["line_display_name", "display_name", "nama_line"]);
  const division = findAnswer(["divisi", "division", "posisi", "admin_position", "role"]);
  const reason = findAnswer(["alasan", "reason", "motivasi"]);

  // 5. Eksekusi Transaksi Database (Submissions + Answers Snapshots)
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [subRes]: any = await conn.execute(
      `INSERT INTO \`recruitment_submissions\` 
        (\`recruitment_id\`, \`role_id\`, \`full_name\`, \`nickname\`, \`email\`, \`city\`, \`whatsapp\`, \`line_id\`, \`line_display_name\`, \`division\`, \`reason\`, \`status\`, \`ip_address\`, \`user_agent\`, \`extra_data\`, \`created_at\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW())`,
      [
        recruitmentId,
        recruitment.role_id || "member",
        fullName,
        nickname,
        email,
        city,
        whatsapp,
        lineId,
        lineDisplayName,
        division,
        reason,
        meta?.ip || null,
        meta?.userAgent ? meta.userAgent.slice(0, 255) : null,
        JSON.stringify(answers),
      ]
    );

    const submissionId = subRes.insertId;

    // Simpan tiap jawaban ke recruitment_answers dengan snapshot label & field_key
    for (const q of questions) {
      const rawVal = answers[q.field_key];
      let valStr: string | null = null;
      if (rawVal !== undefined && rawVal !== null) {
        valStr = typeof rawVal === "object" ? JSON.stringify(rawVal) : String(rawVal);
      }

      await conn.execute(
        `INSERT INTO \`recruitment_answers\`
          (\`submission_id\`, \`question_id\`, \`question_label\`, \`field_key\`, \`answer_value\`)
         VALUES (?, ?, ?, ?, ?)`,
        [submissionId, q.id, q.label, q.field_key, valStr]
      );
    }

    await conn.commit();
    return { success: true, submissionId };
  } catch (err: any) {
    await conn.rollback();
    console.error("[submitApplication] Transaction error:", err);
    return { success: false, message: err?.message || "Gagal menyimpan formulir pendaftaran." };
  } finally {
    conn.release();
  }
}

export async function getSubmissionDetail(submissionId: number): Promise<RecruitmentSubmission | null> {
  await ensureDynamicRecruitmentTables();
  if (!isMySqlConfigured()) return null;

  const rows = await query<any[]>(
    `SELECT s.*, r.title AS recruitment_title, r.slug AS recruitment_slug 
     FROM recruitment_submissions s
     LEFT JOIN recruitments r ON s.recruitment_id = r.id
     WHERE s.id = ? LIMIT 1`,
    [submissionId]
  );
  if (!rows || rows.length === 0) return null;

  const submission = rows[0];

  const answers = await query<any[]>(
    `SELECT a.*, q.type AS question_type, q.sort_order 
     FROM recruitment_answers a
     LEFT JOIN recruitment_questions q ON a.question_id = q.id
     WHERE a.submission_id = ?
     ORDER BY COALESCE(q.sort_order, a.id) ASC`,
    [submissionId]
  );

  return {
    ...submission,
    answers: answers || [],
  };
}

export async function updateSubmissionStatus(
  id: number,
  status: "pending" | "approved" | "rejected",
  notes?: string
): Promise<boolean> {
  await ensureDynamicRecruitmentTables();
  if (!isMySqlConfigured()) return false;

  const res: any = await query(
    `UPDATE recruitment_submissions SET status = ?, notes = COALESCE(?, notes) WHERE id = ?`,
    [status, notes || null, id]
  );
  return Boolean(res && res.affectedRows > 0);
}
