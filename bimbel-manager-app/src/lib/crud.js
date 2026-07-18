// ============================================================
// CRUD ENGINE (generik)
// Merender tabel + form untuk entitas yang didaftarkan di schemas.js
// (branches, students, programs, enrollments, teachers, payments,
// incomes, expenses). Menambah entitas baru yang sederhana cukup
// lewat schemas.js, TANPA perlu menyentuh file ini.
//
// Halaman yang butuh perilaku sangat khusus (dashboard, documents,
// staff, settings) TIDAK lewat sini — lihat folder src/pages/.
// ============================================================
import { schemas } from './schemas.js';
import { safe, rupiah, fmtDate, byId, toast, num, todayISO, ym, monthLabel } from './utils.js';
import {
  state, insertRow, updateRow, deleteRow as deleteRowInDb,
  branchName, studentName, programName, teacherName,
  branchSelectOptions, defaultBranchId, nextInvoiceNo,
} from './dataStore.js';
import { daysUntil } from './utils.js';

const currentSearch = {};
let editContext = null; // { key, id }

export function renderCrud(key) {
  const sc = schemas[key];
  const rows = state[key] || [];
  const q = (currentSearch[key] || '').toLowerCase();
  const filtered = rows.filter((r) => JSON.stringify(searchRow(key, r)).toLowerCase().includes(q));

  byId(key).innerHTML = `
    <div class="card solid">
      <div class="tableToolbar">
        <div><h2 style="margin:0">${sc.title}</h2><p class="muted" style="margin:4px 0 0">Kelola data ${sc.title.toLowerCase()} secara fleksibel.</p></div>
        <button class="btn primary" onclick="openForm('${key}')">＋ Tambah ${sc.singular}</button>
      </div>
      <div class="tableToolbar">
        <div class="search"><input placeholder="Cari data..." value="${safe(currentSearch[key] || '')}" oninput="crudSearch('${key}', this.value)"></div>
        <span class="badge muted">${filtered.length} data</span>
      </div>
      <div class="tableWrap">
        <table>
          <thead><tr>${sc.columns.map((c) => `<th>${labelFor(key, c)}</th>`).join('')}<th>Aksi</th></tr></thead>
          <tbody>${filtered.map((r) => renderRow(key, r)).join('') || `<tr><td colspan="${sc.columns.length + 1}"><div class="empty">Belum ada data.</div></td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
}

window.crudSearch = function (key, value) {
  currentSearch[key] = value;
  renderCrud(key);
};

function labelFor(key, c) {
  return (schemas[key].fields.find((f) => f[0] === c) || [c, c])[1];
}

function searchRow(key, r) {
  const o = { ...r };
  if (r.branchId) o.branchName = branchName(r.branchId);
  if (r.studentId) o.studentName = studentName(r.studentId);
  if (r.programId) o.programName = programName(r.programId);
  if (r.employeeId) o.employeeName = teacherName(r.employeeId);
  return o;
}

function displayCell(key, c, v) {
  if (c === 'branchId') return safe(branchName(v));
  if (c === 'studentId') return safe(studentName(v));
  if (c === 'programId') return safe(programName(v));
  if (c === 'employeeId') return v ? safe(teacherName(v)) : '-';
  if (['amount', 'paid', 'discount', 'defaultFee', 'fee', 'salaryAmount'].includes(c)) return rupiah(v);
  if (['date', 'dueDate', 'joinDate', 'statusDate', 'startDate', 'endDate', 'dob'].includes(c)) return fmtDate(v);
  if (c === 'status') {
    const cls = String(v).includes('Aktif') || String(v).includes('Lunas') ? 'ok'
      : String(v).includes('Keluar') || String(v).includes('Jatuh') ? 'danger'
      : String(v).includes('Cuti') || String(v).includes('Sebagian') ? 'warn' : 'muted';
    return `<span class="badge ${cls}">${safe(v || '-')}</span>`;
  }
  if (c === 'statusReason' && v) return `<span class="reasonChip">${safe(v)}</span>`;
  return safe(v || '-');
}

