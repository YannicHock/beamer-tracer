// ============================================================
//  Beamer Tracer – Keyboard Events
// ============================================================

import state from '../core/state.js';
import { canvasImage } from '../core/dom.js';
import { PAN_FINE, PAN_NORMAL, PAN_COARSE, ZOOM_STEP } from '../core/constants.js';
import { render } from '../render/index.js';
import { saveState } from '../services/persistence.js';
import { cancelCalibration, applyCalibrationStep2 } from '../features/calibration/calibration.js';
import { toggleMeasureMode, deactivateMeasureMode } from '../features/measurement/measurement.js';
import { toggleFullscreen } from '../features/fullscreen/fullscreen.js';
import { toggleOverlay } from '../features/overlays/overlays.js';
import { zoomAtPoint } from './mouse.js';

// ── Init ─────────────────────────────────────────────────────
export function initKeyboard() {
  // Help buttons
  document.getElementById('btn-help').addEventListener('click', () => {
    document.getElementById('help-overlay').classList.toggle('hidden');
  });
  document.getElementById('btn-help-close').addEventListener('click', () => {
    document.getElementById('help-overlay').classList.add('hidden');
  });

  // Main keydown handler
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    // ── Calibration Step 1 keys ──
    if (state.calibrateStep === 1) {
      let handled = true;
      const step = e.shiftKey ? 1 : (e.ctrlKey ? 20 : 5);
      switch (e.key) {
        case 'ArrowUp':    state.refLineY -= step; break;
        case 'ArrowDown':  state.refLineY += step; break;
        case 'ArrowLeft':  state.refLineX -= step; break;
        case 'ArrowRight': state.refLineX += step; break;
        case '+': case '=': state.refLineZoom = Math.max(0.05, state.refLineZoom + 0.01); break;
        case '-':            state.refLineZoom = Math.max(0.05, state.refLineZoom - 0.01); break;
        case 'Escape':       cancelCalibration(); return;
        default: handled = false;
      }
      if (handled) { e.preventDefault(); render(); }
      return;
    }

    // ── Calibration Step 2 keys ──
    if (state.calibrateStep === 2) {
      if (e.key === 'Escape') { cancelCalibration(); return; }
      if (e.key === 'Enter') {
        if (state.calibratePoints.length === 2) applyCalibrationStep2();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.calPointSelected >= 0) {
        state.calibratePoints.splice(state.calPointSelected, 1);
        state.calPointSelected = state.calibratePoints.length > 0 ? 0 : -1;
        state.calPointDragging = -1;
        document.getElementById('btn-cal-step2-ok').disabled = (state.calibratePoints.length < 2);
        e.preventDefault();
        render();
        return;
      }
      // Zoom and Pan in step 2 fall through
    }

    let step = PAN_NORMAL;
    if (e.shiftKey && !e.altKey) step = PAN_FINE;
    if (e.ctrlKey || e.metaKey) step = PAN_COARSE;

    let handled = true;

    // Alt + Arrow for zoom
    if (e.altKey) {
      switch (e.key) {
        case 'ArrowUp': {
          const zs = e.shiftKey ? ZOOM_STEP : ZOOM_STEP * 3;
          zoomAtPoint(canvasImage.width / 2, canvasImage.height / 2, zs);
          e.preventDefault();
          return;
        }
        case 'ArrowDown': {
          const zs = e.shiftKey ? -ZOOM_STEP : -ZOOM_STEP * 3;
          zoomAtPoint(canvasImage.width / 2, canvasImage.height / 2, zs);
          e.preventDefault();
          return;
        }
      }
    }

    switch (e.key) {
      case 'ArrowUp':    state.panY += step; break;
      case 'ArrowDown':  state.panY -= step; break;
      case 'ArrowLeft':  state.panX += step; break;
      case 'ArrowRight': state.panX -= step; break;
      case '+': case '=':
        zoomAtPoint(canvasImage.width / 2, canvasImage.height / 2, ZOOM_STEP);
        return;
      case '-':
        zoomAtPoint(canvasImage.width / 2, canvasImage.height / 2, -ZOOM_STEP);
        return;
      case '0':
        if (state.img) {
          state.zoom = 1.0;
          state.panX = (canvasImage.width  - state.img.width)  / 2;
          state.panY = (canvasImage.height - state.img.height) / 2;
        }
        break;
      case 'g': case 'G': toggleOverlay('grid',    'btn-grid');    break;
      case 'c': case 'C': toggleOverlay('center',  'btn-center');  break;
      case 't': case 'T': toggleOverlay('thirds',  'btn-thirds');  break;
      case 'r': case 'R': toggleOverlay('ruler',   'btn-ruler');   break;
      case 'x': case 'X': toggleOverlay('crosshair', 'btn-crosshair'); break;
      case 'm': case 'M': toggleMeasureMode(); break;
      case 'f': case 'F':
        if (!e.ctrlKey && !e.metaKey) { toggleFullscreen(); break; }
        handled = false; break;
      case 'F11': toggleFullscreen(); break;
      case 'Escape':
        if (state.isFullscreen) { toggleFullscreen(); break; }
        if (state.measureActive) { deactivateMeasureMode(); break; }
        handled = false;
        break;
      case 'h': case 'H': case 'F1':
        document.getElementById('help-overlay').classList.toggle('hidden');
        break;
      case 'o': case 'O':
        if (e.ctrlKey || e.metaKey) {
          document.getElementById('btn-load').click();
        } else { handled = false; }
        break;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      render();
      saveState();
    }
  });
}

