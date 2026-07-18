// ============================================================
// CHARTS
// Wrapper kecil di atas Chart.js. Chart.js sengaja di-lazy-load
// (dynamic import) karena ukurannya lumayan besar dan cuma dipakai
// di halaman Dashboard & Analisis Bisnis — supaya halaman lain
// (termasuk layar login) tetap ringan saat pertama dibuka.
//
// Setiap kali pindah halaman, panggil destroyCharts() dulu supaya
// tidak ada chart lama yang menempel di canvas yang sudah tidak
// ada di DOM (memory leak).
// ============================================================
import { byId } from './utils.js';

let ChartRef = null;
let charts = [];

async function ensureChartJs() {
  if (ChartRef) return ChartRef;
  const { Chart, registerables } = await import('chart.js');
  Chart.register(...registerables);
  ChartRef = Chart;
  return ChartRef;
}

export function destroyCharts() {
  charts.forEach((c) => { try { c.destroy(); } catch (e) { /* noop */ } });
  charts = [];
}

export async function makeChart(id, type, data, options = {}) {
  const el = byId(id);
  if (!el) return;
  const Chart = await ensureChartJs();
  // Section bisa saja sudah berpindah selagi Chart.js dimuat — cek lagi elemennya masih ada.
  if (!byId(id)) return;
  charts.push(new Chart(el, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: type === 'doughnut' || type === 'pie' ? {} : {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,.22)' } },
      },
      ...options,
    },
  }));
}
