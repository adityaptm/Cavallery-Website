import { query, isMySqlConfigured } from "@/lib/mysql";

let tableInitialized = false;

export type RoleApplicationType = "admin" | "volunteer";
export type RoleApplicationStatus = "diproses" | "diterima" | "ditolak";

export interface RoleApplication {
  id: number;
  anggota_id: number;
  no_anggota: string;
  nama_anggota: string;
  id_line: string | null;
  discord: string | null;
  kontak_platform: string | null;
  kontak_id: string | null;
  role_type: RoleApplicationType;
  divisi: string | null;
  alasan: string;
  pengalaman: string | null;
  ketersediaan: string | null;
  portofolio_url: string | null;
  status: RoleApplicationStatus;
  feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function ensureRoleApplicationsTable(): Promise<void> {
  if (!isMySqlConfigured() || tableInitialized) return;

  await query(`
    CREATE TABLE IF NOT EXISTS \`role_applications\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`anggota_id\` INT NOT NULL,
      \`no_anggota\` VARCHAR(50) NOT NULL,
      \`nama_anggota\` VARCHAR(150) NOT NULL,
      \`id_line\` VARCHAR(100) NULL,
      \`discord\` VARCHAR(100) NULL,
      \`kontak_platform\` VARCHAR(50) NULL,
      \`kontak_id\` VARCHAR(100) NULL,
      \`role_type\` ENUM('admin', 'volunteer') NOT NULL,
      \`divisi\` VARCHAR(100) NULL,
      \`alasan\` TEXT NOT NULL,
      \`pengalaman\` TEXT NULL,
      \`ketersediaan\` VARCHAR(255) NULL,
      \`portofolio_url\` VARCHAR(500) NULL,
      \`status\` ENUM('diproses', 'diterima', 'ditolak') NOT NULL DEFAULT 'diproses',
      \`feedback\` TEXT NULL,
      \`reviewed_by\` VARCHAR(100) NULL,
      \`reviewed_at\` DATETIME NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX \`idx_role_app_anggota\` (\`anggota_id\`),
      INDEX \`idx_role_app_status\` (\`status\`),
      INDEX \`idx_role_app_type\` (\`role_type\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  tableInitialized = true;
}
