// ============================================================
// PAGE: DASHBOARD
// ============================================================
import { byId, safe, rupiah, ym, sameMonth, monthLabel, monthRange } from '../lib/utils.js';
import { state, filterBranch, paymentDueAmount } from '../lib/dataStore.js';
import {
  calcStats, retentionRate, businessHealthScore, healthLabel, groupEnrollByProgram,
  reasonCounts, topFrom, totalPaidThisMonth, manualIncomeThisMonth, expenseThisMonth,
  payrollEstimate, activeAtMonth, agingCounts, groupBy, chartDataFrom,
} from '../lib/analytics.js';
import { makeChart } from '../lib/charts.js';
import { getSelectedBranch, renderBranchFilterBar } from '../lib/uiState.js';

export function renderDashboard() {
  const selectedBranch = getSelectedBranch();
  const st = calcStats(ym(), selectedBranch);

  byId('dashboard').innerHTML = `
    ${renderBranchFilterBar(selectedBranch)}
    <div class="hero">
      <div class="card dark">
        <h2 class="heroTitle">Executive Business Snapshot</h2>
        <p class="muted">Pantau pertumbuhan siswa, cashflow, tunggakan, retensi siswa, dan stabilitas guru dari satu dashboard.</p>
        <div class="heroMetric"><div><b>${st.active}</b><span class="subtle">Siswa aktif</span></div><div><b>${rupiah(st.income)}</b><span class="subtle">Pemasukan bulan ini</span></div><div><b>${rupiah(st.net)}</b><span class="subtle">Estimasi bersih</span></div></div>
        <div class="snapshotGrid">
          <div class="miniBox"><b>Siswa Baru</b><strong>${st.newStudents}</strong><span>Tambahan siswa pada bulan berjalan</span></div>
          <div class="miniBox"><b>Belum Bayar</b><strong>${st.unpaid.length}</strong><span>${rupiah(st.unpaid.reduce((s, p) => s + paymentDueAmount(p), 0))} masih terbuka</span></div>
          <div class="miniBox"><b>Beban Gaji</b><strong>${rupiah(st.payroll)}</strong><span>Estimasi biaya guru & pegawai</span></div>
          <div class="miniBox"><b>Retensi</b><strong>${retentionRate(selectedBranch)}%</strong><span>Persentase siswa tetap aktif</span></div>
          <div class="miniBox"><b>Guru Aktif</b><strong>${filterBranch(state.teachers, selectedBranch).filter((t) => t.status === 'Aktif').length}</strong><span>SDM aktif yang sedang berjalan</span></div>
          <div class="miniBox"><b>Cuti/Keluar</b><strong>${st.cuti} / ${st.keluar}</strong><span>Pantau alasan untuk evaluasi</span></div>
        </div>
        <div class="focusList">${renderStrategicFocus(st, selectedBranch)}</div>
      </div>
      <div class="card solid"><div class="cardHeader"><div><h2>SWOT & Arah Tindakan</h2><p>Ringkasan analisis untuk membantu owner mengambil keputusan.</p></div><span class="badge ${st.net >= 0 ? 'ok' : 'danger'}">${st.net >= 0 ? 'Operasi sehat' : 'Perlu perhatian'}</span></div>${renderSWOTAnalysis(st, selectedBranch)}</div>
    </div>
    <div class="grid two" style="margin-bottom:16px">
      <div class="card solid"><div class="cardHeader"><div><h2>Business Health Score</h2><p>Skor ringkas untuk membaca kesehatan operasional bulan ini.</p></div><span class="badge ${businessHealthScore(st, selectedBranch) >= 75 ? 'ok' : businessHealthScore(st, selectedBranch) >= 55 ? 'warn' : 'danger'}">${healthLabel(businessHealthScore(st, selectedBranch))}</span></div>${renderBusinessHealth(st, selectedBranch)}</div>
      <div class="card solid"><div class="cardHeader"><div><h2>Prioritas Minggu Ini</h2><p>Daftar tindakan yang paling berdampak untuk owner/admin.</p></div><span class="badge info">Action board</span></div>${renderPriorityBoard(st, selectedBranch)}</div>
    </div>
    <div class="grid kpi">
      ${kpi('👧', 'Siswa Aktif', st.active, `${st.newStudents} siswa baru bulan ini`)}
      ${kpi('⏸️', 'Cuti / Keluar', `${st.cuti} / ${st.keluar}`, 'Monitor alasan untuk retensi')}
      ${kpi('💰', 'Pemasukan', rupiah(st.income), 'Pembayaran + pemasukan manual')}
      ${kpi('⏰', 'Belum Bayar', st.unpaid.length, `${rupiah(st.unpaid.reduce((s, p) => s + paymentDueAmount(p), 0))} belum tertagih`)}
    </div>
    <div class="grid two">
      <div class="card"><div class="cardHeader"><div><h2>Perkembangan Siswa</h2><p>Aktif, siswa baru, cuti, dan keluar.</p></div><span class="badge muted">6 bulan</span></div><div class="chartBox"><canvas id="chartStudentTrend"></canvas></div></div>
      <div class="card"><div class="cardHeader"><div><h2>Cashflow</h2><p>Pemasukan, pengeluaran, dan estimasi gaji.</p></div></div><div class="chartBox"><canvas id="chartCashflow"></canvas></div></div>
    </div>
    <div class="grid three" style="margin-top:16px">
      <div class="card"><div class="cardHeader"><div><h3>Paket Terpopuler</h3><p>Jenis paket yang paling banyak dipilih.</p></div></div><div class="chartBox small"><canvas id="chartPackage"></canvas></div></div>
      <div class="card"><div class="cardHeader"><div><h3>Alasan Siswa Keluar/Cuti</h3><p>Bahan evaluasi retensi siswa.</p></div></div><div class="chartBox small"><canvas id="chartStudentReasons"></canvas></div></div>
      <div class="card"><div class="cardHeader"><div><h3>Belum Bayar</h3><p>Prioritas tagihan berdasarkan umur tunggakan.</p></div></div><div class="chartBox small"><canvas id="chartAging"></canvas></div></div>
    </div>`;

  setTimeout(() => renderDashboardCharts(selectedBranch), 0);
}

