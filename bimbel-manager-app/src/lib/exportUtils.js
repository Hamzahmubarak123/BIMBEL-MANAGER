// ============================================================
// EXPORT UTILS
// Export dokumen ke PNG/PDF/Print, backup/restore data JSON manual
// (cadangan tambahan di luar Supabase), dan link WhatsApp semi-otomatis
// (app siapkan pesan, admin/owner klik kirim sendiri - hindari biaya
// WhatsApp Business API, sama seperti LesKu).
// ============================================================
import { byId, downloadBlob, waLink, rupiah, fmtDate } from './utils.js';

let html2canvasRef = null;
async function ensureHtml2Canvas() {
  if (!html2canvasRef) html2canvasRef = (await import('html2canvas')).default;
  return html2canvasRef;
}
let jsPDFRef = null;
async function ensureJsPDF() {
  if (!jsPDFRef) jsPDFRef = (await import('jspdf')).jsPDF;
  return jsPDFRef;
}
import { state, getStudent, programName, paymentDueAmount, paymentFinalAmount } from './dataStore.js';

export function sendInvoiceWA(paymentId) {
  const p = state.payments.find((x) => x.id === paymentId);
  if (!p) return;
  const s = getStudent(p.studentId);
  const msg = `Assalamu'alaikum Bapak/Ibu ${s.parentName || ''}, berikut invoice ${p.invoiceNo} untuk ${s.name}.\nProgram: ${programName(p.programId)}\nPeriode: ${p.period}\nTagihan: ${rupiah(paymentFinalAmount(p))}\nTerbayar: ${rupiah(p.paid)}\nSisa: ${rupiah(paymentDueAmount(p))}\nStatus: ${p.status}\n\n${state.settings.waFooter || ''}`;
  window.open(waLink(s.parentPhone, msg), '_blank');
}

export function sendReminderWA(paymentId) {
  const p = state.payments.find((x) => x.id === paymentId);
  if (!p) return;
  const s = getStudent(p.studentId);
  const msg = `Assalamu'alaikum Bapak/Ibu ${s.parentName || ''}, kami ingin mengingatkan pembayaran bimbel ${s.name} periode ${p.period}.\nSisa tagihan: ${rupiah(paymentDueAmount(p))}\nJatuh tempo: ${fmtDate(p.dueDate)}\nMohon konfirmasinya, terima kasih.\n\n${state.settings.waFooter || ''}`;
  window.open(waLink(s.parentPhone, msg), '_blank');
}

export function sendDocumentWA(docState) {
  const p = state.payments.find((x) => x.id === docState.paymentId);
  const s = getStudent((p || {}).studentId || docState.studentId);
  if (!s.parentPhone) return { ok: false, message: 'Nomor WhatsApp orang tua belum tersedia.' };
  if (docState.type === 'invoice' || docState.type === 'receipt') { sendInvoiceWA(p.id); return { ok: true }; }
  const msg = `Assalamu'alaikum Bapak/Ibu ${s.parentName || ''}, berikut informasi administrasi dari ${state.settings.institutionName}. Silakan cek dokumen/laporan yang kami kirimkan.\n\n${state.settings.waFooter || ''}`;
  window.open(waLink(s.parentPhone, msg), '_blank');
  return { ok: true };
}

function fileBase(type) {
  return `bimbel-manager-${type}-${Date.now()}`;
}

export async function downloadDocumentPNG(docType) {
  const el = byId('docSheet');
  if (!el) return;
  const html2canvas = await ensureHtml2Canvas();
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
  canvas.toBlob((b) => downloadBlob(b, fileBase(docType) + '.png', 'image/png'));
}

export async function downloadDocumentPDF(docType) {
  const el = byId('docSheet');
  if (!el) return;
  const html2canvas = await ensureHtml2Canvas();
  const jsPDF = await ensureJsPDF();
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
  const img = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const w = 210;
  const h = (canvas.height * w) / canvas.width;
  pdf.addImage(img, 'PNG', 0, 0, w, Math.min(h, 297));
  if (h > 297) {
    let y = 297;
    while (y < h) {
      pdf.addPage();
      pdf.addImage(img, 'PNG', 0, -y, w, h);
      y += 297;
    }
  }
  pdf.save(fileBase(docType) + '.pdf');
}

export function printDocument() {
  const html = byId('docSheet')?.outerHTML || '';
  const win = window.open('', '_blank');
  const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map((el) => el.outerHTML).join('');
  win.document.write(`<html><head><title>Print</title>${styleTags}<style>body{background:white}.docSheet{box-shadow:none;border:0;border-radius:0;margin:0 auto}.docStage{background:white}</style></head><body>${html}</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

// ---------- Backup & Restore JSON (cadangan tambahan di luar Supabase) ----------
export function backupData() {
  const snapshot = {
    exportedAt: new Date().toISOString(),
    branches: state.branches, students: state.students, programs: state.programs,
    enrollments: state.enrollments, teachers: state.teachers, payments: state.payments,
    incomes: state.incomes, expenses: state.expenses, settings: state.settings,
  };
  downloadBlob(JSON.stringify(snapshot, null, 2), 'bimbel-manager-backup.json', 'application/json');
}

/**
 * Restore HANYA membaca isi file untuk ditampilkan/divalidasi di UI (pages/settings.js).
 * Menulis ulang ke Supabase secara massal sengaja tidak dilakukan otomatis di sini
 * supaya owner tidak tidak sengaja menimpa data hidup — lihat catatan di pages/settings.js.
 */
export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onload = () => {
      try { resolve(JSON.parse(rd.result)); }
      catch (e) { reject(new Error('File backup tidak valid.')); }
    };
    rd.onerror = () => reject(new Error('Gagal membaca file.'));
    rd.readAsText(file);
  });
}

// Didaftarkan ke window karena dipanggil lewat onclick inline dari
// schemas.js (tombol "WA" di baris pembayaran) dan pages/unpaid.js.
window.sendInvoiceWA = sendInvoiceWA;
window.sendReminderWA = sendReminderWA;
