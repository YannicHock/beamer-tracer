/**
 * @module renderer/features/overlays/overlays
 * @description Overlay Toggle-Logik und Toolbar-Button-Initialisierung.
 *
 * Stellt die zentrale `toggleOverlay()`-Funktion bereit, die von
 * Tastatur-Shortcuts, Kontextmenü und Toolbar-Buttons gemeinsam
 * genutzt wird. Registriert die Click-Handler für alle Overlay-Buttons.
 */

import state from '../../core/state.js';
import { render } from '../../render/index.js';

/**
 * Schaltet ein Overlay ein oder aus und aktualisiert den zugehörigen Button.
 *
 * Invertiert `state.overlays[key]` und togglet die CSS-Klasse `active`
 * am entsprechenden Button. Der Aufrufer muss anschließend `render()` aufrufen.
 *
 * @param {string} key - Overlay-Schlüssel ('grid' | 'center' | 'thirds' | 'ruler' | 'crosshair')
 * @param {string} btnId - DOM-ID des zugehörigen Toolbar-Buttons (z.B. 'btn-grid')
 */
export function toggleOverlay(key, btnId) {
  state.overlays[key] = !state.overlays[key];
  document.getElementById(btnId).classList.toggle('active');
}

/**
 * Registriert Click-Handler für alle Overlay-Toolbar-Buttons.
 * Jeder Button ruft `toggleOverlay()` für sein Overlay auf und löst `render()` aus.
 * Muss einmalig beim App-Start aufgerufen werden.
 */
export function initOverlayButtons() {
  document.getElementById('btn-grid').addEventListener('click', () => {
    toggleOverlay('grid', 'btn-grid'); render();
  });
  document.getElementById('btn-center').addEventListener('click', () => {
    toggleOverlay('center', 'btn-center'); render();
  });
  document.getElementById('btn-thirds').addEventListener('click', () => {
    toggleOverlay('thirds', 'btn-thirds'); render();
  });
  document.getElementById('btn-ruler').addEventListener('click', () => {
    toggleOverlay('ruler', 'btn-ruler'); render();
  });
  document.getElementById('btn-crosshair').addEventListener('click', () => {
    toggleOverlay('crosshair', 'btn-crosshair'); render();
  });
}
