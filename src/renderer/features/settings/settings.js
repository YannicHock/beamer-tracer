/**
 * @module renderer/features/settings/settings
 * @description Overlay-Einstellungen, Raster-Konfiguration und Filter-Slider.
 *
 * Verwaltet das Settings-Panel (⚙️-Button) mit Farbe/Deckkraft/Dicke
 * für jedes Overlay, sowie die Rasterweite-Inputs und Kontrast/Helligkeit-Slider.
 *
 * Funktionen:
 * - `updateGridInputVisibility()` – Wechselt zwischen px- und cm-Eingabe
 * - `syncSettingsUI()` – Synchronisiert UI-Elemente mit State-Werten
 * - `initSettings()` – Registriert alle Event-Listener
 *
 * Die Overlay-Style-Inputs werden in einer Schleife über `OVERLAY_KEYS`
 * generiert, um Code-Duplizierung zu vermeiden.
 */

import state from '../../core/state.js';
import { contrastDisp, brightnessDisp } from '../../core/dom.js';
import { OVERLAY_KEYS, DEFAULT_OVERLAY_STYLES } from '../../core/constants.js';
import { render } from '../../render/index.js';
import { saveState } from '../../services/persistence.js';

// ── Grid Input Visibility ────────────────────────────────────
/**
 * Schaltet zwischen Pixel- und Zentimeter-Eingabefeld für die Rasterweite um.
 *
 * - **Kalibriert** (`pxPerCm !== null`): cm-Eingabe anzeigen, px-Eingabe verbergen
 * - **Unkalibriert**: px-Eingabe anzeigen, cm-Eingabe verbergen
 */
export function updateGridInputVisibility() {
  const hasCal = state.calibration.pxPerCm != null;
  document.getElementById('grid-input-px').style.display = hasCal ? 'none' : 'flex';
  document.getElementById('grid-input-cm').style.display = hasCal ? 'flex' : 'none';
}

// ── Sync Settings UI ─────────────────────────────────────────
/**
 * Synchronisiert alle Settings-Panel-Inputs mit den aktuellen State-Werten.
 *
 * Setzt für jedes Overlay in `OVERLAY_KEYS`:
 * - Color-Picker-Wert
 * - Opacity-Slider-Wert und Prozentzahl-Label
 * - Width-Slider-Wert und numerisches Label
 */
export function syncSettingsUI() {
  for (const key of OVERLAY_KEYS) {
    const s = state.overlayStyles[key];
    document.getElementById(`style-${key}-color`).value   = s.color;
    document.getElementById(`style-${key}-opacity`).value  = s.opacity;
    document.getElementById(`style-${key}-width`).value    = s.width;
    document.getElementById(`style-${key}-opacity-val`).textContent = `${Math.round(s.opacity * 100)}%`;
    document.getElementById(`style-${key}-width-val`).textContent   = s.width.toFixed(s.width % 1 === 0 ? 0 : 2);
  }
}

// ── Init ─────────────────────────────────────────────────────
/**
 * Registriert alle Event-Listener für Einstellungen.
 *
 * Umfasst:
 * - Rasterweite (px und cm)
 * - Kontrast- und Helligkeits-Slider
 * - Settings-Panel öffnen/schließen (inkl. Klick-Outside-to-close)
 * - Reset-Button (Standardwerte wiederherstellen)
 * - Per-Overlay-Style-Inputs (Color, Opacity, Width) für alle OVERLAY_KEYS
 *
 * Jeder Input-Handler aktualisiert den State, ruft `render()` auf
 * und persistiert via `saveState()`.
 *
 * Muss einmalig beim App-Start aufgerufen werden.
 */
export function initSettings() {
  // Grid size (pixels)
  const gridSizeInput = document.getElementById('input-grid-size');
  gridSizeInput.value = state.gridSize;
  gridSizeInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    if (val >= 5) {
      state.gridSize = val;
      render();
      saveState();
    }
  });

  // Grid size (cm)
  const gridSizeCmInput = document.getElementById('input-grid-size-cm');
  gridSizeCmInput.value = state.gridSizeCm;
  gridSizeCmInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (val >= 0.5) {
      state.gridSizeCm = val;
      render();
      saveState();
    }
  });

  // Contrast slider
  const contrastSlider = document.getElementById('slider-contrast');
  contrastSlider.value = state.contrast;
  contrastSlider.addEventListener('input', (e) => {
    state.contrast = parseInt(e.target.value, 10);
    contrastDisp.textContent = `${state.contrast}%`;
    render();
    saveState();
  });

  // Brightness slider
  const brightnessSlider = document.getElementById('slider-brightness');
  brightnessSlider.value = state.brightness;
  brightnessSlider.addEventListener('input', (e) => {
    state.brightness = parseInt(e.target.value, 10);
    brightnessDisp.textContent = `${state.brightness}%`;
    render();
    saveState();
  });

  // Settings panel open/close
  document.getElementById('btn-settings').addEventListener('click', () => {
    syncSettingsUI();
    document.getElementById('settings-overlay').classList.remove('hidden');
  });
  document.getElementById('btn-settings-close').addEventListener('click', () => {
    document.getElementById('settings-overlay').classList.add('hidden');
  });
  document.getElementById('settings-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('settings-overlay').classList.add('hidden');
    }
  });

  // Reset to defaults
  document.getElementById('btn-settings-reset').addEventListener('click', () => {
    for (const key of OVERLAY_KEYS) {
      state.overlayStyles[key] = { ...DEFAULT_OVERLAY_STYLES[key] };
    }
    syncSettingsUI();
    render();
    saveState();
  });

  // Per-overlay style inputs
  for (const key of OVERLAY_KEYS) {
    document.getElementById(`style-${key}-color`).addEventListener('input', (e) => {
      state.overlayStyles[key].color = e.target.value;
      render();
      saveState();
    });
    document.getElementById(`style-${key}-opacity`).addEventListener('input', (e) => {
      state.overlayStyles[key].opacity = parseFloat(e.target.value);
      document.getElementById(`style-${key}-opacity-val`).textContent =
        `${Math.round(state.overlayStyles[key].opacity * 100)}%`;
      render();
      saveState();
    });
    document.getElementById(`style-${key}-width`).addEventListener('input', (e) => {
      state.overlayStyles[key].width = parseFloat(e.target.value);
      const w = state.overlayStyles[key].width;
      document.getElementById(`style-${key}-width-val`).textContent =
        w.toFixed(w % 1 === 0 ? 0 : 2);
      render();
      saveState();
    });
  }
}
