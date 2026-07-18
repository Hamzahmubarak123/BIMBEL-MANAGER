// ============================================================
// APP SHELL
// Kerangka utama aplikasi (sidebar + topbar + satu <section> kosong
// per halaman + modal + toast). Dipasang sekali setelah login sukses.
// Isi tiap <section> baru diisi oleh fungsi render halaman masing-masing
// (lihat lib/router.js).
// ============================================================
import { PAGES } from './schemas.js';
import { safe } from './utils.js';
import { state } from './dataStore.js';

export function renderAppShell(root) {
  root.innerHTML = `
    <div class="app">
      <aside class="sidebar" id="sidebar">
        <div class="brand"><div class="brandLogo" id="sideLogo">BM</div><div class="brandText"><b>Bimbel Manager</b><span>Powered by Hasilin</span></div></div>
        <div class="institutionSmall"><b id="sideInstitution">Bimbel</b><span id="sideSubtitle">${safe(state.me?.role === 'owner' ? 'Owner' : 'Admin')} · ${safe(state.me?.name || '')}</span></div>
        <nav class="nav" id="nav"></nav>
        <div class="sidebarFooter"><button class="btn ghost small" style="width:100%;color:inherit;border-color:rgba(255,255,255,.25)" onclick="doLogout()">Keluar Akun</button></div>
      </aside>
      <main class="main">
        <div class="topbar noPrint">
          <button class="btn hamb" id="hambBtn">☰</button>
          <button class="backBtn" id="backBtn" onclick="showPage('dashboard')" aria-label="Kembali ke Dashboard" title="Kembali ke Dashboard">←</button>
          <div class="topTitle"><h1 id="pageTitle">Dashboard</h1><p id="pageSubtitle"></p></div>
          <div class="actions"><button class="btn soft" onclick="quickAdd('payments')">＋ Pembayaran</button><button class="btn soft" onclick="quickAdd('students')">＋ Siswa</button><button class="btn primary" onclick="showPage('documents')">Pusat Dokumen</button></div>
        </div>
        ${PAGES.map((p) => `<section id="${p[0]}" class="section"></section>`).join('')}
      </main>
    </div>
    <div class="modalOverlay" id="modalOverlay"><div class="modal"><div class="modalHead"><h3 id="modalTitle">Form</h3><button class="btn small ghost" onclick="closeModal()">✕</button></div><div class="modalBody" id="modalBody"></div><div class="modalFoot" id="modalFoot"></div></div></div>
    <div class="toast" id="toast"></div>`;

  byIdSafe('hambBtn')?.addEventListener('click', () => byIdSafe('sidebar')?.classList.toggle('open'));
}

function byIdSafe(id) { return document.getElementById(id); }
