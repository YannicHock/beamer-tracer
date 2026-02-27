// ============================================================
//  Beamer Tracer – Measurement Logic
// ============================================================

import state from '../../core/state.js';
import { viewport } from '../../core/dom.js';
import { render } from '../../render/index.js';

export function updateMeasureClearButton() {
  const btn = document.getElementById('btn-measure-clear');
  if (state.measurements.length > 0) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

export function activateMeasureMode() {
  if (state.calibrateStep !== 0) return;
  state.measureActive = true;
  state.measureCurrentIdx = -1;
  document.getElementById('btn-measure').classList.add('active');
  viewport.classList.add('measuring');
  updateMeasureClearButton();
  render();
}

export function deactivateMeasureMode() {
  state.measureActive = false;
  // Remove incomplete measurement (only 1 point)
  if (
    state.measureCurrentIdx >= 0 &&
    state.measurements[state.measureCurrentIdx] &&
    !state.measurements[state.measureCurrentIdx].p2
  ) {
    state.measurements.splice(state.measureCurrentIdx, 1);
  }
  state.measureCurrentIdx = -1;
  state.measureDragging = -1;
  document.getElementById('btn-measure').classList.remove('active');
  viewport.classList.remove('measuring');
  updateMeasureClearButton();
  render();
}

export function toggleMeasureMode() {
  if (state.measureActive) {
    deactivateMeasureMode();
  } else {
    activateMeasureMode();
  }
}

export function clearAllMeasurements() {
  state.measurements = [];
  state.measureCurrentIdx = -1;
  state.measureDragging = -1;
  updateMeasureClearButton();
  render();
}

export function initMeasurement() {
  document.getElementById('btn-measure').addEventListener('click', toggleMeasureMode);
  document.getElementById('btn-measure-clear').addEventListener('click', clearAllMeasurements);
}

