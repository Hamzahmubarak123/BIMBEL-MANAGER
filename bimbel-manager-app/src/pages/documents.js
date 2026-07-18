// ============================================================
// PAGE: PUSAT DOKUMEN
// ============================================================
import { byId, safe, ym, toast } from '../lib/utils.js';
import { state, studentName } from '../lib/dataStore.js';
import { docTypes, buildDocument } from '../lib/docTemplates.js';
import { downloadDocumentPNG, downloadDocumentPDF, printDocument, sendDocumentWA } from '../lib/exportUtils.js';

export const docState = { type: 'invoice', paymentId: '', studentId: '', month: ym() };

export function setDocType(t) {
  docState.type = t;
  renderDocuments();
}
export function previewPaymentDoc(id, type) {
  docState.paymentId = id;
  docState.type = type;
  window.showPage('documents');
}
export function openStudentMovementDoc(id) {
  docState.studentId = id;
  docState.type = 'studentMovement';
  window.showPage('documents');
}

export function renderDocuments() {
  if (!docState.paymentId && state.payments[0]) docState.paymentId = state.payments[0].id;
  if (!docState.studentId && state.students[0]) docState.studentId = state.students[0].id;

  byId('documents').innerHTML = `
    <div class="card solid noPrint">
      <div class="cardHeader"><div><h2>Pusat Dokumen</h2><p>Dokumen dibuat dari template resmi, bukan crop layar aplikasi.</p></div><span class="badge">PNG · PDF · Print</span></div>
      <div class="docControls">
        <div class="field"><label>Jenis Dokumen</label><select id="docType" onchange="docSetField('type', this.value)">${docTypes().map((d) => `<option value="${d[0]}" ${docState.type === d[0] ? 'selected' : ''}>${d[1]}</option>`).join('')}</select></div>
        <div class="field"><label>Invoice/Pembayaran</label><select id="docPayment" onchange="docSetField('paymentId', this.value)">${state.payments.map((p) => `<option value="${p.id}" ${docState.paymentId === p.id ? 'selected' : ''}>${safe(p.invoiceNo)} · ${safe(studentName(p.studentId))}</option>`).join('')}</select></div>
        <div class="field"><label>Siswa</label><select id="docStudent" onchange="docSetField('studentId', this.value)">${state.students.map((s) => `<option value="${s.id}" ${docState.studentId === s.id ? 'selected' : ''}>${safe(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Bulan Laporan</label><input id="docMonth" type="month" value="${docState.month}" onchange="docSetField('month', this.value)"></div>
      </div>
      <div class="actions">
        <button class="btn primary" onclick="downloadDocPNG()">Download PNG</button>
        <button class="btn primary" onclick="downloadDocPDF()">Download PDF</button>
        <button class="btn soft" onclick="printDoc()">Print</button>
        <button class="btn soft waBtn" onclick="sendDocWA()">Kirim WhatsApp</button>
      </div>
    </div>
    <div class="docStage"><div id="documentPreview">${buildDocument(docState)}</div></div>`;
}

window.docSetField = function (field, value) {
  docState[field] = value;
  renderDocuments();
};
window.setDocType = setDocType;
window.previewPaymentDoc = previewPaymentDoc;
window.openStudentMovementDoc = openStudentMovementDoc;
window.downloadDocPNG = () => downloadDocumentPNG(docState.type);
window.downloadDocPDF = () => downloadDocumentPDF(docState.type);
window.printDoc = () => printDocument();
window.sendDocWA = () => {
  const res = sendDocumentWA(docState);
  if (res && !res.ok) toast(res.message);
};
