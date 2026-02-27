// ============================================================
//  Beamer Tracer – Renderer Entry Point
// ============================================================

import { resizeCanvases, initCanvas } from './services/canvas.js';
import { restoreState } from './services/persistence.js';
import { updateCalibrationButtons, initCalibration } from './features/calibration/calibration.js';
import { initMeasurement } from './features/measurement/measurement.js';
import { initSettings, updateGridInputVisibility, syncSettingsUI } from './features/settings/settings.js';
import { initFullscreen } from './features/fullscreen/fullscreen.js';
import { initContextMenu } from './features/contextMenu/contextMenu.js';
import { initOverlayButtons } from './features/overlays/overlays.js';
import { initDragDrop } from './events/dragdrop.js';
import { initMouse } from './events/mouse.js';
import { initKeyboard } from './events/keyboard.js';
import { initTour } from './features/tour/tour.js';

// ── Bootstrap ────────────────────────────────────────────────
async function init() {
  try {
    initCanvas();
    initDragDrop();
    initMouse();
    initKeyboard();
    initOverlayButtons();
    initCalibration();
    initMeasurement();
    initSettings();
    initFullscreen();
    initContextMenu();
    initTour();
    await restoreState();
    resizeCanvases();
    updateCalibrationButtons();
    updateGridInputVisibility();
    syncSettingsUI();
  } catch (err) {
    document.title = 'ERROR: ' + err.message;
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:12px;z-index:9999;font:14px monospace;white-space:pre-wrap';
    div.textContent = err.stack || err.message;
    document.body.prepend(div);
  }
}

init();

