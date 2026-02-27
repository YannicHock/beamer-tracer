// ============================================================
//  Beamer Tracer – Fullscreen Management
// ============================================================

import state from '../../core/state.js';
import { toolbar, fullscreenTrigger } from '../../core/dom.js';
import { resizeCanvases } from '../../services/canvas.js';

export async function toggleFullscreen() {
  if (window.electronAPI?.toggleFullscreen) {
    const newState = await window.electronAPI.toggleFullscreen();
    applyFullscreenUI(newState);
  }
}

export function applyFullscreenUI(fs) {
  state.isFullscreen = fs;
  if (fs) {
    document.body.classList.add('fullscreen');
  } else {
    document.body.classList.remove('fullscreen');
    toolbar.classList.remove('toolbar-visible');
  }
  setTimeout(resizeCanvases, 50);
}

export function initFullscreen() {
  document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

  fullscreenTrigger.addEventListener('mouseenter', () => {
    if (!state.isFullscreen) return;
    toolbar.classList.add('toolbar-visible');
    clearTimeout(state.fullscreenToolbarTimeout);
  });

  toolbar.addEventListener('mouseenter', () => {
    if (!state.isFullscreen) return;
    clearTimeout(state.fullscreenToolbarTimeout);
  });

  toolbar.addEventListener('mouseleave', () => {
    if (!state.isFullscreen) return;
    state.fullscreenToolbarTimeout = setTimeout(() => {
      toolbar.classList.remove('toolbar-visible');
    }, 400);
  });

  if (window.electronAPI?.onFullscreenChanged) {
    window.electronAPI.onFullscreenChanged((fs) => {
      applyFullscreenUI(fs);
    });
  }

  // Sync fullscreen state on startup (e.g. if window was reopened in fullscreen)
  if (window.electronAPI?.getFullscreen) {
    window.electronAPI.getFullscreen().then((fs) => {
      if (fs) applyFullscreenUI(fs);
    });
  }
}

