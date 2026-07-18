// ============================================================
// UI STATE
// State kecil seputar tampilan yang dipakai lintas halaman.
// Bukan data bisnis (itu ada di dataStore.js) — murni "sedang
// melihat apa" di layar saat ini.
// ============================================================

let selectedBranch = 'all';
export const getSelectedBranch = () => selectedBranch;
export const setSelectedBranch = (id) => { selectedBranch = id || 'all'; };

let currentPage = 'dashboard';
export const getCurrentPage = () => currentPage;
export const setCurrentPage = (page) => { currentPage = page; };

// ---------- Filter cabang (dipakai bareng oleh Dashboard & Analisis Bisnis) ----------
import { safe } from './utils.js';
import { state } from './dataStore.js';

export function renderBranchFilterBar(selectedBranch) {
  // Admin cabang cuma boleh melihat cabangnya sendiri (dibatasi juga oleh RLS di server),
  // jadi filter multi-cabang cukup disembunyikan di sisi tampilan.
  if (state.me?.role === 'admin') return '';
  const branches = (state.branches || []).filter((b) => b.status !== 'Nonaktif');
  return `<div class="card solid noPrint" style="margin-bottom:16px"><div class="tableToolbar" style="margin-bottom:0"><div><h2 style="margin:0">Tampilan Cabang</h2><p class="muted" style="margin:4px 0 0">Default menampilkan semua cabang. Pilih cabang untuk melihat analisis khusus lokasi.</p></div><div class="pillNav"><button class="${selectedBranch === 'all' ? 'active' : ''}" onclick="setBranchFilter('all')">Semua Cabang</button>${branches.map((b) => `<button class="${selectedBranch === b.id ? 'active' : ''}" onclick="setBranchFilter('${b.id}')">${safe(b.name || 'Cabang')}</button>`).join('')}</div></div></div>`;
}
