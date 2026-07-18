// ============================================================
// PAGE: ANALISIS BISNIS
// ============================================================
import { byId, safe, rupiah } from '../lib/utils.js';
import { state, filterBranch } from '../lib/dataStore.js';
import {
  calcStats, groupEnrollByProgram, revenueByProgram, ageGroups, reasonCounts, topFrom,
  branchStats, branchComparisonChartData, chartDataFrom, groupBy, groupSum,
} from '../lib/analytics.js';
import { makeChart } from '../lib/charts.js';
import { getSelectedBranch, renderBranchFilterBar } from '../lib/uiState.js';

export function renderAnalytics() {
  const selectedBranch = getSelectedBranch();

  byId('analytics').innerHTML = `
    ${renderBranchFilterBar(selectedBranch)}
    <div class="card solid" style="margin-bottom:16px"><div class="cardHeader"><div><h2>Strategi Bisnis & Market Snapshot</h2><p>Ringkasan pasar, program, dan peluang growth untuk owner/admin.</p></div><span class="badge info">Executive view</span></div>${renderAnalyticsExecutiveBrief(selectedBranch)}</div>
    <div class="grid two">
      <div class="card"><div class="cardHeader"><div><h2>Siswa per Program/Kelas</h2><p>Program dengan jumlah siswa terbanyak.</p></div></div><div class="chartBox"><canvas id="chartProgramStudents"></canvas></div></div>
      <div class="card"><div class="cardHeader"><div><h2>Revenue per Program</h2><p>Program dengan kontribusi pembayaran terbesar.</p></div></div><div class="chartBox"><canvas id="chartRevenueProgram"></canvas></div></div>
    </div>
    <div class="grid three" style="margin-top:16px">
      <div class="card"><div class="cardHeader"><div><h3>Usia Siswa</h3><p>Rentang usia pasar utama.</p></div></div><div class="chartBox small"><canvas id="chartAge"></canvas></div></div>
      <div class="card"><div class="cardHeader"><div><h3>Daerah Tempat Tinggal</h3><p>Area yang menghasilkan siswa terbanyak.</p></div></div><div class="chartBox small"><canvas id="chartArea"></canvas></div></div>
      <div class="card"><div class="cardHeader"><div><h3>Sumber Informasi</h3><p>Channel promosi yang membawa siswa.</p></div></div><div class="chartBox small"><canvas id="chartSource"></canvas></div></div>
    </div>
    <div class="grid two" style="margin-top:16px">
      <div class="card"><div class="cardHeader"><div><h2>Perbandingan Cabang</h2><p>Pemasukan, biaya, estimasi bersih, dan siswa aktif per cabang.</p></div><span class="badge muted">Multi cabang</span></div><div class="chartBox"><canvas id="chartBranchCompare"></canvas></div>${renderBranchSummary()}</div>
      <div class="card"><div class="cardHeader"><div><h2>Komposisi Pengeluaran</h2><p>Kategori biaya terbesar.</p></div></div><div class="chartBox small"><canvas id="chartExpenseCategory"></canvas></div></div>
    </div>
    <div class="grid two" style="margin-top:16px">
      <div class="card"><div class="cardHeader"><div><h2>Guru & Pegawai</h2><p>Status SDM dan alasan keluar/cuti.</p></div></div><div class="grid two"><div class="chartBox small"><canvas id="chartTeacherStatus"></canvas></div><div>${renderTeacherReasonSummary(selectedBranch)}</div></div></div>
    </div>
    <div class="grid two" style="margin-top:16px">
      <div class="card"><div class="cardHeader"><div><h2>Kapasitas Program</h2><p>Sisa slot per program aktif.</p></div></div>${renderCapacityList(selectedBranch)}</div>
      <div class="card"><div class="cardHeader"><div><h2>Evaluasi Retensi</h2><p>Ringkasan alasan siswa dan guru keluar/cuti.</p></div></div>${renderRetentionSummary(selectedBranch)}</div>
    </div>`;

  setTimeout(() => renderAnalyticsCharts(selectedBranch), 0);
}

function renderAnalyticsExecutiveBrief(selectedBranch) {
  const topProgram = topFrom(groupEnrollByProgram(selectedBranch));
  const topRevenue = topFrom(revenueByProgram(selectedBranch));
  const topAge = topFrom(ageGroups(selectedBranch));
  const topArea = topFrom(groupBy(filterBranch(state.students, selectedBranch).filter((s) => s.status !== 'Keluar'), 'area'));
  const topSource = topFrom(groupBy(filterBranch(state.students, selectedBranch), 'source'));
  const st = calcStats();
  return `<div class="ownerBrief">
    <div class="ownerBriefBlock">
      <h3>Ringkasan Strategi Bulan Ini</h3>
      <p>Gunakan data siswa, pembayaran, daerah, paket, dan guru untuk menentukan prioritas promosi dan operasional.</p>
      <ul>
        <li>${topProgram ? `Program dengan demand terbesar adalah <b>${safe(topProgram[0])}</b>.` : 'Demand program belum terlihat jelas, lengkapi data enrollment.'}</li>
        <li>${topRevenue ? `Kontributor revenue terbesar adalah <b>${safe(topRevenue[0])}</b>.` : 'Revenue per program belum cukup terbaca.'}</li>
        <li>${topArea ? `Area siswa paling dominan: <b>${safe(topArea[0])}</b>.` : 'Data daerah siswa perlu dilengkapi untuk strategi promosi lokal.'}</li>
        <li>${st.net < 0 ? 'Prioritas utama: tekan pengeluaran dan percepat penagihan.' : 'Cashflow relatif lebih aman, peluang scale-up dapat dievaluasi.'}</li>
      </ul>
    </div>
    <div class="ownerBriefBlock">
      <h3>Market Snapshot</h3>
      <div class="strategyCards">
        <div class="strategyCard"><b>Usia utama</b><strong>${safe(topAge ? topAge[0] : '-')}</strong><span>${topAge ? topAge[1] + ' siswa' : 'Belum ada data'}</span></div>
        <div class="strategyCard"><b>Sumber siswa</b><strong>${safe(topSource ? topSource[0] : '-')}</strong><span>${topSource ? topSource[1] + ' siswa' : 'Belum ada data'}</span></div>
        <div class="strategyCard"><b>Program demand</b><strong>${safe(topProgram ? topProgram[0] : '-')}</strong><span>${topProgram ? topProgram[1] + ' siswa' : 'Belum ada data'}</span></div>
        <div class="strategyCard"><b>Revenue kuat</b><strong>${safe(topRevenue ? topRevenue[0] : '-')}</strong><span>${topRevenue ? rupiah(topRevenue[1]) : 'Belum ada data'}</span></div>
      </div>
    </div>
  </div>`;
}

