require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });
const mysql = require("mysql2/promise");

async function main() {
  console.log("==> Starting Dynamic Recruitment Migration & Seeding...");

  const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "u410588002_Cavallery",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  try {
    // 1. Create table recruitments
    console.log("--> Creating table `recruitments`...");
    await pool.query(`
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

    // 2. Create table recruitment_questions
    console.log("--> Creating table `recruitment_questions`...");
    await pool.query(`
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

    // 3. Alter recruitment_submissions columns if needed
    console.log("--> Checking `recruitment_submissions` columns...");
    const [cols] = await pool.query("SHOW COLUMNS FROM `recruitment_submissions`");
    const colSet = new Set(cols.map((c) => c.Field));

    if (!colSet.has("recruitment_id")) {
      console.log("    Adding `recruitment_id` column...");
      await pool.query("ALTER TABLE `recruitment_submissions` ADD COLUMN `recruitment_id` INT NULL AFTER `id`");
      await pool.query("ALTER TABLE `recruitment_submissions` ADD INDEX `idx_sub_rec` (`recruitment_id`)");
    }
    if (!colSet.has("ip_address")) {
      console.log("    Adding `ip_address` column...");
      await pool.query("ALTER TABLE `recruitment_submissions` ADD COLUMN `ip_address` VARCHAR(45) NULL");
    }
    if (!colSet.has("user_agent")) {
      console.log("    Adding `user_agent` column...");
      await pool.query("ALTER TABLE `recruitment_submissions` ADD COLUMN `user_agent` VARCHAR(255) NULL");
    }

    // 4. Create table recruitment_answers
    console.log("--> Creating table `recruitment_answers`...");
    await pool.query(`
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

    // 5. Seed Recruitments
    console.log("--> Seeding Initial Recruitments...");
    const initialRecruitments = [
      {
        slug: "member",
        role_id: "member",
        title: "Join Member Cavallery 2026",
        description:
          "Keanggotaan resmi Cavallery untuk berpartisipasi aktif dalam kegiatan harian, gathering, dan dukungan bersama Erine.",
        is_active: 1,
        questions: [
          {
            label: "Persetujuan Iuran Kas Anggota",
            field_key: "fee_agreed",
            type: "checkbox",
            help_text: "Apakah kamu bersedia membayar iuran kas anggota resmi Rp30.000 / 2 bulan (Sep & Okt)?",
            is_required: 1,
            options: ["Saya bersedia membayar iuran kas anggota Cavallery"],
          },
          {
            label: "Nama Lengkap",
            field_key: "full_name",
            type: "text",
            placeholder: "Contoh: Muhammad Raihan",
            is_required: 1,
            validation: { min: 3, max: 100 },
          },
          {
            label: "Nama Panggilan",
            field_key: "nickname",
            type: "text",
            placeholder: "Contoh: Raihan",
            is_required: 0,
          },
          {
            label: "Alamat Email Aktif",
            field_key: "email",
            type: "email",
            placeholder: "nama@gmail.com",
            is_required: 1,
          },
          {
            label: "Jenis Kelamin",
            field_key: "gender",
            type: "radio",
            is_required: 1,
            options: ["Laki-laki", "Perempuan"],
          },
          {
            label: "Kota Domisili Saat Ini",
            field_key: "city",
            type: "text",
            placeholder: "Contoh: Jakarta Selatan",
            is_required: 1,
          },
          {
            label: "Nomor WhatsApp",
            field_key: "whatsapp",
            type: "phone",
            placeholder: "081234567890",
            is_required: 1,
          },
          {
            label: "ID LINE",
            field_key: "line_id",
            type: "text",
            placeholder: "ID LINE aktif untuk dimasukkan ke grup koordinasi",
            is_required: 1,
          },
          {
            label: "Display Name LINE",
            field_key: "line_display_name",
            type: "text",
            placeholder: "Nama tampilan akun LINE kamu",
            is_required: 0,
          },
          {
            label: "Mengetahui Info Open Recruitment Dari Mana?",
            field_key: "info_source",
            type: "radio",
            is_required: 1,
            options: ["X (Twitter)", "Instagram", "TikTok", "Teman / Rekomendasi", "Lainnya"],
          },
          {
            label: "Hobi & Minat Kamu",
            field_key: "hobby",
            type: "checkbox",
            help_text: "Pilih hobi yang sesuai (bisa lebih dari satu)",
            is_required: 0,
            options: [
              "Editing Video",
              "Desain Grafis",
              "Fotografi",
              "Gaming / Esport",
              "Menulis / Storytelling",
              "Organisasi Event",
              "Lainnya",
            ],
          },
          {
            label: "Username Akun X (Twitter)",
            field_key: "username_x",
            type: "social_handle",
            placeholder: "@username",
            is_required: 0,
          },
          {
            label: "Username Akun Instagram",
            field_key: "username_ig",
            type: "social_handle",
            placeholder: "@username",
            is_required: 0,
          },
          {
            label: "Username Akun TikTok",
            field_key: "username_tiktok",
            type: "social_handle",
            placeholder: "@username",
            is_required: 0,
          },
          {
            label: "Alasan Ingin Bergabung dengan Cavallery",
            field_key: "reason",
            type: "textarea",
            placeholder: "Ceritakan alasan dan motivasi kamu ingin bergabung bersama Cavallery...",
            is_required: 1,
            validation: { min: 10 },
          },
          {
            label: "Bentuk Dukungan yang Pernah Kamu Lakukan untuk Erine JKT48",
            field_key: "support_type",
            type: "checkbox",
            is_required: 0,
            options: [
              "Nonton Theater",
              "Beli Photopack / Merch",
              "Vote Sousenkyo / Senbatsu",
              "Live Showroom / IDN Live",
              "Project Fanbase / Seitansai",
              "Follower & Support Sosmed",
            ],
          },
          {
            label: "Saran Kegiatan atau Ide Project untuk Cavallery ke Depan",
            field_key: "activity_suggestion",
            type: "textarea",
            placeholder: "Tuliskan ide kegiatan atau harapan kamu untuk Cavallery...",
            is_required: 0,
          },
        ],
      },
      {
        slug: "admin",
        role_id: "admin",
        title: "Join Admin Pengurus Cavallery 2026",
        description:
          "Perekrutan tim pengurus internal (Data Archiver, Sosmed, Video Editor, Desain Grafis, E-Sport, & Merch).",
        is_active: 1,
        questions: [
          {
            label: "Nama Lengkap",
            field_key: "full_name",
            type: "text",
            placeholder: "Nama lengkap kamu",
            is_required: 1,
          },
          {
            label: "Nama Panggilan",
            field_key: "nickname",
            type: "text",
            placeholder: "Nama panggilan",
            is_required: 0,
          },
          {
            label: "Kota Domisili",
            field_key: "city",
            type: "text",
            placeholder: "Contoh: Jakarta Pusat",
            is_required: 1,
          },
          {
            label: "Nomor WhatsApp",
            field_key: "whatsapp",
            type: "phone",
            placeholder: "081234567890",
            is_required: 1,
          },
          {
            label: "ID LINE",
            field_key: "line_id",
            type: "text",
            placeholder: "ID LINE aktif",
            is_required: 1,
          },
          {
            label: "Pekerjaan / Kesibukan Saat Ini",
            field_key: "occupation",
            type: "text",
            placeholder: "Contoh: Mahasiswa / Karyawan Swasta",
            is_required: 0,
          },
          {
            label: "Divisi / Posisi Admin yang Dituju",
            field_key: "admin_position",
            type: "select",
            is_required: 1,
            options: [
              "Video Editor",
              "Script Writer",
              "Social Media",
              "Voice Over Konten",
              "Admin Esport",
              "Editor Esport",
            ],
          },
          {
            label: "Tingkat Kemampuan / Pengalaman di Posisi Tersebut",
            field_key: "skill_familiarity",
            type: "radio",
            is_required: 1,
            options: [
              "Pemula (Belajar)",
              "Menengah (Sudah Sering)",
              "Mahir (Berpengalaman Profesional)",
            ],
          },
          {
            label: "Link Portofolio / Contoh Karya",
            field_key: "portfolio_link",
            type: "url",
            placeholder: "https://drive.google.com/... atau tautan portofolio",
            help_text: "Sertakan link Google Drive atau website portofolio karya kamu (pastikan akses link dibuka untuk publik)",
            is_required: 0,
          },
          {
            label: "Komitmen Waktu & Kerja Sama Tim",
            field_key: "teamwork_agreement",
            type: "radio",
            is_required: 1,
            options: ["Sangat Siap & Berkomitmen", "Siap Membantu di Waktu Luang"],
          },
          {
            label: "Alasan & Motivasi Mendaftar Menjadi Admin Cavallery",
            field_key: "reason",
            type: "textarea",
            placeholder: "Jelaskan mengapa kamu ingin berkontribusi di kepengurusan Cavallery...",
            is_required: 1,
          },
          {
            label: "Kesiapan Mengikuti Sesi Wawancara / Seleksi Lanjutan",
            field_key: "selection_ready",
            type: "radio",
            is_required: 1,
            options: ["Siap Mengikuti Seleksi", "Akan Menyesuaikan Jadwal"],
          },
        ],
      },
      {
        slug: "volunteer",
        role_id: "volunteer",
        title: "Join Volunteer Event STS Cavallery",
        description:
          "Bergabung sebagai relawan pelaksana untuk event kebersamaan, perayaan ulang tahun, dan proyek dukungan Erine.",
        is_active: 1,
        questions: [
          {
            label: "Nama Lengkap",
            field_key: "full_name",
            type: "text",
            placeholder: "Nama lengkap kamu",
            is_required: 1,
          },
          {
            label: "Nomor Anggota CAVA (Jika Sudah Anggota)",
            field_key: "member_number",
            type: "text",
            placeholder: "Contoh: CAVA-042 (kosongkan jika bukan anggota)",
            is_required: 0,
          },
          {
            label: "Jenis Kelamin",
            field_key: "gender",
            type: "radio",
            is_required: 1,
            options: ["Laki-laki", "Perempuan"],
          },
          {
            label: "Kota Domisili",
            field_key: "city",
            type: "text",
            placeholder: "Contoh: Jakarta / Tangerang / Bekasi",
            is_required: 1,
          },
          {
            label: "Nomor WhatsApp Aktif",
            field_key: "whatsapp",
            type: "phone",
            placeholder: "081234567890",
            is_required: 1,
          },
          {
            label: "ID LINE",
            field_key: "line_id",
            type: "text",
            placeholder: "ID LINE untuk koordinasi",
            is_required: 1,
          },
          {
            label: "Display Name LINE",
            field_key: "line_display_name",
            type: "text",
            placeholder: "Nama akun LINE kamu",
            is_required: 0,
          },
          {
            label: "Bidang / Tugas Volunteer yang Diminati",
            field_key: "jobdesk",
            type: "select",
            is_required: 1,
            options: [
              "Persiapan & Dekorasi Venue",
              "Registrasi & Pendampingan Peserta",
              "Dokumentasi Foto & Video Event",
              "Logistik & Perlengkapan",
              "Konsumsi & Kebersihan Area",
              "Semua Bidang Siap Membantu",
            ],
          },
          {
            label: "Alasan Ingin Menjadi Volunteer di Event Cavallery",
            field_key: "reason",
            type: "textarea",
            placeholder: "Ceritakan alasan dan motivasi kamu ingin ikut menyukseskan event ini...",
            is_required: 1,
          },
        ],
      },
    ];

    for (const rec of initialRecruitments) {
      // Check if recruitment exists by slug
      const [existing] = await pool.query("SELECT id FROM `recruitments` WHERE `slug` = ? LIMIT 1", [rec.slug]);
      let recId;
      if (existing && existing.length > 0) {
        recId = existing[0].id;
        console.log(`    Recruitment "${rec.title}" already exists (ID: ${recId}). Updating...`);
        await pool.query(
          "UPDATE `recruitments` SET `title` = ?, `role_id` = ?, `description` = ?, `is_active` = ? WHERE `id` = ?",
          [rec.title, rec.role_id, rec.description, rec.is_active, recId]
        );
      } else {
        const [insertRes] = await pool.query(
          "INSERT INTO `recruitments` (`title`, `slug`, `role_id`, `description`, `is_active`) VALUES (?, ?, ?, ?, ?)",
          [rec.title, rec.slug, rec.role_id, rec.description, rec.is_active]
        );
        recId = insertRes.insertId;
        console.log(`    Created Recruitment "${rec.title}" (ID: ${recId})`);
      }

      // Seed questions
      for (let i = 0; i < rec.questions.length; i++) {
        const q = rec.questions[i];
        const [qExisting] = await pool.query(
          "SELECT id FROM `recruitment_questions` WHERE `recruitment_id` = ? AND `field_key` = ? LIMIT 1",
          [recId, q.field_key]
        );

        const optionsJson = q.options ? JSON.stringify(q.options) : null;
        const validationJson = q.validation ? JSON.stringify(q.validation) : null;

        if (qExisting && qExisting.length > 0) {
          await pool.query(
            `UPDATE \`recruitment_questions\` 
             SET \`label\` = ?, \`type\` = ?, \`placeholder\` = ?, \`help_text\` = ?, \`is_required\` = ?, \`options\` = ?, \`validation\` = ?, \`sort_order\` = ?, \`is_active\` = 1 
             WHERE \`id\` = ?`,
            [
              q.label,
              q.type,
              q.placeholder || null,
              q.help_text || null,
              q.is_required ? 1 : 0,
              optionsJson,
              validationJson,
              i,
              qExisting[0].id,
            ]
          );
        } else {
          await pool.query(
            `INSERT INTO \`recruitment_questions\`
             (\`recruitment_id\`, \`label\`, \`field_key\`, \`type\`,\`placeholder\`, \`help_text\`, \`is_required\`, \`options\`, \`validation\`, \`sort_order\`, \`is_active\`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              recId,
              q.label,
              q.field_key,
              q.type,
              q.placeholder || null,
              q.help_text || null,
              q.is_required ? 1 : 0,
              optionsJson,
              validationJson,
              i,
            ]
          );
        }
      }
      console.log(`    Seeded ${rec.questions.length} questions for "${rec.title}".`);
    }

    console.log("==> All Dynamic Recruitment tables & seeds completed successfully!");
  } catch (err) {
    console.error("Migration/Seed error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
