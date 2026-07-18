// ============================================================
// PAGE: BELUM BAYAR
// ============================================================
import { byId, safe, rupiah, fmtDate, daysUntil } from '../lib/utils.js';
import { getStudent, programName, paymentDueAmount } from '../lib/dataStore.js';
import { unpaidPayments, agingLabel } from '../lib/analytics.js';

function kpi(icon, label, value, hint) {
  return `<div class="card kpiCard"><div class="kpiIcon">${icon}</div><div class="kpiLabel">${label}</div><div class="kpiValue">${value}</div><div class="kpiHint">${hint}</div></div>`;
}

export function renderUnpaid() {
  const rows = unpaidPayments().sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));

  byId('unpaid').innerHTML = `
    <div class="grid kpi">
      ${kpi('⏰', 'Invoice Belum Lunas', rows.length, 'Prioritas penagihan')}
      ${kpi('💸', 'Total Tunggakan', rupiah(rows.reduce((s, p) => s + paymentDueAmount(p), 0)), 'Nominal belum tertagih')}
      ${kpi('🔥', 'Lewat Jatuh Tempo', rows.filter((p) => daysUntil(p.dueDate) < 0).length, 'Perlu reminder')}
      ${kpi('📱', 'Siap WhatsApp', rows.filter((p) => getStudent(p.studentId).parentPhone).length, 'Klik reminder')}
    </div>
    <div class="card solid">
      <div class="cardHeader"><div><h2>Siswa Belum Bayar</h2><p>Tagihan yang perlu ditindaklanjuti admin.</p></div><button class="btn primary" onclick="showPage('payments')">Kelola Pembayaran</button></div>
      <div class="tableWrap">
        <table>
          <thead><tr><th>Siswa</th><th>Orang Tua</th><th>Program</th><th>Periode</th><th>Nominal</th><th>Terbayar</th><th>Sisa</th><th>Jatuh Tempo</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>${rows.map((p) => {
            const s = getStudent(p.studentId);
            return `<tr><td><b>${safe(s.name)}</b><div class="subtle">${safe(s.area || '-')}</div></td><td>${safe(s.parentName || '-')}<div class="subtle">${safe(s.parentPhone || '')}</div></td><td>${safe(programName(p.programId))}</td><td>${safe(p.period)}</td><td>${rupiah(p.amount)}</td><td>${rupiah(p.paid)}</td><td><b>${rupiah(paymentDueAmount(p))}</b></td><td>${fmtDate(p.dueDate)}<div class="subtle">${agingLabel(p)}</div></td><td><span class="badge ${p.status === 'Jatuh Tempo' ? 'danger' : p.status === 'Sebagian' ? 'warn' : 'muted'}">${safe(p.status || '-')}</span></td><td><div class="tdActions"><button class="btn small waBtn" onclick="sendReminderWA('${p.id}')">WA Reminder</button><button class="btn small" onclick="previewPaymentDoc('${p.id}','invoice')">Invoice</button></div></td></tr>`;
          }).join('') || `<tr><td colspan="10"><div class="empty">Tidak ada siswa belum bayar.</div></td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
}