function kpi(icon, label, value, hint) {
  return `<div class="card kpiCard"><div class="kpiIcon">${icon}</div><div class="kpiLabel">${label}</div><div class="kpiValue">${value}</div><div class="kpiHint">${hint}</div></div>`;
}

function renderStrategicFocus(st, selectedBranch) {
  const tips = [];
  const topProgram = topFrom(groupEnrollByProgram(selectedBranch));
  const topArea = topFrom(groupBy(filterBranch(state.students, selectedBranch).filter((s) => s.status !== 'Keluar'), 'area'));
  const topSource = topFrom(groupBy(filterBranch(state.students, selectedBranch), 'source'));
  tips.push(`<div class="focusItem"><b>Fokus 1:</b> ${st.unpaid.length ? `Follow-up ${st.unpaid.length} tagihan terbuka agar cashflow lebih sehat.` : 'Pertahankan disiplin penagihan karena seluruh tagihan relatif aman.'}</div>`);
  tips.push(`<div class="focusItem"><b>Fokus 2:</b> ${topProgram ? `Program ${safe(topProgram[0])} adalah magnet utama. Evaluasi peluang tambah slot, jadwal, atau guru pendamping.` : 'Belum ada program dominan. Kumpulkan data pendaftaran lebih banyak untuk melihat pola demand.'}</div>`);
  tips.push(`<div class="focusItem"><b>Fokus 3:</b> ${topArea ? `Mayoritas siswa berasal dari ${safe(topArea[0])}. Pertahankan promosi lokal dan referral di area ini.` : 'Data daerah siswa belum memadai. Lengkapi alamat/area untuk evaluasi market.'}</div>`);
  if (topSource) tips.push(`<div class="focusItem"><b>Fokus 4:</b> Channel masuk siswa paling efektif saat ini adalah ${safe(topSource[0])}. Ini bisa dijadikan kanal utama promosi berikutnya.</div>`);
  return tips.join('');
}

