// ============================================================
//  Beamer Tracer – Context Menu
// ============================================================

import state from '../../core/state.js';
import { canvasImage, viewport, contextMenu } from '../../core/dom.js';
import { render } from '../../render/index.js';
import { saveState } from '../../services/persistence.js';
import { toggleOverlay } from '../overlays/overlays.js';
import { startCalibration } from '../calibration/calibration.js';

function updateContextMenuChecks() {
  const checks = {
    grid:   state.overlays.grid,
    center: state.overlays.center,
    thirds: state.overlays.thirds,
    ruler:  state.overlays.ruler,
  };
  for (const [key, active] of Object.entries(checks)) {
    const el = document.getElementById(`ctx-check-${key}`);
    if (el) el.classList.toggle('active', active);
  }
}

function showContextMenu(x, y) {
  updateContextMenuChecks();
  contextMenu.classList.remove('hidden');

  const menuW = contextMenu.offsetWidth;
  const menuH = contextMenu.offsetHeight;
  const winW  = window.innerWidth;
  const winH  = window.innerHeight;

  if (x + menuW > winW) x = winW - menuW - 4;
  if (y + menuH > winH) y = winH - menuH - 4;
  if (x < 0) x = 4;
  if (y < 0) y = 4;

  contextMenu.style.left = `${x}px`;
  contextMenu.style.top  = `${y}px`;
}

function hideContextMenu() {
  contextMenu.classList.add('hidden');
}

export function initContextMenu() {
  // Right-click → show context menu
  viewport.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY);
  });

  // Menu item click
  contextMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.context-menu-item');
    if (!item) return;

    const action = item.dataset.action;
    hideContextMenu();

    switch (action) {
      case 'load':
        document.getElementById('btn-load').click();
        break;
      case 'grid':
        toggleOverlay('grid', 'btn-grid');
        render();
        break;
      case 'center':
        toggleOverlay('center', 'btn-center');
        render();
        break;
      case 'thirds':
        toggleOverlay('thirds', 'btn-thirds');
        render();
        break;
      case 'ruler':
        toggleOverlay('ruler', 'btn-ruler');
        render();
        break;
      case 'reset':
        if (state.img) {
          state.zoom = 1.0;
          state.panX = (canvasImage.width  - state.img.width)  / 2;
          state.panY = (canvasImage.height - state.img.height) / 2;
          render();
          saveState();
        }
        break;
      case 'calibrate':
        startCalibration();
        break;
      case 'help':
        document.getElementById('help-overlay').classList.toggle('hidden');
        break;
    }
  });

  // Click elsewhere → close menu
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      hideContextMenu();
    }
  });

  // ESC → close menu (capture phase)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !contextMenu.classList.contains('hidden')) {
      hideContextMenu();
      e.stopImmediatePropagation();
    }
  }, true);
}

