// ============================================================
// PAGE: GERBANG LISENSI & LOGIN
// Ditampilkan sebelum shell utama aplikasi (sidebar dkk) dipasang.
// ============================================================
import { safe } from '../lib/utils.js';
import { signIn } from '../lib/auth.js';

export function renderBlockedScreen(root, message) {
  root.innerHTML = `
    <div class="gateScreen">
      <div class="gateCard">
        <h1>Akses Belum Aktif</h1>
        <p class="muted">${safe(message || 'Akses belum aktif. Silakan hubungi admin.')}</p>
      </div>
    </div>`;
}

export function renderLoginScreen(root, { institutionName, onSuccess }) {
  root.innerHTML = `
    <div class="gateScreen">
      <div class="gateCard">
        <h1>Masuk ke Bimbel Manager</h1>
        <p class="muted">${institutionName ? safe(institutionName) : 'Silakan masuk dengan akun yang sudah didaftarkan owner.'}</p>
        <div id="loginError"></div>
        <form id="loginForm">
          <div class="field"><label>Email</label><input name="email" type="email" required autocomplete="username"></div>
          <div class="field"><label>Password</label><input name="password" type="password" required autocomplete="current-password"></div>
          <button class="btn primary" type="submit" style="width:100%;margin-top:6px">Masuk</button>
        </form>
      </div>
    </div>`;

  const form = root.querySelector('#loginForm');
  const errorBox = root.querySelector('#loginError');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.innerHTML = '';
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memeriksa...';
    const fd = new FormData(form);
    try {
      await signIn(fd.get('email'), fd.get('password'));
      await onSuccess();
    } catch (err) {
      errorBox.innerHTML = `<div class="gateError">${safe(err.message || 'Email atau password salah.')}</div>`;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk';
    }
  });
}
