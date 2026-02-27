/**
 * @module renderer/features/measurement/measurement
 * @description Messwerkzeug – Logik und Modus-Verwaltung.
 *
 * Ermöglicht das Messen von Abständen direkt im Bild durch
 * Setzen von Punkt-Paaren. Nach Kalibrierung werden Abstände
 * in Zentimetern angezeigt.
 *
 * Ablauf:
 * 1. Messmodus aktivieren (Button oder Taste M)
 * 2. Erster Klick: P1 setzen → unvollständige Messung
 * 3. Zweiter Klick: P2 setzen → Messung abgeschlossen
 * 4. Weitere Messungen möglich (mehrere Linien gleichzeitig)
 * 5. Punkte können nachträglich per Drag verschoben werden
 *
 * Messungen werden in `state.measurements` als Array von Punkt-Paaren
 * in Bild-Koordinaten gespeichert, sodass sie bei Zoom/Pan korrekt bleiben.
 *
 * @see {@link module:renderer/features/measurement/measureOverlay} für die Canvas-Zeichnung
 * @see {@link module:renderer/events/mouse} für die Maus-Interaktion im Messmodus
 */

import state from '../../core/state.js';
import { viewport } from '../../core/dom.js';
import { render } from '../../render/index.js';

/**
 * Aktualisiert die Sichtbarkeit des „🗑 Löschen"-Buttons.
 * Wird angezeigt, wenn mindestens eine Messung vorhanden ist.
 */
export function updateMeasureClearButton() {
  const btn = document.getElementById('btn-measure-clear');
  if (state.measurements.length > 0) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

/**
 * Aktiviert den Messmodus.
 *
 * Setzt `state.measureActive = true`, ändert den Cursor auf Crosshair
 * und markiert den Button als aktiv. Kann nicht aktiviert werden,
 * wenn eine Kalibrierung läuft (`calibrateStep !== 0`).
 */
export function activateMeasureMode() {
  if (state.calibrateStep !== 0) return;
  state.measureActive = true;
  state.measureCurrentIdx = -1;
  document.getElementById('btn-measure').classList.add('active');
  viewport.classList.add('measuring');
  updateMeasureClearButton();
  render();
}

/**
 * Deaktiviert den Messmodus.
 *
 * Entfernt unvollständige Messungen (nur 1 Punkt gesetzt),
 * setzt den Cursor zurück und markiert den Button als inaktiv.
 */
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

/**
 * Schaltet den Messmodus um (toggle).
 * Aufgerufen von Taste M und Toolbar-Button.
 */
export function toggleMeasureMode() {
  if (state.measureActive) {
    deactivateMeasureMode();
  } else {
    activateMeasureMode();
  }
}

/**
 * Löscht alle Messungen und setzt den Messzustand zurück.
 */
export function clearAllMeasurements() {
  state.measurements = [];
  state.measureCurrentIdx = -1;
  state.measureDragging = -1;
  updateMeasureClearButton();
  render();
}

/**
 * Registriert Event-Listener für Mess-Buttons (Messen + Löschen).
 * Muss einmalig beim App-Start aufgerufen werden.
 */
export function initMeasurement() {
  document.getElementById('btn-measure').addEventListener('click', toggleMeasureMode);
  document.getElementById('btn-measure-clear').addEventListener('click', clearAllMeasurements);
}
