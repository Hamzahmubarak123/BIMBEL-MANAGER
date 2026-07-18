// ============================================================
// PAGE: ADMIN & AKSES (khusus owner)
// Owner bisa menambah akun admin baru untuk cabang tertentu.
// Pembuatan akun (email+password) lewat Edge Function `create-staff`
// karena butuh service_role — lihat supabase/functions/create-staff.
// ============================================================
import { byId, safe, toast } from '../lib/utils.js';
import { state } from '../lib/dataStore.js';
import { createStaffMember } from '../lib/auth.js';

export function renderStaff() {
  if (state.me?.role !== 'owner') {
    byId('staff').innerHTML = `<div class="card solid"><div class="empty">Halaman ini hanya bisa diakses oleh owner.</div></div>`;
    return;
  }

  byId('staff').innerHTML = `
    <div class="card solid">
      <div class="tableToolbar">
        <div><h2 style="margin:0">Admin & Akses</h2><p class="muted" style="margin:4px 0 0">Tambah akun admin untuk cabang tertentu. Owner selalu punya akses ke semua cabang.</p></div>
        <button class="btn primary" onclick="openStaffForm()">＋ Tambah Admin</button>
      </div>
      <div class="tableWrap">
        <table>
          <thead><tr><th>Nama</th><th>Role</th><th>Cabang</th><th>Telepon</th></tr></thead>
          <tbody>${state.staff.map((s) => `<tr><td><b>${safe(s.name)}</b></td><td><span class="badge ${s.role === 'owner' ? 'info' : 'muted'}">${safe(s.role)}</span></td><td>${s.role === 'owner' ? 'Semua cabang' : safe((s.branchIds || []).map((id) => branchLabel(id)).join(', ') || '-')}</td><td>${safe(s.phone || '-')}</td></tr>`).join('') || `<tr><td colspan="4"><div class="empty">Belum ada data staff.</div></td></tr>`}</tbody>
        </table>
      </div>
      <div class="analysisNote" style="margin-top:14px"><b>Catatan:</b> setelah akun dibuat, kirimkan email & password yang tadi diisi ke admin lewat WhatsApp secara manual. Admin bisa mengganti password sendiri nanti lewat menu akun Supabase Auth standar (bisa ditambahkan di fase berikutnya jika dibutuhkan).</div>
    </div>`;
}

function branchLabel(id) {
  const b = state.branches.find((x) => x.id === id);
  return b ? b.name : id;
}

window.openStaffForm = function () {
  byId('modalTitle').textContent = 'Tambah Admin';
  byId('modalBody').innerHTML = `
    <form id="staffForm">
      <div class="grid forms">
        <div class="field"><label>Nama *</label><input name="name" required></div>
        <div class="field"><label>No. WhatsApp</label><input name="phone" type="tel"></div>
        <div class="field"><label>Email *</label><input name="email" type="email" required></div>
        <div class="field"><label>Password *</label><input name="password" type="text" required minlength="6" placeholder="Minimal 6 karakter"></div>
      </div>
      <div class="field" style="margin-top:10px">
        <label>Cabang yang boleh diakses admin ini</label>
        <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
          ${state.branches.map((b) => `<label class="field checkboxRow"><input type="checkbox" name="branchIds" value="${b.id}"> ${safe(b.name)}</label>`).join('')}
        </div>
        <small>Boleh centang lebih dari satu cabang, atau satu saja.</small>
      </div>
    </form>`;
  byId('modalFoot').innerHTML = `<button class="btn" onclick="closeModal()">Batal</button><button class="btn primary" onclick="submitStaffForm()">Buat Akun</button>`;
  byId('modalOverlay').classList.add('show');
};

window.submitStaffForm = async function () {
  const form = byId('staffForm');
  if (!form.reportValidity()) return;
  const fd = new FormData(form);
  const branchIds = Array.from(form.querySelectorAll('input[name="branchIds"]:checked')).map((el) => el.value);
  if (!branchIds.length) { toast('Pilih minimal 1 cabang untuk admin ini.'); return; }

  const submitBtn = byId('modalFoot')?.querySelector('.primary');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Membuat akun...'; }

  try {
    const staffRow = await createStaffMember({
      name: fd.get('name'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      password: fd.get('password'),
      role: 'admin',
      branchIds,
    });
    state.staff.push(staffRow);
    window.closeModal();
    renderStaff();
    toast('Akun admin berhasil dibuat. Jangan lupa kirim email & password ke admin lewat WhatsApp.');
  } catch (e) {
    console.error(e);
    toast(e.message || 'Gagal membuat akun admin.');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Buat Akun'; }
  }
};
