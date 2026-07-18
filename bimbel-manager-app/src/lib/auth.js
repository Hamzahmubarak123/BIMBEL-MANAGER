// ============================================================
// AUTH
// Login sesungguhnya (email + password) terjadi di project data
// klien (bukan di License Server) supaya RLS per cabang bisa
// ditegakkan langsung oleh database lewat auth.uid().
// ============================================================
import { getClient } from './supabaseClient.js';
import { keysToCamel } from './utils.js';

export async function signIn(email, password) {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await getClient().auth.signOut();
}

export async function getSession() {
  const { data } = await getClient().auth.getSession();
  return data.session;
}

export function onAuthChange(cb) {
  return getClient().auth.onAuthStateChange((_event, session) => cb(session));
}

/**
 * Ambil profil staff (nama, role, cabang yang boleh diakses) milik
 * user yang sedang login. Baris ini datang dari tabel `staff`, dibuat
 * otomatis saat owner pertama kali provisioning atau saat "Tambah Admin".
 */
export async function fetchMyProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await getClient()
    .from('staff')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = keysToCamel(data);
  return {
    id: row.id,
    name: row.name,
    role: row.role, // 'owner' | 'admin'
    branchIds: row.branchIds || [],
    email: session.user.email,
  };
}

/**
 * Dipanggil dari halaman Staff (khusus owner). Membuat akun login baru
 * + baris `staff` lewat Edge Function `create-staff`, karena membuat
 * user dengan password langsung butuh service_role yang tidak boleh
 * ada di browser.
 */
export async function createStaffMember({ name, phone, email, password, role, branchIds }) {
  const { data, error } = await getClient().functions.invoke('create-staff', {
    body: { name, phone, email, password, role, branch_ids: branchIds },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return keysToCamel(data.staff || data);
}
