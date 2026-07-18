// ============================================================
// THEME
// Menerapkan tema warna (lewat data-theme di <body>) dan memperbarui
// logo + nama lembaga yang tampil di sidebar.
// ============================================================
import { byId } from './utils.js';
import { state } from './dataStore.js';

export function applyTheme(theme) {
  document.body.dataset.theme = theme || 'mauve';
  const logo = byId('sideLogo');
  if (logo) {
    logo.innerHTML = state.settings.logoUrl ? `<img alt="Logo" src="${state.settings.logoUrl}">` : 'BM';
  }
  const inst = byId('sideInstitution');
  if (inst) inst.textContent = state.settings.institutionName || 'Bimbel';
}
