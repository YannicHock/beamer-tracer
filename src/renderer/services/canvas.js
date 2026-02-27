// ============================================================
//  Beamer Tracer – Canvas Resize
// ============================================================

import { canvasImage, canvasOverlay, viewport } from '../core/dom.js';
import { render } from '../render/index.js';

export function resizeCanvases() {
  canvasImage.width    = viewport.clientWidth;
  canvasImage.height   = viewport.clientHeight;
  canvasOverlay.width  = viewport.clientWidth;
  canvasOverlay.height = viewport.clientHeight;
  render();
}

export function initCanvas() {
  window.addEventListener('resize', resizeCanvases);
}

