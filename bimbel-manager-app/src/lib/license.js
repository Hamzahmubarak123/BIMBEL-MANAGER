// ============================================================
// LICENSE CHECK
// Dipanggil sekali di awal (sebelum layar login muncul). Menghubungi
// project "License Server" (project Supabase yang sama dengan LesKu)
// lewat fungsi RPC verify_license(). Fungsi itu SECURITY DEFINER,
// jadi tabel `clients`/`licenses` di License Server tetap terkunci
// dan cuma baris yang key-nya cocok yang pernah dikembalikan.
// ============================================================
import { createClient } from '@supabase/supabase-js';

const LICENSE_SERVER_URL = import.meta.env.VITE_LICENSE_SERVER_URL;
const LICENSE_SERVER_ANON_KEY = import.meta.env.VITE_LICENSE_SERVER_ANON_KEY;
const LICENSE_KEY = import.meta.env.VITE_LICENSE_KEY;
const PRODUCT_ID = import.meta.env.VITE_PRODUCT_ID || 'bimbel_manager';

/**
 * @returns {Promise<
 *   {ok: true, projectUrl: string, projectAnonKey: string, institutionName: string} |
 *   {ok: false, reason: string, message: string}
 * >}
 */
export async function checkLicense() {
  if (!LICENSE_SERVER_URL || !LICENSE_SERVER_ANON_KEY || !LICENSE_KEY) {
    return {
      ok: false,
      reason: 'config_missing',
      message: 'Konfigurasi lisensi belum lengkap di deployment ini. Hubungi admin/developer Hasilin.',
    };
  }

  let licenseClient;
  try {
    licenseClient = createClient(LICENSE_SERVER_URL, LICENSE_SERVER_ANON_KEY);
  } catch (e) {
    return { ok: false, reason: 'config_invalid', message: 'URL/Key License Server tidak valid.' };
  }

  const { data, error } = await licenseClient.rpc('verify_license', {
    p_license_key: LICENSE_KEY,
    p_product_id: PRODUCT_ID,
  });

  if (error) {
    console.error('[license] verify_license error:', error);
    return { ok: false, reason: 'network_error', message: 'Tidak bisa menghubungi server lisensi. Periksa koneksi internet Anda.' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { ok: false, reason: 'not_found', message: 'Lisensi tidak ditemukan untuk aplikasi ini. Hubungi admin/developer.' };
  }
  if (row.status !== 'active') {
    return {
      ok: false,
      reason: row.status || 'inactive',
      message: 'Akses belum aktif. Silakan hubungi admin untuk mengaktifkan kembali akun Anda.',
    };
  }
  if (!row.project_url || !row.project_anon_key) {
    return { ok: false, reason: 'not_provisioned', message: 'Akun belum sepenuhnya disiapkan. Hubungi admin/developer.' };
  }

  return {
    ok: true,
    projectUrl: row.project_url,
    projectAnonKey: row.project_anon_key,
    institutionName: row.institution_name || '',
  };
}