function renderRow(key, r) {
  const sc = schemas[key];
  const extra = (sc.rowActions ? sc.rowActions(r) : [])
    .map((a) => `<button class="btn small ${a.className || ''}" onclick="${a.onclick}">${safe(a.label)}</button>`)
    .join('');
  return `<tr>${sc.columns.map((c) => `<td>${displayCell(key, c, r[c])}</td>`).join('')}<td><div class="tdActions">${extra}<button class="btn small" onclick="openForm('${key}','${r.id}')">Edit</button><button class="btn small danger" onclick="confirmDeleteRow('${key}','${r.id}')">Hapus</button></div></td></tr>`;
}

window.quickAdd = function (key) {
  window.showPage(key);
  setTimeout(() => window.openForm(key), 80);
};

window.openForm = function (key, id = '') {
  const sc = schemas[key];
  const data = id ? (state[key] || []).find((x) => x.id === id) || {} : {};
  editContext = { key, id };
  byId('modalTitle').textContent = (id ? 'Edit ' : 'Tambah ') + sc.singular;
  byId('modalBody').innerHTML = `<form id="crudForm"><div class="grid forms">${sc.fields.map((f) => renderField(key, f, data[f[0]])).join('')}</div></form>`;
  byId('modalFoot').innerHTML = `<button class="btn" onclick="closeModal()">Batal</button><button class="btn primary" onclick="submitForm()">Simpan</button>`;
  byId('modalOverlay').classList.add('show');
  wireConditionalFields(key);
};

function renderField(key, f, value) {
  const [name, label, type, req, opts] = f;
  const val = value ?? defaultValue(key, name, type);
  const required = req ? 'required' : '';
  let input = '';

  if (type === 'select') {
    input = `<select name="${name}" ${required}>${(opts || []).map((o) => `<option value="${safe(o)}" ${String(val) === String(o) ? 'selected' : ''}>${safe(o)}</option>`).join('')}</select>`;
  } else if (type === 'branch') {
    input = `<select name="${name}" ${required}>${branchSelectOptions(val)}</select>`;
  } else if (type === 'student') {
    input = `<select name="${name}" ${required}><option value="">Pilih siswa</option>${state.students.map((s) => `<option value="${s.id}" ${val === s.id ? 'selected' : ''}>${safe(s.name)} · ${safe(branchName(s.branchId))}</option>`).join('')}</select>`;
  } else if (type === 'program') {
    input = `<select name="${name}" ${required}><option value="">Pilih program</option>${state.programs.map((p) => `<option value="${p.id}" ${val === p.id ? 'selected' : ''}>${safe(p.name)} · ${safe(branchName(p.branchId))}</option>`).join('')}</select>`;
  } else if (type === 'teacher') {
    input = `<select name="${name}" ${required}><option value="">Tidak terkait</option>${state.teachers.map((t) => `<option value="${t.id}" ${val === t.id ? 'selected' : ''}>${safe(t.name)} · ${safe(t.role)} · ${safe(branchName(t.branchId))}</option>`).join('')}</select>`;
  } else if (type === 'textarea') {
    input = `<textarea name="${name}" ${required}>${safe(val)}</textarea>`;
  } else if (type === 'currency' || type === 'number') {
    input = `<input name="${name}" type="number" min="0" step="${type === 'currency' ? '1000' : '1'}" value="${safe(val)}" ${required}>`;
  } else if (type === 'monthText') {
    input = `<input name="${name}" type="text" value="${safe(val || monthLabel(ym()))}" ${required}>`;
  } else {
    input = `<input name="${name}" type="${type || 'text'}" value="${safe(val)}" ${required}>`;
  }

  const sc = schemas[key];
  const isConditional = sc.conditionalGroup?.fields.includes(name);
  const cls = isConditional ? 'condGroupField' : '';
  return `<div class="field ${cls}" data-field="${name}"><label>${label}${req ? ' *' : ''}</label>${input}</div>`;
}

