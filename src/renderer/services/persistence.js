// ============================================================
//  Beamer Tracer – Persistence (Save / Restore)
// ============================================================

import state from '../core/state.js';
import { contrastDisp, brightnessDisp } from '../core/dom.js';
import { render } from '../render/index.js';
import { updateCalibrationButtons } from '../features/calibration/calibration.js';
import { updateGridInputVisibility } from '../features/settings/settings.js';

export function saveState() {
  const data = {
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
    contrast: state.contrast,
    brightness: state.brightness,
    gridSize: state.gridSize,
    gridSizeCm: state.gridSizeCm,
    overlayStyles: state.overlayStyles,
    screenPxPerMeter: state.screenPxPerMeter,
    pxPerCm: state.calibration.pxPerCm,
    calibratedZoom: state.calibratedZoom,
    calibratedPanX: state.calibratedPanX,
    calibratedPanY: state.calibratedPanY,
    imgSrc: state.imgSrc,
  };

  // localStorage as quick cache
  try {
    localStorage.setItem('beamer-tracer-state', JSON.stringify(data));
  } catch (_) { /* quota exceeded */ }

  // Persistent file (survives restarts)
  if (window.electronAPI?.writeConfig) {
    window.electronAPI.writeConfig(data);
  }
}

export async function restoreState() {
  try {
    let saved = null;
    if (window.electronAPI?.readConfig) {
      saved = await window.electronAPI.readConfig();
    }
    // Fallback: localStorage
    if (!saved) {
      const raw = localStorage.getItem('beamer-tracer-state');
      if (raw) saved = JSON.parse(raw);
    }
    if (!saved) return;

    state.zoom       = saved.zoom       ?? state.zoom;
    state.panX       = saved.panX       ?? state.panX;
    state.panY       = saved.panY       ?? state.panY;
    state.contrast   = saved.contrast   ?? state.contrast;
    state.brightness = saved.brightness ?? state.brightness;
    state.gridSize   = saved.gridSize   ?? state.gridSize;
    state.gridSizeCm = saved.gridSizeCm ?? state.gridSizeCm;

    if (saved.overlayStyles) {
      for (const key of Object.keys(state.overlayStyles)) {
        if (saved.overlayStyles[key]) {
          state.overlayStyles[key] = { ...state.overlayStyles[key], ...saved.overlayStyles[key] };
        }
      }
    }
    if (saved.screenPxPerMeter) state.screenPxPerMeter = saved.screenPxPerMeter;
    if (saved.pxPerCm) state.calibration.pxPerCm = saved.pxPerCm;
    if (saved.calibratedZoom != null) {
      state.calibratedZoom = saved.calibratedZoom;
      state.calibratedPanX = saved.calibratedPanX ?? null;
      state.calibratedPanY = saved.calibratedPanY ?? null;
    }
    if (saved.imgSrc) {
      state.imgSrc = saved.imgSrc;
      state.img = new Image();
      state.img.onload = () => { render(); updateCalibrationButtons(); };
      state.img.src = state.imgSrc;
    }

    // Sync UI elements
    document.getElementById('input-grid-size').value = state.gridSize;
    document.getElementById('input-grid-size-cm').value = state.gridSizeCm;
    updateGridInputVisibility();
    document.getElementById('slider-contrast').value = state.contrast;
    document.getElementById('slider-brightness').value = state.brightness;
    contrastDisp.textContent = `${state.contrast}%`;
    brightnessDisp.textContent = `${state.brightness}%`;

    updateCalibrationButtons();
    render();
  } catch (_) { /* ignore */ }
}

