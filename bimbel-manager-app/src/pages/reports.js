// ============================================================
// PAGE: LAPORAN OWNER
// ============================================================
import { byId, rupiah, ym, monthLabel } from '../lib/utils.js';
import { calcStats, reasonCounts, topFrom } from '../lib/analytics.js';

function kpi(icon, label, value, hint) {
  return `<div class="card kpiCard"><div class="kpiIcon">${icon}</div><div class="kpiLabel">${label}</div><div class="kpiValue">${value}</div><div class="kpiHint">${hint}</div></div>`;
}

export function renderReports() {
  const m = ym();
  const st = calcStats(m);
  byId('reports').innerHTML = `
    <div class="grid kpi">
      ${kpi('📌', 'Siswa Baru', st.newStudents, monthLabel(m))}
      ${kpi('⏸️', 'Siswa Cuti', st.cuti, 'Pantau potensi kembali')}
      ${kpi('🚪', 'Siswa Keluar', st.keluar, 'Evaluasi alasan')}
      ${kpi('📉', 'Estimasi Bersih', rupiah(st.net), 'Income - expense - payroll')}
    </div>
    <div class="grid two">
      <div class="card"><div class="cardHeader"><div><h2>Laporan Bulanan Owner</h2><p>Ringkasan siap presentasi untuk evaluasi bisnis.</p></div><button class="btn primary" onclick="showPage('documents'); setDocType('ownerReport')">Buka Dokumen</button></div>${renderOwnerReportSummary(m)}</div>
      <div class="card"><div class="cardHeader"><div><h2>Retensi Siswa & Guru</h2><p>Alasan keluar/cuti sebagai bahan evaluasi.</p></div></div>${renderRetentionMini()}</div>
    </div>`;
}

function renderOwnerReportSummary(m) {
  const st = calcStats(m);
  const reasons = reasonCounts('students');
  const teacherReasons = reasonCounts('teachers');
  return `<div class="miniList">
    <div class="miniItem"><div><b>Keuangan bulan ini</b><span>Pemasukan ${rupiah(st.income)} · Pengeluaran ${rupiah(st.expense)} · Estimasi gaji ${rupiah(st.payroll)}</span></div></div>
    <div class="miniItem"><div><b>Siswa</b><span>Aktif ${st.active} · Baru ${st.newStudents} · Cuti ${st.cuti} · Keluar ${st.keluar}</span></div></div>
    <div class="miniItem"><div><b>Alasan dominan siswa</b><span>${topFrom(reasons)?.join(' · ') || 'Belum ada data alasan'}</span></div></div>
    <div class="miniItem"><div><b>Alasan dominan guru/pegawai</b><span>${topFrom(teacherReasons)?.join(' · ') || 'Belum ada data alasan'}</span></div></div>
  </div>`;
}

function renderRetentionMini() {
  const sr = Object.entries(reasonCounts('students')).sort((a, b) => b[1] - a[1]);
  const tr = Object.entries(reasonCounts('teachers')).sort((a, b) => b[1] - a[1]);
  return `<div class="miniList">
    <div class="miniItem"><div><b>Siswa keluar/cuti</b><span>${sr[0] ? sr[0][0] + ' menjadi alasan terbanyak (' + sr[0][1] + ')' : 'Belum ada alasan tercatat'}</span></div></div>
    <div class="miniItem"><div><b>Guru/pegawai keluar/cuti</b><span>${tr[0] ? tr[0][0] + ' menjadi alasan terbanyak (' + tr[0][1] + ')' : 'Belum ada alasan tercatat'}</span></div></div>
  </div>`;
}
