// ============================================================
//  Beamer Tracer – Calibration Logic
// ============================================================

import state from '../../core/state.js';
import { canvasImage, canvasOverlay, viewport } from '../../core/dom.js';
import { REF_BASE_PX } from '../../core/constants.js';
import { render } from '../../render/index.js';
import { saveState } from '../../services/persistence.js';
import { updateGridInputVisibility } from '../settings/settings.js';

// ── UI Helpers ───────────────────────────────────────────────
export function updateCalibrationButtons() {
  const restoreBtn = document.getElementById('btn-restore-zoom');
  const recalBtn   = document.getElementById('btn-recalibrate');
  if (state.calibratedZoom !== null) {
    restoreBtn.classList.remove('hidden');
    recalBtn.classList.remove('hidden');
  } else {
    restoreBtn.classList.add('hidden');
    recalBtn.classList.add('hidden');
  }
}

// ── Step 1: Start ────────────────────────────────────────────
export function startCalibration() {
  if (!state.img) return;
  // Deactivate measurement if active (imported dynamically to avoid circular)
  if (state.measureActive) {
    import('../measurement/measurement.js').then(m => m.deactivateMeasureMode());
  }
  state.calibrateStep = 1;
  state.calibratePoints = [];

  state.refLineX    = canvasOverlay.width / 2;
  state.refLineY    = canvasOverlay.height / 2;
  state.refLineZoom = 1.0;

  viewport.classList.remove('calibrating');
  viewport.classList.add('calibrating-step1');
  document.getElementById('calibrate-banner-step1').classList.remove('hidden');
  document.getElementById('calibrate-banner-step2').classList.add('hidden');
  render();
}

// ── Step 1: Finish ───────────────────────────────────────────
export function finishStep1() {
  state.screenPxPerMeter = REF_BASE_PX * state.refLineZoom;

  state.calibrateStep = 2;
  state.calibratePoints = [];
  state.calPointDragging = -1;
  state.calPointSelected = -1;
  document.getElementById('calibrate-banner-step1').classList.add('hidden');
  document.getElementById('calibrate-banner-step2').classList.remove('hidden');
  document.getElementById('btn-cal-step2-ok').disabled = true;
  viewport.classList.remove('calibrating-step1');
  viewport.classList.add('calibrating');
  render();
}

// ── Cancel ───────────────────────────────────────────────────
export function cancelCalibration() {
  state.calibrateStep = 0;
  state.calibratePoints = [];
  state.calPointDragging = -1;
  state.calPointSelected = -1;
  viewport.classList.remove('calibrating');
  viewport.classList.remove('calibrating-step1');
  document.getElementById('calibrate-banner-step1').classList.add('hidden');
  document.getElementById('calibrate-banner-step2').classList.add('hidden');
  const confirmBtn = document.getElementById('btn-cal-step2-ok');
  if (confirmBtn) confirmBtn.disabled = true;
  render();
}

// ── Step 2: Apply ────────────────────────────────────────────
export function applyCalibrationStep2() {
  if (state.calibrateStep !== 2 || state.calibratePoints.length !== 2) return;

  const [p1, p2] = state.calibratePoints;

  const dxImg = p2.imgX - p1.imgX;
  const dyImg = p2.imgY - p1.imgY;
  const distImgPx = Math.sqrt(dxImg * dxImg + dyImg * dyImg);

  const knownCm = parseFloat(document.getElementById('input-calibrate-cm').value);
  if (knownCm > 0 && distImgPx > 0 && state.screenPxPerMeter > 0) {
    const screenPxPerCm = state.screenPxPerMeter / 100;
    const targetScreenPx = knownCm * screenPxPerCm;
    const newZoom = targetScreenPx / distImgPx;

    state.calibration.pxPerCm = distImgPx / knownCm;

    const imgCenterX = (p1.imgX + p2.imgX) / 2;
    const imgCenterY = (p1.imgY + p2.imgY) / 2;

    state.zoom = newZoom;
    state.panX = canvasImage.width  / 2 - imgCenterX * state.zoom;
    state.panY = canvasImage.height / 2 - imgCenterY * state.zoom;

    state.calibratedZoom = state.zoom;
    state.calibratedPanX = state.panX;
    state.calibratedPanY = state.panY;

    updateCalibrationButtons();
    updateGridInputVisibility();
    saveState();
  }

  cancelCalibration();
}

// ── Event Listener Init ──────────────────────────────────────
export function initCalibration() {
  document.getElementById('btn-calibrate').addEventListener('click', startCalibration);
  document.getElementById('btn-cal-cancel').addEventListener('click', cancelCalibration);
  document.getElementById('btn-cal-cancel2').addEventListener('click', cancelCalibration);
  document.getElementById('btn-cal-step1-ok').addEventListener('click', finishStep1);
  document.getElementById('btn-cal-step2-ok').addEventListener('click', applyCalibrationStep2);

  document.getElementById('btn-restore-zoom').addEventListener('click', () => {
    if (state.calibratedZoom !== null) {
      state.zoom = state.calibratedZoom;
      if (state.calibratedPanX !== null) state.panX = state.calibratedPanX;
      if (state.calibratedPanY !== null) state.panY = state.calibratedPanY;
      render();
      saveState();
    }
  });

  document.getElementById('btn-recalibrate').addEventListener('click', () => {
    state.calibratedZoom = null;
    state.calibratedPanX = null;
    state.calibratedPanY = null;
    state.calibration.pxPerCm = null;
    state.screenPxPerMeter = null;
    updateCalibrationButtons();
    updateGridInputVisibility();
    saveState();
    startCalibration();
  });
}

