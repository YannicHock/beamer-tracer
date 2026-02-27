// ============================================================
//  Beamer Tracer – Render Orchestrator
// ============================================================

import state from '../core/state.js';
import { canvasOverlay, ctxOvl } from '../core/dom.js';
import { renderImage } from './image.js';
import { drawGrid, drawCenter, drawThirds, drawRuler, drawCrosshair } from '../features/overlays/overlayRenderer.js';
import { drawReferenceLine, drawCalibrationPoints } from '../features/calibration/calibrationOverlay.js';
import { drawMeasurements } from '../features/measurement/measureOverlay.js';

export function render() {
  renderImage();
  renderOverlay();
}

export function renderOverlay() {
  const w = canvasOverlay.width;
  const h = canvasOverlay.height;
  ctxOvl.clearRect(0, 0, w, h);

  // Image bounding box (screen coordinates)
  const imgX0 = state.img ? state.panX : 0;
  const imgY0 = state.img ? state.panY : 0;
  const imgW  = state.img ? state.img.width  * state.zoom : w;
  const imgH  = state.img ? state.img.height * state.zoom : h;

  // Standard overlays
  if (state.overlays.grid)    drawGrid(w, h, imgX0, imgY0, imgW, imgH);
  if (state.overlays.center)  drawCenter(imgX0, imgY0, imgW, imgH);
  if (state.overlays.thirds)  drawThirds(imgX0, imgY0, imgW, imgH);
  if (state.overlays.ruler)   drawRuler();

  // Calibration overlays
  if (state.calibrateStep === 1) drawReferenceLine();
  if (state.calibrateStep === 2) drawCalibrationPoints();

  // Measurements
  drawMeasurements();

  // Crosshair
  if (state.overlays.crosshair && state.crosshairMouseX >= 0 && state.crosshairMouseY >= 0) {
    drawCrosshair(w, h);
  }
}

