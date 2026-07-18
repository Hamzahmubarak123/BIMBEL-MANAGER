// ============================================================
// ANALYTICS
// Semua kalkulasi murni (tidak menyentuh DOM) untuk dashboard,
// halaman Analisis Bisnis, dan laporan. Dipisah dari kode render
// supaya gampang ditest/diperbaiki tanpa menyentuh tampilan.
// ============================================================
import { state, filterBranch, programName, paymentDueAmount } from './dataStore.js';
import { num, sameMonth, ym, todayISO, daysUntil, ageFromDob, groupBy, groupSum, topFrom } from './utils.js';

export function totalPaidThisMonth(month = ym(), branchId = 'all') {
  return filterBranch(state.payments, branchId)
    .filter((p) => sameMonth(p.date, month))
    .reduce((s, p) => s + num(p.paid), 0);
}
export function manualIncomeThisMonth(month = ym(), branchId = 'all') {
  return filterBranch(state.incomes, branchId).filter((i) => sameMonth(i.date, month)).reduce((s, i) => s + num(i.amount), 0);
}
export function expenseThisMonth(month = ym(), branchId = 'all') {
  return filterBranch(state.expenses, branchId).filter((e) => sameMonth(e.date, month)).reduce((s, e) => s + num(e.amount), 0);
}
export function payrollEstimate(branchId = 'all') {
  return filterBranch(state.teachers, branchId).filter((t) => t.status === 'Aktif').reduce((s, t) => s + num(t.salaryAmount), 0);
}
export function unpaidPayments(branchId = 'all') {
  return filterBranch(state.payments, branchId).filter((p) => paymentDueAmount(p) > 0 && p.status !== 'Lunas');
}
export function retentionRate(branchId = 'all') {
  const students = filterBranch(state.students, branchId);
  const total = students.length || 0;
  if (!total) return 0;
  return Math.round((students.filter((s) => s.status === 'Aktif' || s.status === 'Baru Daftar').length / total) * 100);
}
export function activeAtMonth(m, branchId = 'all') {
  const end = new Date(m + '-28T00:00:00');
  return filterBranch(state.students, branchId).filter((s) => {
    const join = new Date((s.joinDate || todayISO()) + 'T00:00:00');
    const out = s.status === 'Keluar' && s.statusDate ? new Date(s.statusDate + 'T00:00:00') : null;
    return join <= end && (!out || out > end);
  }).length;
}

export function calcStats(month = ym(), branchId = 'all') {
  const students = filterBranch(state.students, branchId);
  const active = students.filter((s) => s.status === 'Aktif' || s.status === 'Baru Daftar').length;
  const newStudents = students.filter((s) => sameMonth(s.joinDate, month)).length;
  const cuti = students.filter((s) => s.status === 'Cuti').length;
  const keluar = students.filter((s) => s.status === 'Keluar').length;
  const income = totalPaidThisMonth(month, branchId) + manualIncomeThisMonth(month, branchId);
  const expense = expenseThisMonth(month, branchId);
  const payroll = payrollEstimate(branchId);
  const net = income - expense - payroll;
  const unpaid = unpaidPayments(branchId);
  return { active, newStudents, cuti, keluar, income, expense, payroll, net, unpaid };
}

export function branchStats(branchId, month = ym()) {
  return calcStats(month, branchId);
}

