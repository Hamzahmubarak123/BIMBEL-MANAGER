// ============================================================
// ROUTER
// Navigasi antar "halaman" (section). Aplikasi ini single-page
// tanpa URL routing sungguhan — cukup show/hide <section> dan
// panggil fungsi render yang sesuai, persis pola prototype asli.
// ============================================================
import { byId, safe } from './utils.js';
import { state } from './dataStore.js';
import { PAGES, OWNER_ONLY_PAGES } from './schemas.js';
import { getCurrentPage, setCurrentPage, setSelectedBranch } from './uiState.js';
import { destroyCharts } from './charts.js';

import { renderDashboard } from '../pages/dashboard.js';
import { renderAnalytics } from '../pages/analyticsPage.js';
import { renderCrud } from './crud.js';
import { renderUnpaid } from '../pages/unpaid.js';
import { renderReports } from '../pages/reports.js';
import { renderDocuments } from '../pages/documents.js';
import { renderStaff } from '../pages/staff.js';
import { renderSettings } from '../pages/settings.js';

const SIMPLE_CRUD_PAGES = new Set(['branches', 'students', 'programs', 'enrollments', 'teachers', 'payments', 'incomes', 'expenses']);

export function visiblePages() {
  const role = state.me?.role;
  return PAGES.filter(([key]) => role === 'owner' || !OWNER_ONLY_PAGES.has(key));
}

export function buildNav() {
  byId('nav').innerHTML = visiblePages()
    .map((p) => `<button id="nav_${p[0]}" onclick="showPage('${p[0]}')"><span class="ico">${p[2]}</span><span>${safe(p[1])}</span></button>`)
    .join('');
}

export function renderPage(page) {
  destroyCharts();
  if (page === 'dashboard') return renderDashboard();
  if (page === 'analytics') return renderAnalytics();
  if (page === 'unpaid') return renderUnpaid();
  if (page === 'reports') return renderReports();
  if (page === 'documents') return renderDocuments();
  if (page === 'staff') return renderStaff();
  if (page === 'settings') return renderSettings();
  if (SIMPLE_CRUD_PAGES.has(page)) return renderCrud(page);
  return renderDashboard();
}

window.showPage = function (page) {
  if (OWNER_ONLY_PAGES.has(page) && state.me?.role !== 'owner') page = 'dashboard';
  setCurrentPage(page);
  document.querySelectorAll('.section').forEach((s) => s.classList.remove('active', 'printTarget'));
  byId(page)?.classList.add('active');
  document.querySelectorAll('.nav button').forEach((b) => b.classList.remove('active'));
  byId('nav_' + page)?.classList.add('active');
  const p = PAGES.find((x) => x[0] === page) || PAGES[0];
  byId('pageTitle').textContent = p[1];
  byId('pageSubtitle').textContent = p[3];
  byId('backBtn')?.classList.toggle('show', page !== 'dashboard');
  byId('sidebar')?.classList.remove('open');
  renderPage(page);
};

window.setBranchFilter = function (branchId) {
  setSelectedBranch(branchId || 'all');
  renderPage(getCurrentPage());
};
