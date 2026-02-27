/**
 * @module renderer/main
 * @description Renderer Entry Point – Bootstrap der gesamten Anwendung.
 *
 * Dieses Modul ist der Einstiegspunkt für den Renderer-Prozess.
 * Es importiert und initialisiert alle Module in der korrekten Reihenfolge:
 *
 * **Initialisierungsreihenfolge:**
 * 1. `initCanvas()` – Canvas-Resize-Handler registrieren
 * 2. `initDragDrop()` – Bild-Laden (Drag & Drop, Paste, Dialog)
 * 3. `initMouse()` – Maus-Events (Pan, Zoom, Kalibrierung, Messung)
 * 4. `initKeyboard()` – Tastatur-Shortcuts
 * 5. `initOverlayButtons()` – Overlay-Toggle-Buttons
 * 6. `initCalibration()` – Kalibrierungs-Buttons
 * 7. `initMeasurement()` – Messwerkzeug-Buttons
 * 8. `initSettings()` – Settings-Panel und Filter-Slider
 * 9. `initFullscreen()` – Vollbild-Verwaltung
 * 10. `initContextMenu()` – Rechtsklick-Kontextmenü
 * 11. `initTour()` – Onboarding-Tour (Auto-Start beim ersten Besuch)
 * 12. `restoreState()` – Gespeicherten State wiederherstellen (async)
 * 13. `resizeCanvases()` – Initiale Canvas-Größe setzen + erster Render
 * 14. UI-Synchronisation (Kalibrierungs-Buttons, Grid-Input, Settings-Panel)
 *
 * Fehler beim Bootstrap werden als rotes Error-Overlay über der App angezeigt.
 *
 * @see {@link module:renderer/core/state} für den zentralen State
 * @see {@link module:renderer/render} für die Render-Pipeline
 */

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
/**
 * Asynchrone Bootstrap-Funktion.
 *
 * Initialisiert alle Module in der richtigen Reihenfolge und stellt
 * den gespeicherten State wieder her. Bei Fehlern wird ein rotes
 * Overlay mit der Fehlermeldung und dem Stack-Trace angezeigt.
 *
 * @async
 * @returns {Promise<void>}
 */
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
