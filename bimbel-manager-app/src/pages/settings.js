// ============================================================
// PAGE: PENGATURAN
// ============================================================
import { byId, safe, toast } from '../lib/utils.js';
import { state, updateSettings } from '../lib/dataStore.js';
import { getClient } from '../lib/supabaseClient.js';
import { THEME_LIST } from '../lib/schemas.js';
import { backupData, readBackupFile } from '../lib/exportUtils.js';
import { applyTheme } from '../lib/theme.js';

let previewTheme = null;

export function renderSettings() {
  previewTheme = previewTheme || state.settings.theme || 'mauve';
  const isOwner = state.me?.role === 'owner';

  byId('settings').innerHTML = `
    <div class="grid two">
      <div class="card solid">
        <div class="cardHeader"><div><h2>Profil Lembaga</h2><p>Branding ini tampil di app, invoice, kwitansi, dan laporan.</p></div></div>
        <div class="grid forms">
          <div class="field"><label>Nama Lembaga</label><input id="setInstitution" value="${safe(state.settings.institutionName || '')}" ${isOwner ? '' : 'disabled'}></div>
          <div class="field"><label>Penanggung Jawab</label><input id="setPic" value="${safe(state.settings.picName || '')}" ${isOwner ? '' : 'disabled'}></div>
          <div class="field"><label>Nomor WhatsApp</label><input id="setPhone" value="${safe(state.settings.phone || '')}" ${isOwner ? '' : 'disabled'}></div>
          <div class="field"><label>Logo Lembaga</label><input id="setLogo" type="file" accept="image/*" ${isOwner ? '' : 'disabled'}></div>
          <div class="field" style="grid-column:1/-1"><label>Alamat</label><textarea id="setAddress" ${isOwner ? '' : 'disabled'}>${safe(state.settings.address || '')}</textarea></div>
          <div class="field" style="grid-column:1/-1"><label>Catatan Invoice</label><textarea id="setInvoiceNote" ${isOwner ? '' : 'disabled'}>${safe(state.settings.invoiceNote || '')}</textarea></div>
          <div class="field" style="grid-column:1/-1"><label>Kalimat Penutup Pesan WhatsApp</label><textarea id="setWaFooter" ${isOwner ? '' : 'disabled'}>${safe(state.settings.waFooter || '')}</textarea></div>
        </div>
        ${isOwner ? `<div class="actions" style="margin-top:14px"><button class="btn primary" onclick="saveInstitutionSettings()">Simpan Profil</button><button class="btn soft" onclick="resetLogo()">Hapus Logo</button></div>` : ''}
      </div>
      <div class="card solid">
        <div class="cardHeader"><div><h2>Tema Aplikasi</h2><p>Pilih tema profesional. Preview dulu, lalu simpan dan kunci.</p></div><span class="badge ${state.settings.themeLocked ? 'warn' : 'ok'}">${state.settings.themeLocked ? 'Tema terkunci' : 'Bisa diedit'}</span></div>
        <div id="themeBox" class="${state.settings.themeLocked && isOwner ? 'locked' : ''}">${renderThemeSelector()}</div>
        ${isOwner ? `<div class="actions" style="margin-top:14px"><button class="btn soft" onclick="unlockTheme()">Buka Kunci</button><button class="btn primary" onclick="saveThemeLock()">Simpan & Kunci Tema</button></div>` : ''}
      </div>
    </div>
    <div class="card solid" style="margin-top:16px">
      <div class="cardHeader"><div><h2>Backup Data</h2><p>Cadangan tambahan di luar Supabase — simpan sesekali, terutama sebelum perubahan besar.</p></div></div>
      <div class="actions"><button class="btn primary" onclick="downloadBackup()">Download Backup JSON</button></div>
      <div class="analysisNote" style="margin-top:12px"><b>Catatan:</b> restore data besar (siswa/pembayaran/dll) dari file backup sengaja tidak otomatis lewat tombol untuk menghindari risiko menimpa data hidup secara tidak sengaja. Kalau perlu restore, hubungi admin/developer Hasilin untuk dibantu secara manual.</div>
    </div>`;

  byId('setLogo')?.addEventListener('change', handleLogoUpload);
}

function renderThemeSelector() {
  return `<div class="themePreviewGrid">${THEME_LIST.map((t) => `<div class="themeSwatch ${previewTheme === t[0] ? 'active' : ''}" onclick="previewThemeChoice('${t[0]}')"><div class="swatchBars"><span style="background:${t[2]}"></span><span style="background:${t[3]}"></span><span style="background:${t[4]}"></span></div><b>${safe(t[1])}</b><div class="subtle">${safe(t[5])}</div></div>`).join('')}</div>`;
}

window.previewThemeChoice = function (t) {
  if (state.settings.themeLocked && state.me?.role !== 'owner') return;
  previewTheme = t;
  applyTheme(t);
  renderSettings();
};

window.unlockTheme = async function () {
  try {
    await updateSettings({ themeLocked: false });
    renderSettings();
    toast('Tema dibuka. Silakan preview warna.');
  } catch (e) { toast(e.message); }
};

window.saveThemeLock = async function () {
  try {
    await updateSettings({ theme: previewTheme, themeLocked: true });
    applyTheme(state.settings.theme);
    renderSettings();
    toast('Tema disimpan dan dikunci.');
  } catch (e) { toast(e.message); }
};

window.saveInstitutionSettings = async function () {
  try {
    await updateSettings({
      institutionName: byId('setInstitution').value || 'Bimbel',
      picName: byId('setPic').value || 'Owner',
      phone: byId('setPhone').value || '',
      address: byId('setAddress').value || '',
      invoiceNote: byId('setInvoiceNote').value || '',
      waFooter: byId('setWaFooter').value || '',
    });
    applyTheme(state.settings.theme);
    toast('Profil lembaga disimpan.');
  } catch (e) { toast(e.message); }
};

async function handleLogoUpload(e) {
  const f = e.target.files[0];
  if (!f) return;
  try {
    toast('Mengunggah logo...');
    const ext = f.name.split('.').pop();
    const path = `logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await getClient().storage.from('branding').upload(path, f, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = getClient().storage.from('branding').getPublicUrl(path);
    await updateSettings({ logoUrl: publicUrlData.publicUrl });
    applyTheme(state.settings.theme);
    renderSettings();
    toast('Logo berhasil dipasang.');
  } catch (err) {
    console.error(err);
    toast(err.message || 'Gagal mengunggah logo.');
  }
}

window.resetLogo = async function () {
  try {
    await updateSettings({ logoUrl: '' });
    applyTheme(state.settings.theme);
    renderSettings();
  } catch (e) { toast(e.message); }
};

window.downloadBackup = function () { backupData(); };
