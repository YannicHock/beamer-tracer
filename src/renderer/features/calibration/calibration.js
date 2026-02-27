/**
 * @module renderer/features/calibration/calibration
 * @description 2-Schritt-Kalibrierungs-Logik.
 *
 * Ermöglicht die Umrechnung von Bild-Pixeln in reale Zentimeter
 * durch einen zweistufigen Kalibrierungsprozess:
 *
 * **Schritt 1 – Projektionsfläche:**
 * Eine gelbe 1-Meter-Referenzlinie wird angezeigt. Der Benutzer verschiebt
 * und skaliert sie, bis sie genau 1 Meter auf der echten Wand abdeckt.
 * Ergebnis: `state.screenPxPerMeter` (Screen-Pixel pro Meter)
 *
 * **Schritt 2 – Bild kalibrieren:**
 * Der Benutzer klickt 2 Punkte im Bild mit bekanntem Abstand.
 * Ergebnis: `state.calibration.pxPerCm` (Bild-Pixel pro Zentimeter)
 * + automatische Zoom-Anpassung, sodass das Bild maßstabsgetreu projiziert wird.
 *
 * **State-Übergänge:**
 * ```
 * calibrateStep: 0 → startCalibration() → 1
 *                1 → finishStep1()      → 2
 *                2 → applyCalibrationStep2() oder cancelCalibration() → 0
 * ```
 *
 * **Hinweis:** Verwendet dynamischen Import für `measurement.js`, um zirkuläre
 * Abhängigkeiten zu vermeiden.
 *
 * @see {@link module:renderer/features/calibration/calibrationOverlay} für die Canvas-Zeichnung
 */

import state from '../../core/state.js';
import { canvasImage, canvasOverlay, viewport } from '../../core/dom.js';
import { REF_BASE_PX } from '../../core/constants.js';
import { render } from '../../render/index.js';
import { saveState } from '../../services/persistence.js';
import { updateGridInputVisibility } from '../settings/settings.js';

/**
 * Aktualisiert die Sichtbarkeit der Kalibrierungs-Buttons in der Toolbar.
 *
 * Zeigt „🎯 Zoom" und „🔄 Neu" nur an, wenn eine Kalibrierung vorhanden ist
 * (`state.calibratedZoom !== null`).
 */
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

/**
 * Startet die Kalibrierung (Schritt 1: Referenzlinie).
 *
 * Deaktiviert einen eventuell aktiven Messmodus (dynamischer Import),
 * zeigt die Referenzlinie in der Mitte des Canvas an und blendet
 * das Banner für Schritt 1 ein.
 *
 * Voraussetzung: Ein Bild muss geladen sein (`state.img !== null`).
 */
export function startCalibration() {
  if (!state.img) return;
  // Deaktiviert einen eventuell aktiven Messmodus (dynamischer Import)
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

/**
 * Schließt Schritt 1 ab und wechselt zu Schritt 2.
 *
 * Berechnet `state.screenPxPerMeter` aus der Referenzlinien-Länge:
 * `screenPxPerMeter = REF_BASE_PX × refLineZoom`
 *
 * Setzt den Kalibrierungsmodus auf Schritt 2 (Punkte setzen).
 */
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

/**
 * Bricht die Kalibrierung ab und setzt alle Kalibrierungs-State-Werte zurück.
 * Entfernt CSS-Klassen und Banner.
 */
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

/**
 * Wendet die Kalibrierung aus Schritt 2 an.
 *
 * Berechnung:
 * 1. Abstand der 2 Punkte in Bild-Pixeln: `distImgPx`
 * 2. Bekannter Abstand in cm: `knownCm` (aus Input-Feld)
 * 3. `pxPerCm = distImgPx / knownCm`
 * 4. Benötigter Screen-Pixel-Abstand: `targetScreenPx = knownCm × screenPxPerCm`
 * 5. Neuer Zoom: `newZoom = targetScreenPx / distImgPx`
 * 6. Pan so anpassen, dass die Mitte der 2 Punkte im Viewport zentriert ist
 *
 * Speichert kalibrierten Zoom + Pan für spätere Wiederherstellung.
 */
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

/**
 * Registriert Event-Listener für alle Kalibrierungs-Buttons.
 *
 * Buttons:
 * - `btn-calibrate`: Startet Kalibrierung
 * - `btn-cal-cancel` / `btn-cal-cancel2`: Bricht ab
 * - `btn-cal-step1-ok`: Bestätigt Schritt 1
 * - `btn-cal-step2-ok`: Bestätigt Schritt 2
 * - `btn-restore-zoom`: Stellt kalibrierten Zoom/Pan wieder her
 * - `btn-recalibrate`: Setzt Kalibrierung zurück und startet neu
 *
 * Muss einmalig beim App-Start aufgerufen werden.
 */
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