function defaultValue(key, name, type) {
  if (type === 'date') return todayISO();
  if (type === 'currency' || type === 'number') return '';
  if (name === 'branchId') return defaultBranchId();
  if (name === 'status') return 'Aktif';
  if (name === 'joinDate') return todayISO();
  if (name === 'invoiceNo') return nextInvoiceNo();
  if (name === 'period') return monthLabel(ym());
  if (name === 'dueDate') return todayISO();
  if (name === 'returnPotential') return 'Belum Tahu';
  return '';
}

function wireConditionalFields(key) {
  const form = byId('crudForm');
  if (!form) return;
  const sc = schemas[key];

  if (sc.conditionalGroup) {
    const trigger = form.querySelector(`[name="${sc.conditionalGroup.triggerField}"]`);
    const update = () => {
      const show = sc.conditionalGroup.showValues.includes(trigger.value);
      sc.conditionalGroup.fields.forEach((name) => {
        const wrap = form.querySelector(`[data-field="${name}"]`);
        if (wrap) wrap.style.display = show ? 'block' : 'none';
      });
    };
    trigger?.addEventListener('change', update);
    update();
  }

  if (key === 'payments' || key === 'enrollments') {
    const programField = form.querySelector('[name="programId"]');
    const updateFee = () => {
      const p = state.programs.find((x) => x.id === programField?.value);
      const amountField = form.querySelector('[name="amount"]');
      const feeField = form.querySelector('[name="fee"]');
      if (p?.defaultFee && amountField && !amountField.value) amountField.value = p.defaultFee;
      if (p?.defaultFee && feeField && !feeField.value) feeField.value = p.defaultFee;
    };
    programField?.addEventListener('change', updateFee);
  }
}

window.submitForm = async function () {
  const form = byId('crudForm');
  if (!form.reportValidity()) return;
  const { key, id } = editContext;
  const obj = {};
  schemas[key].fields.forEach((f) => {
    const el = form.elements[f[0]];
    if (!el) return;
    obj[f[0]] = el.value;
  });

  if (key === 'payments') normalizePayment(obj);
  if ((key === 'students' || key === 'teachers') && ['Cuti', 'Keluar'].includes(obj.status) && !obj.statusReason) {
    toast('Alasan cuti/keluar wajib diisi.');
    return;
  }

  const submitBtn = byId('modalFoot')?.querySelector('.primary');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Menyimpan...'; }

  try {
    if (id) {
      await updateRow(key, id, obj);
    } else {
      await insertRow(key, obj);
    }
    window.closeModal();
    renderCrud(key);
    toast('Data berhasil disimpan.');
  } catch (e) {
    console.error(e);
    toast(e.message || 'Gagal menyimpan data.');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Simpan'; }
  }
};

function normalizePayment(p) {
  if (!p.invoiceNo) p.invoiceNo = nextInvoiceNo();
  const due = Math.max(0, num(p.amount) - num(p.discount) - num(p.paid));
  if (due <= 0) p.status = 'Lunas';
  else if (num(p.paid) > 0) p.status = 'Sebagian';
  else if (daysUntil(p.dueDate) < 0) p.status = 'Jatuh Tempo';
  else if (!p.status) p.status = 'Belum Lunas';
}

window.closeModal = function () {
  byId('modalOverlay').classList.remove('show');
  editContext = null;
};

window.confirmDeleteRow = async function (key, id) {
  if (!confirm('Hapus data ini?')) return;
  try {
    await deleteRowInDb(key, id);
    renderCrud(key);
    toast('Data dihapus.');
  } catch (e) {
    console.error(e);
    toast(e.message || 'Gagal menghapus data.');
  }
};
