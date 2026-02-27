/**
 * @module renderer/services/persistence
 * @description Persistenz-Service – Speichern und Laden des Anwendungs-States.
 *
 * Verwendet eine duale Persistenz-Strategie:
 * 1. **localStorage** – Schneller Cache im Browser-Speicher
 * 2. **Portable JSON-Datei** – Persistente Datei neben der EXE (via `electronAPI`)
 *
 * Gespeicherte Daten umfassen: Viewport (Zoom, Pan), Filter (Kontrast, Helligkeit),
 * Raster-Einstellungen, Overlay-Styles, Kalibrierungs-Daten und das geladene Bild
 * als Base64-Data-URL.
 *
 * @see {@link module:main} für die Datei-I/O-Implementierung im Main Process
 */

import state from '../core/state.js';
import { contrastDisp, brightnessDisp } from '../core/dom.js';
import { render } from '../render/index.js';
import { updateCalibrationButtons } from '../features/calibration/calibration.js';
import { updateGridInputVisibility } from '../features/settings/settings.js';

/**
 * Speichert den aktuellen Anwendungs-State in beide Persistenz-Schichten.
 *
 * **localStorage:** Sofortiger Schreibzugriff, überlebt Tab-Schließungen,
 * aber nicht Deinstallation oder Browserwechsel.
 *
 * **Portable Datei:** Schreibt via `electronAPI.writeConfig()` eine JSON-Datei
 * neben die EXE. Ermöglicht USB-Stick-Portabilität.
 *
 * **Achtung:** Das Bild wird als Base64-Data-URL gespeichert. Bei großen
 * Bildern kann die Konfigurationsdatei mehrere MB groß werden.
 */
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

/**
 * Stellt den Anwendungs-State aus der Persistenz wieder her.
 *
 * Lade-Reihenfolge:
 * 1. Versuche portable JSON-Datei via `electronAPI.readConfig()`
 * 2. Fallback: localStorage-Cache
 * 3. Kein gespeicherter State → keine Aktion
 *
 * Stellt alle State-Werte wieder her, synchronisiert die UI-Elemente
 * (Slider, Inputs) und lädt das Bild asynchron (wenn vorhanden).
 *
 * @async
 * @returns {Promise<void>}
 */
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
