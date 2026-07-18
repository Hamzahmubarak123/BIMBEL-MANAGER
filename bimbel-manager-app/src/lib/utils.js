// ============================================================
// UTILS
// Fungsi kecil yang dipakai di banyak tempat: format tanggal/uang,
// escape XSS, konversi nama kolom, dan helper grouping data.
// ============================================================

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n || 0));

export const fmtDate = (s) => {
  if (!s) return '-';
  const d = new Date(String(s).slice(0, 10) + 'T00:00:00');
  return isNaN(d) ? String(s) : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const ym = () => todayISO().slice(0, 7);

export const byId = (id) => document.getElementById(id);

// Selalu pakai safe() sebelum menaruh data user ke dalam innerHTML.
// Ini satu-satunya lapisan pertahanan XSS di sisi tampilan.
export const safe = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

export const cleanPhone = (p) => String(p || '').replace(/[^0-9]/g, '').replace(/^0/, '62');

export const waLink = (phone, msg) => `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(msg)}`;

export const num = (v) => Number(String(v ?? 0).replace(/[^0-9.-]/g, '')) || 0;

export function monthLabel(m) {
  if (!m) return monthLabel(ym());
  const d = new Date(m + '-01T00:00:00');
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export function monthRange(n = 6) {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setMonth(d.getMonth() - i);
    out.push(x.toISOString().slice(0, 7));
  }
  return out;
}

export function sameMonth(date, m) {
  return String(date || '').slice(0, 7) === m;
}

export function daysUntil(d) {
  if (!d) return 999;
  const a = new Date(todayISO() + 'T00:00:00');
  const b = new Date(String(d).slice(0, 10) + 'T00:00:00');
  return Math.ceil((b - a) / 86400000);
}

export function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob + 'T00:00:00');
  if (isNaN(d)) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

let toastTimer = null;
export function toast(msg) {
  const t = byId('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

export function downloadBlob(blob, name, type) {
  const b = blob instanceof Blob ? blob : new Blob([blob], { type: type || 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1200);
}

// ---------- konversi nama kolom: JS pakai camelCase, Supabase pakai snake_case ----------
export function toSnakeKey(str) {
  return str.replace(/[A-Z]/g, (l) => '_' + l.toLowerCase());
}
export function toCamelKey(str) {
  return str.replace(/_([a-z0-9])/g, (_, l) => l.toUpperCase());
}
export function keysToSnake(obj) {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => { out[toSnakeKey(k)] = v; });
  return out;
}
export function keysToCamel(obj) {
  if (!obj) return obj;
  const out = {};
  Object.entries(obj).forEach(([k, v]) => { out[toCamelKey(k)] = v; });
  return out;
}

// ---------- helper agregasi (dipakai analytics.js & chart) ----------
export function groupBy(arr, key) {
  return arr.reduce((o, x) => { const k = x[key] || 'Tidak diisi'; o[k] = (o[k] || 0) + 1; return o; }, {});
}
export function groupSum(arr, key, val) {
  return arr.reduce((o, x) => { const k = x[key] || 'Tidak diisi'; o[k] = (o[k] || 0) + num(x[val]); return o; }, {});
}
export function topFrom(obj) {
  const e = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);
  return e[0] || null;
}
