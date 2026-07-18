// ============================================================
// SUPABASE CLIENT (project data klien)
// Client ini BARU dibuat setelah license.js berhasil memverifikasi
// lisensi ke License Server dan mendapat project_url + anon_key
// milik institusi yang login. Jangan panggil getClient() sebelum
// initClientProject() dipanggil sekali di awal (lihat main.js).
// ============================================================
import { createClient } from '@supabase/supabase-js';

let client = null;

export function initClientProject(projectUrl, projectAnonKey) {
  client = createClient(projectUrl, projectAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

export function getClient() {
  if (!client) {
    throw new Error('Supabase client project belum diinisialisasi. Pastikan checkLicense() sukses lebih dulu.');
  }
  return client;
}

export function hasClient() {
  return !!client;
}