function renderSWOTAnalysis(st, selectedBranch) {
  const topProgram = topFrom(groupEnrollByProgram(selectedBranch));
  const topSource = topFrom(groupBy(filterBranch(state.students, selectedBranch), 'source'));
  const studentReason = topFrom(reasonCounts('students', selectedBranch));
  const teacherReason = topFrom(reasonCounts('teachers', selectedBranch));

  const strength = [
    `${st.active} siswa aktif sedang berjalan${topProgram ? ` dengan program unggulan ${topProgram[0]}` : ''}.`,
    `${rupiah(st.income)} pemasukan bulan ini menjadi basis evaluasi bisnis.`,
    `${retentionRate(selectedBranch)}% siswa masih aktif, menandakan retensi utama cukup terjaga.`,
  ];
  const weakness = [
    `${st.unpaid.length} invoice belum lunas masih menahan cashflow.`,
    st.net < 0 ? 'Estimasi bersih masih negatif sehingga biaya perlu lebih dikontrol.' : 'Biaya perlu tetap dijaga agar margin tidak tertekan.',
    studentReason ? `Alasan dominan siswa cuti/keluar: ${studentReason[0]}.` : 'Data alasan siswa belum banyak, perlu disiplin pencatatan.',
  ];
  const opportunity = [
    topSource ? `Sumber siswa baru terbesar berasal dari ${topSource[0]}.` : 'Data sumber informasi bisa dipakai untuk menentukan strategi promosi.',
    topProgram ? `Permintaan tertinggi ada pada ${topProgram[0]}, sehingga paket/kelas serupa berpotensi dikembangkan.` : 'Program dengan demand tertinggi akan mudah di-scale setelah data bertambah.',
    'Data usia, area, dan paket dapat dipakai untuk menentukan target pasar dan kampanye promosi.',
  ];
  const threat = [
    (st.keluar || st.cuti) ? `Ada ${st.cuti + st.keluar} siswa yang cuti/keluar dan perlu ditangani agar tidak berlanjut.` : 'Perubahan status siswa masih rendah, tetap perlu dijaga kualitas layanan.',
    teacherReason ? `Pergerakan guru/pegawai didominasi alasan: ${teacherReason[0]}.` : 'Risiko perputaran guru perlu dicatat sejak awal untuk menjaga kontinuitas kelas.',
    'Jika tagihan terlambat dan pengeluaran tinggi berjalan bersamaan, kesehatan operasional bisa terganggu.',
  ];

  return `<div class="swotGrid">
    <div class="swotCard swotStrength"><b>Strength</b><ul>${strength.map((x) => `<li>${safe(x)}</li>`).join('')}</ul></div>
    <div class="swotCard swotWeak"><b>Weakness</b><ul>${weakness.map((x) => `<li>${safe(x)}</li>`).join('')}</ul></div>
    <div class="swotCard swotOpp"><b>Opportunity</b><ul>${opportunity.map((x) => `<li>${safe(x)}</li>`).join('')}</ul></div>
    <div class="swotCard swotThreat"><b>Threat</b><ul>${threat.map((x) => `<li>${safe(x)}</li>`).join('')}</ul></div>
  </div><div class="analysisNote"><b>Catatan Owner:</b> SWOT ini dibentuk otomatis dari data siswa, pembayaran, pengeluaran, dan guru. Semakin lengkap data yang diinput, semakin tajam rekomendasi bisnis yang dihasilkan dashboard.</div>`;
}

function renderBusinessHealth(st, selectedBranch) {
  const score = businessHealthScore(st, selectedBranch);
  const dueTotal = st.unpaid.reduce((s, p) => s + paymentDueAmount(p), 0);
  const payrollRatio = st.income ? Math.round((st.payroll / st.income) * 100) : 0;
  const programCount = Object.keys(groupEnrollByProgram(selectedBranch)).filter(Boolean).length;
  return `<div class="healthLayout">
    <div class="healthRing" style="--score:${score}"><div class="healthInner"><div><strong>${score}</strong><br><span>${healthLabel(score)}</span></div></div></div>
    <div>
      <div class="healthPills">
        <div class="healthPill"><b>Cashflow</b><strong>${st.net >= 0 ? 'Positif' : 'Negatif'}</strong><span class="subtle">${rupiah(st.net)} estimasi bersih</span></div>
        <div class="healthPill"><b>Disiplin bayar</b><strong>${st.unpaid.length} invoice</strong><span class="subtle">${rupiah(dueTotal)} belum tertagih</span></div>
        <div class="healthPill"><b>Retensi siswa</b><strong>${retentionRate(selectedBranch)}%</strong><span class="subtle">${st.cuti + st.keluar} cuti/keluar</span></div>
        <div class="healthPill"><b>Beban SDM</b><strong>${payrollRatio}%</strong><span class="subtle">Dari pemasukan bulan ini</span></div>
      </div>
      <div class="analysisNote"><b>Interpretasi:</b> Skor ini membantu owner membaca risiko utama tanpa membuka semua tabel. Program aktif tercatat ${programCount}, sehingga strategi growth bisa diprioritaskan pada program dengan demand dan revenue tertinggi.</div>
    </div>
  </div>`;
}

