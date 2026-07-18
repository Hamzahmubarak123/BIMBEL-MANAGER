// ============================================================
// DATA STORE
// Satu-satunya tempat yang bicara langsung ke tabel data Supabase.
// Menyimpan salinan data di memori (`state`) supaya render tetap
// cepat/sinkron seperti versi localStorage lama, tapi sumber
// kebenarannya tetap Supabase — dan keamanan tetap ditegakkan RLS
// di server, bukan cuma oleh kode di sini.
//
// Field JS selalu camelCase; dikonversi ke snake_case cuma pas
// kirim ke Supabase (lihat utils.js keysToSnake/keysToCamel).
// ============================================================
import { getClient } from './supabaseClient.js';
import { keysToSnake, keysToCamel, todayISO } from './utils.js';
import { NUMERIC_FIELDS } from './schemas.js';

export const TABLES = ['branches', 'students', 'programs', 'enrollments', 'teachers', 'payments', 'incomes', 'expenses'];

export const state = {
  branches: [], students: [], programs: [], enrollments: [], teachers: [],
  payments: [], incomes: [], expenses: [],
  settings: {}, staff: [],
  me: null, // { id, name, role, branchIds, email }
};

export async function loadAllData() {
  const client = getClient();

  for (const table of TABLES) {
    const { data, error } = await client.from(table).select('*').order('created_at', { ascending: true });
    if (error) throw new Error(`Gagal memuat data "${table}": ${error.message}`);
    state[table] = (data || []).map(keysToCamel);
  }

  const { data: settingsRow, error: settingsErr } = await client.from('settings').select('*').eq('id', 1).maybeSingle();
  if (settingsErr) throw new Error(`Gagal memuat pengaturan: ${settingsErr.message}`);
  state.settings = keysToCamel(settingsRow) || {};

  // Baris staff lain cuma kebaca kalau role = owner (lihat RLS), aman kalau
  // hasilnya cuma 1 baris (diri sendiri) untuk admin.
  const { data: staffRows, error: staffErr } = await client.from('staff').select('*');
  if (staffErr) throw new Error(`Gagal memuat data staff: ${staffErr.message}`);
  state.staff = (staffRows || []).map(keysToCamel);
}

function prepareForWrite(obj) {
  const clean = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (NUMERIC_FIELDS.has(k)) {
      clean[k] = v === '' || v === null || v === undefined ? null : Number(v);
    } else if (v === '') {
      // Hindari string kosong dikirim ke kolom date/lainnya yang strict di Postgres.
      clean[k] = null;
    } else {
      clean[k] = v;
    }
  });
  return clean;
}

export async function insertRow(table, obj) {
  const payload = keysToSnake(prepareForWrite(obj));
  const { data, error } = await getClient().from(table).insert(payload).select().single();
  if (error) throw new Error(`Gagal menyimpan data baru: ${error.message}`);
  const row = keysToCamel(data);
  state[table].push(row);
  return row;
}

export async function updateRow(table, id, obj) {
  const payload = keysToSnake(prepareForWrite(obj));
  const { data, error } = await getClient().from(table).update(payload).eq('id', id).select().single();
  if (error) throw new Error(`Gagal memperbarui data: ${error.message}`);
  const row = keysToCamel(data);
  const idx = state[table].findIndex((x) => x.id === id);
  if (idx > -1) state[table][idx] = row;
  return row;
}

export async function deleteRow(table, id) {
  const { error } = await getClient().from(table).delete().eq('id', id);
  if (error) throw new Error(`Gagal menghapus data: ${error.message}`);
  state[table] = state[table].filter((x) => x.id !== id);
}

export async function updateSettings(obj) {
  const payload = keysToSnake(prepareForWrite(obj));
  const { data, error } = await getClient().from('settings').update(payload).eq('id', 1).select().single();
  if (error) throw new Error(`Gagal menyimpan pengaturan: ${error.message}`);
  state.settings = keysToCamel(data);
  return state.settings;
}

// ---------- lookup relasi (dipakai hampir di semua halaman) ----------
export function getStudent(id) { return state.students.find((x) => x.id === id) || {}; }
export function studentName(id) { return getStudent(id).name || '-'; }
export function getProgram(id) { return state.programs.find((x) => x.id === id) || {}; }
export function programName(id) { return getProgram(id).name || '-'; }
export function getTeacher(id) { return state.teachers.find((x) => x.id === id) || {}; }
export function teacherName(id) { return getTeacher(id).name || '-'; }
export function getBranch(id) { return state.branches.find((x) => x.id === id) || {}; }
export function branchName(id) { return getBranch(id).name || 'Cabang'; }

export function defaultBranchId() {
  if (state.me?.role === 'admin' && state.me.branchIds?.length) return state.me.branchIds[0];
  return state.branches[0]?.id || '';
}

export function filterBranch(arr, branchId = 'all') {
  return branchId === 'all' ? arr : arr.filter((row) => String(row.branchId) === String(branchId));
}

// Cabang yang boleh dilihat user yang sedang login (owner = semua, admin = miliknya saja)
export function myVisibleBranches() {
  if (!state.me || state.me.role === 'owner') return state.branches;
  return state.branches.filter((b) => (state.me.branchIds || []).includes(b.id));
}

export function branchSelectOptions(selected = '') {
  const options = state.me?.role === 'admin' ? myVisibleBranches() : state.branches;
  return options
    .filter((b) => b.status !== 'Nonaktif' || b.id === selected)
    .map((b) => `<option value="${b.id}" ${String(selected || defaultBranchId()) === String(b.id) ? 'selected' : ''}>${b.name}</option>`)
    .join('');
}

export function nextInvoiceNo() {
  return 'INV-' + new Date().getFullYear() + '-' + String((state.payments?.length || 0) + 1).padStart(3, '0');
}

export function paymentDueAmount(p) { return Math.max(0, num(p.amount) - num(p.discount) - num(p.paid)); }
export function paymentFinalAmount(p) { return Math.max(0, num(p.amount) - num(p.discount)); }

function num(v) { return Number(String(v ?? 0).replace(/[^0-9.-]/g, '')) || 0; }