export function groupEnrollByProgram(branchId = 'all') {
  const o = {};
  filterBranch(state.enrollments, branchId).filter((e) => e.status !== 'Berhenti').forEach((e) => {
    const k = programName(e.programId);
    o[k] = (o[k] || 0) + 1;
  });
  return o;
}
export function revenueByProgram(branchId = 'all') {
  const o = {};
  filterBranch(state.payments, branchId).forEach((p) => {
    const k = programName(p.programId);
    o[k] = (o[k] || 0) + num(p.paid);
  });
  return o;
}
export function ageGroups(branchId = 'all') {
  const o = { '4–5 tahun': 0, '6–7 tahun': 0, '8–9 tahun': 0, '10+ tahun': 0, 'Tidak diisi': 0 };
  filterBranch(state.students, branchId).forEach((s) => {
    const a = ageFromDob(s.dob);
    if (a == null) o['Tidak diisi']++;
    else if (a <= 5) o['4–5 tahun']++;
    else if (a <= 7) o['6–7 tahun']++;
    else if (a <= 9) o['8–9 tahun']++;
    else o['10+ tahun']++;
  });
  return o;
}
export function reasonCounts(type, branchId = 'all') {
  const arr = filterBranch(type === 'teachers' ? state.teachers : state.students, branchId);
  return arr
    .filter((x) => ['Cuti', 'Keluar', 'Nonaktif'].includes(x.status) && x.statusReason)
    .reduce((o, x) => { o[x.statusReason] = (o[x.statusReason] || 0) + 1; return o; }, {});
}
export function agingCounts(branchId = 'all') {
  const o = { 'Belum jatuh tempo': 0, 'Telat 1–7 hari': 0, 'Telat 8–30 hari': 0, 'Telat >30 hari': 0 };
  unpaidPayments(branchId).forEach((p) => {
    const d = daysUntil(p.dueDate);
    if (d >= 0) o['Belum jatuh tempo']++;
    else if (d >= -7) o['Telat 1–7 hari']++;
    else if (d >= -30) o['Telat 8–30 hari']++;
    else o['Telat >30 hari']++;
  });
  return o;
}
export function agingLabel(p) {
  const d = daysUntil(p.dueDate);
  if (d >= 0) return `Jatuh tempo ${d} hari lagi`;
  if (d >= -7) return 'Telat 1–7 hari';
  if (d >= -30) return 'Telat 8–30 hari';
  return 'Telat >30 hari';
}

export function businessHealthScore(st, selectedBranch = 'all') {
  let score = 100;
  const dueTotal = st.unpaid.reduce((s, p) => s + paymentDueAmount(p), 0);
  const retention = retentionRate(selectedBranch);
  const payrollRatio = st.income ? st.payroll / st.income : 0;
  if (st.net < 0) score -= 28;
  if (dueTotal > 0) score -= Math.min(24, Math.ceil(dueTotal / 100000) * 3);
  if (st.unpaid.length) score -= Math.min(18, st.unpaid.length * 5);
  if (retention < 85) score -= 14;
  if (payrollRatio > 0.45) score -= 12;
  if (st.cuti + st.keluar > 0) score -= Math.min(10, (st.cuti + st.keluar) * 4);
  return Math.max(0, Math.min(100, score));
}
export function healthLabel(score) {
  return score >= 80 ? 'Sangat baik' : score >= 65 ? 'Stabil' : score >= 50 ? 'Perlu dijaga' : 'Butuh tindakan';
}

// ---------- data untuk Chart.js ----------
export function chartDataFrom(obj, label) {
  const entries = Object.entries(obj || {}).filter(([k, v]) => k && v !== 0).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return { labels: entries.map((e) => e[0]), datasets: [{ label, data: entries.map((e) => e[1]), borderWidth: 2 }] };
}
export function branchComparisonChartData() {
  const branches = (state.branches || []).filter((b) => b.status !== 'Nonaktif');
  return {
    labels: branches.map((b) => b.name || 'Cabang'),
    datasets: [
      { label: 'Pemasukan', data: branches.map((b) => branchStats(b.id).income), backgroundColor: 'rgba(37,99,235,.76)', borderRadius: 8 },
      { label: 'Pengeluaran + Gaji', data: branches.map((b) => branchStats(b.id).expense + branchStats(b.id).payroll), backgroundColor: 'rgba(239,68,68,.64)', borderRadius: 8 },
      { type: 'line', label: 'Estimasi Bersih', data: branches.map((b) => branchStats(b.id).net), borderColor: '#D6A84F', backgroundColor: 'rgba(214,168,79,.16)', fill: true, tension: .35, pointRadius: 4 },
    ],
  };
}

export { groupBy, groupSum, topFrom };