function renderBranchSummary() {
  const branches = (state.branches || []).filter((b) => b.status !== 'Nonaktif');
  return `<div class="miniList" style="margin-top:12px">${branches.map((b) => {
    const st = branchStats(b.id);
    return `<div class="miniItem"><div><b>${safe(b.name || 'Cabang')}</b><span>${st.active} siswa aktif · ${st.unpaid.length} belum bayar</span></div><span class="badge ${st.net >= 0 ? 'ok' : 'danger'}">${rupiah(st.net)}</span></div>`;
  }).join('') || '<div class="empty">Belum ada cabang aktif.</div>'}</div>`;
}

function renderTeacherReasonSummary(branchId = 'all') {
  const rs = Object.entries(reasonCounts('teachers', branchId)).sort((a, b) => b[1] - a[1]);
  return rs.length
    ? `<div class="miniList">${rs.map((r) => `<div class="miniItem"><div><b>${safe(r[0])}</b><span>${r[1]} guru/pegawai</span></div></div>`).join('')}</div>`
    : `<div class="empty">Belum ada alasan guru/pegawai keluar/cuti.</div>`;
}

function renderCapacityList(branchId = 'all') {
  const programs = filterBranch(state.programs, branchId);
  const enrollments = filterBranch(state.enrollments, branchId);
  return `<div class="miniList">${programs.filter((p) => p.status === 'Aktif').map((p) => {
    const used = enrollments.filter((e) => e.programId === p.id && e.status === 'Aktif').length;
    const cap = Number(p.capacity) || Math.max(used, 1);
    return `<div class="miniItem"><div style="flex:1"><b>${safe(p.name)}</b><span>${used}/${cap} siswa terisi</span><div class="progress" style="margin-top:8px"><span style="width:${Math.min(100, Math.round((used / cap) * 100))}%"></span></div></div><span class="badge ${used >= cap ? 'warn' : 'ok'}">${used >= cap ? 'Penuh' : 'Ada slot'}</span></div>`;
  }).join('') || '<div class="empty">Belum ada program aktif.</div>'}</div>`;
}

function renderRetentionSummary(branchId = 'all') {
  const sr = Object.entries(reasonCounts('students', branchId)).sort((a, b) => b[1] - a[1]);
  const tr = Object.entries(reasonCounts('teachers', branchId)).sort((a, b) => b[1] - a[1]);
  return `<div class="miniList">
    <div class="miniItem"><div><b>Siswa keluar/cuti</b><span>${sr[0] ? safe(sr[0][0]) + ' menjadi alasan terbanyak (' + sr[0][1] + ')' : 'Belum ada alasan tercatat'}</span></div></div>
    <div class="miniItem"><div><b>Guru/pegawai keluar/cuti</b><span>${tr[0] ? safe(tr[0][0]) + ' menjadi alasan terbanyak (' + tr[0][1] + ')' : 'Belum ada alasan tercatat'}</span></div></div>
    <div class="miniItem"><div><b>Aksi evaluasi</b><span>Gunakan alasan dominan untuk perbaikan jadwal, harga, komunikasi, dan manajemen SDM.</span></div></div>
  </div>`;
}

function renderAnalyticsCharts(selectedBranch) {
  makeChart('chartProgramStudents', 'bar', chartDataFrom(groupEnrollByProgram(selectedBranch), 'Siswa'), { indexAxis: 'y' });
  makeChart('chartRevenueProgram', 'bar', chartDataFrom(revenueByProgram(selectedBranch), 'Revenue'), { indexAxis: 'y' });
  makeChart('chartAge', 'bar', chartDataFrom(ageGroups(selectedBranch), 'Siswa'));
  makeChart('chartArea', 'bar', chartDataFrom(groupBy(filterBranch(state.students, selectedBranch).filter((s) => s.status !== 'Keluar'), 'area'), 'Siswa'), { indexAxis: 'y' });
  makeChart('chartSource', 'doughnut', chartDataFrom(groupBy(filterBranch(state.students, selectedBranch), 'source'), 'Siswa'));
  makeChart('chartBranchCompare', 'bar', branchComparisonChartData());
  makeChart('chartExpenseCategory', 'doughnut', chartDataFrom(groupSum(filterBranch(state.expenses, selectedBranch), 'category', 'amount'), 'Nominal'));
  makeChart('chartTeacherStatus', 'doughnut', chartDataFrom(groupBy(filterBranch(state.teachers, selectedBranch), 'status'), 'Guru/Pegawai'));
}
