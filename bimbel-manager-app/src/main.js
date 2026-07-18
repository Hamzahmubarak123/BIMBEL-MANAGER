// ============================================================
// MAIN
// Titik masuk aplikasi. Urutan boot:
//   1) Cek lisensi ke License Server (lib/license.js)
//   2) Kalau aktif -> siapkan koneksi Supabase project data klien
//   3) Kalau belum ada sesi login -> tampilkan layar login
//   4) Setelah login -> ambil profil staff (role/cabang), muat semua
//      data, lalu pasang shell utama aplikasi
// ============================================================
import './styles/variables.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/documents.css';
import './styles/responsive.css'; // WAJIB paling terakhir — lihat catatan di dalam file ini

import { checkLicense } from './lib/license.js';
import { initClientProject } from './lib/supabaseClient.js';
import { renderBlockedScreen, renderLoginScreen } from './pages/login.js';
import { renderAppShell } from './lib/appShell.js';
import { buildNav } from './lib/router.js'; // import ini juga mendaftarkan window.showPage dkk (lihat lib/router.js)
import { loadAllData, state } from './lib/dataStore.js';
import { fetchMyProfile, signOut, getSession } from './lib/auth.js';
import { applyTheme } from './lib/theme.js';

const root = document.getElementById('root');

async function boot() {
  const license = await checkLicense();
  if (!license.ok) {
    renderBlockedScreen(root, license.message);
    return;
  }

  initClientProject(license.projectUrl, license.projectAnonKey);

  const session = await getSession();
  if (!session) {
    showLogin(license.institutionName);
    return;
  }

  await startApp(license.institutionName);
}

function showLogin(institutionName) {
  renderLoginScreen(root, {
    institutionName,
    onSuccess: () => startApp(institutionName),
  });
}

async function startApp(institutionName) {
  try {
    const profile = await fetchMyProfile();
    if (!profile) {
      renderBlockedScreen(root, 'Akun Anda belum terdaftar sebagai staff aplikasi ini. Hubungi owner/admin.');
      await signOut();
      return;
    }
    state.me = profile;

    await loadAllData();
    if (!state.settings.institutionName && institutionName) {
      state.settings.institutionName = institutionName;
    }

    renderAppShell(root);
    buildNav();
    applyTheme(state.settings.theme || 'mauve');
    window.showPage('dashboard');
  } catch (e) {
    console.error(e);
    renderBlockedScreen(root, 'Gagal memuat data aplikasi: ' + (e.message || 'Terjadi kesalahan.'));
  }
}

window.doLogout = async function () {
  await signOut();
  window.location.reload();
};

boot();
