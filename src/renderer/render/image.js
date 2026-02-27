// ============================================================
//  Beamer Tracer – Image Rendering
// ============================================================

import state from '../core/state.js';
import { canvasImage, ctxImg, zoomDisplay } from '../core/dom.js';

export function renderImage() {
  const w = canvasImage.width;
  const h = canvasImage.height;
  ctxImg.clearRect(0, 0, w, h);
  if (!state.img) return;

  ctxImg.filter = `contrast(${state.contrast}%) brightness(${state.brightness}%)`;

  ctxImg.save();
  ctxImg.translate(state.panX, state.panY);
  ctxImg.scale(state.zoom, state.zoom);
  ctxImg.drawImage(state.img, 0, 0);
  ctxImg.restore();

  ctxImg.filter = 'none';

  const zoomPct = Math.round(state.zoom * 100);
  if (state.calibratedZoom !== null && Math.abs(state.zoom - state.calibratedZoom) < 0.0001) {
    zoomDisplay.textContent = `${zoomPct}% 🎯`;
  } else {
    zoomDisplay.textContent = `${zoomPct}%`;
  }
}

