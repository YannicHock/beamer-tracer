// ============================================================
//  Beamer Tracer – Overlay Toggle Logic + Toolbar Buttons
// ============================================================

import state from '../../core/state.js';
import { render } from '../../render/index.js';

// ── Overlay Toggle (shared by keyboard, context menu, buttons) ──
export function toggleOverlay(key, btnId) {
  state.overlays[key] = !state.overlays[key];
  document.getElementById(btnId).classList.toggle('active');
}

// ── Init Overlay Toolbar Buttons ─────────────────────────────
export function initOverlayButtons() {
  document.getElementById('btn-grid').addEventListener('click', () => {
    toggleOverlay('grid', 'btn-grid'); render();
  });
  document.getElementById('btn-center').addEventListener('click', () => {
    toggleOverlay('center', 'btn-center'); render();
  });
  document.getElementById('btn-thirds').addEventListener('click', () => {
    toggleOverlay('thirds', 'btn-thirds'); render();
  });
  document.getElementById('btn-ruler').addEventListener('click', () => {
    toggleOverlay('ruler', 'btn-ruler'); render();
  });
  document.getElementById('btn-crosshair').addEventListener('click', () => {
    toggleOverlay('crosshair', 'btn-crosshair'); render();
  });
}

