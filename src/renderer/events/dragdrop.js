// ============================================================
//  Beamer Tracer – Drag & Drop / Paste / Load Image
// ============================================================

import state from '../core/state.js';
import { canvasImage } from '../core/dom.js';
import { render } from '../render/index.js';
import { saveState } from '../services/persistence.js';

export function loadImageFromDataURL(dataUrl) {
  state.imgSrc = dataUrl;
  state.img = new Image();
  state.img.onload = () => {
    state.zoom = 1.0;
    state.panX = (canvasImage.width  - state.img.width)  / 2;
    state.panY = (canvasImage.height - state.img.height) / 2;
    render();
    saveState();
  };
  state.img.src = state.imgSrc;
}

export function loadImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => loadImageFromDataURL(e.target.result);
  reader.readAsDataURL(file);
}

export function initDragDrop() {
  // Drag & Drop
  document.body.addEventListener('dragover', (e) => e.preventDefault());
  document.body.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImageFile(file);
  });

  // Paste from clipboard (Ctrl+V)
  document.addEventListener('paste', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const items = (e.clipboardData || {}).items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) loadImageFile(file);
        return;
      }
    }
  });

  // Load button – prefer native Electron dialog, fallback to hidden <input>
  document.getElementById('btn-load').addEventListener('click', async () => {
    if (window.electronAPI?.openFile) {
      const dataUrl = await window.electronAPI.openFile();
      if (dataUrl) loadImageFromDataURL(dataUrl);
      return;
    }
    // Fallback for non-Electron environments
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => { if (input.files[0]) loadImageFile(input.files[0]); };
    input.click();
  });
}