function renderPriorityBoard(st, selectedBranch) {
  const rows = [];
  const dueTotal = st.unpaid.reduce((s, p) => s + paymentDueAmount(p), 0);
  const topProgram = topFrom(groupEnrollByProgram(selectedBranch));
  const topReason = topFrom(reasonCounts('students', selectedBranch));
  const teacherRisk = filterBranch(state.teachers, selectedBranch).filter((t) => ['Cuti', 'Keluar', 'Nonaktif'].includes(t.status)).length;

  if (st.unpaid.length) rows.push(['⏰', 'Tagihan belum lunas', `Follow-up ${st.unpaid.length} invoice terbuka senilai ${rupiah(dueTotal)}.`, dueTotal > 500000 ? 'High' : 'Medium']);
  if (st.net < 0) rows.push(['💸', 'Kontrol biaya', `Estimasi bersih ${rupiah(st.net)}. Review pengeluaran dan beban gaji bulan ini.`, 'High']);
  if (topProgram) rows.push(['📚', 'Optimasi program unggulan', `${topProgram[0]} menjadi program paling diminati. Pertimbangkan tambah slot atau paket turunan.`, 'Growth']);
  if (topReason) rows.push(['🧭', 'Evaluasi retensi siswa', `Alasan cuti/keluar terbanyak: ${topReason[0]}. Siapkan solusi layanan atau jadwal.`, 'Medium']);
  if (teacherRisk) rows.push(['👩\u200d🏫', 'Stabilitas guru/pegawai', `${teacherRisk} guru/pegawai berstatus cuti/keluar/nonaktif. Pastikan pengganti dan jadwal tidak terganggu.`, 'Ops']);
  if (!rows.length) rows.push(['✅', 'Operasional aman', 'Belum ada prioritas kritis. Fokus pada promosi, kualitas layanan, dan pembaruan data.', 'Normal']);

  return `<div class="priorityList">${rows.map((r) => `<div class="priorityRow"><div class="priorityIcon">${r[0]}</div><div><b>${safe(r[1])}</b><span>${safe(r[2])}</span></div><span class="badge ${r[3] === 'High' ? 'danger' : r[3] === 'Medium' ? 'warn' : r[3] === 'Growth' ? 'ok' : 'muted'}">${safe(r[3])}</span></div>`).join('')}</div>`;
}

function renderDashboardCharts(selectedBranch) {
  const months = monthRange(6);
  const students = filterBranch(state.students, selectedBranch);
  const enrollments = filterBranch(state.enrollments, selectedBranch);

  makeChart('chartStudentTrend', 'line', {
    labels: months.map(monthLabel),
    datasets: [
      { label: 'Aktif', data: months.map((m) => activeAtMonth(m, selectedBranch)), tension: .42, fill: true, borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,.14)', pointBackgroundColor: '#3B82F6', pointRadius: 3, pointHoverRadius: 5, cubicInterpolationMode: 'monotone' },
      { label: 'Baru', data: months.map((m) => students.filter((s) => sameMonth(s.joinDate, m)).length), tension: .42, fill: true, borderColor: '#FB7185', backgroundColor: 'rgba(251,113,133,.12)', pointBackgroundColor: '#FB7185', pointRadius: 3, pointHoverRadius: 5, cubicInterpolationMode: 'monotone' },
      { label: 'Cuti', data: months.map((m) => students.filter((s) => s.status === 'Cuti' && sameMonth(s.statusDate, m)).length), tension: .42, fill: true, borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,.12)', pointBackgroundColor: '#F59E0B', pointRadius: 3, pointHoverRadius: 5, cubicInterpolationMode: 'monotone' },
      { label: 'Keluar', data: months.map((m) => students.filter((s) => s.status === 'Keluar' && sameMonth(s.statusDate, m)).length), tension: .42, fill: true, borderColor: '#EAB308', backgroundColor: 'rgba(234,179,8,.12)', pointBackgroundColor: '#EAB308', pointRadius: 3, pointHoverRadius: 5, cubicInterpolationMode: 'monotone' },
    ],
  }, { plugins: { filler: { propagate: false } } });

  makeChart('chartCashflow', 'bar', {
    labels: months.map(monthLabel),
    datasets: [
      { type: 'bar', label: 'Pemasukan', data: months.map((m) => totalPaidThisMonth(m, selectedBranch) + manualIncomeThisMonth(m, selectedBranch)), backgroundColor: 'rgba(37,99,235,.78)', borderRadius: 9 },
      { type: 'bar', label: 'Pengeluaran', data: months.map((m) => expenseThisMonth(m, selectedBranch)), backgroundColor: 'rgba(239,68,68,.68)', borderRadius: 9 },
      { type: 'bar', label: 'Estimasi gaji', data: months.map(() => payrollEstimate(selectedBranch)), backgroundColor: 'rgba(168,107,139,.68)', borderRadius: 9 },
      { type: 'line', label: 'Estimasi bersih', data: months.map((m) => (totalPaidThisMonth(m, selectedBranch) + manualIncomeThisMonth(m, selectedBranch)) - expenseThisMonth(m, selectedBranch) - payrollEstimate(selectedBranch)), borderColor: '#D6A84F', backgroundColor: 'rgba(214,168,79,.16)', fill: true, tension: .42, pointRadius: 3, pointHoverRadius: 5, cubicInterpolationMode: 'monotone' },
    ],
  });

  makeChart('chartPackage', 'doughnut', chartDataFrom(groupBy(enrollments, 'packageType'), 'Paket'));
  makeChart('chartStudentReasons', 'bar', chartDataFrom(reasonCounts('students', selectedBranch), 'Jumlah'), { indexAxis: 'y' });
  makeChart('chartAging', 'bar', chartDataFrom(agingCounts(selectedBranch), 'Invoice'));
}
