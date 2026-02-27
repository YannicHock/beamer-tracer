/**
 * @module renderer/features/fullscreen/fullscreen
 * @description Vollbild-Verwaltung.
 *
 * Steuert den Vollbildmodus über Electron's native Fullscreen-API.
 * Im Vollbild wird die Toolbar ausgeblendet und erscheint nur,
 * wenn der Mauszeiger an den oberen Bildschirmrand bewegt wird.
 *
 * Kommunikation mit dem Main Process:
 * - `electronAPI.toggleFullscreen()` → Schaltet Vollbild um
 * - `electronAPI.getFullscreen()` → Initiale Synchronisation
 * - `electronAPI.onFullscreenChanged()` → Reagiert auf OS-seitige Änderungen
 *
 * @see {@link module:main} für die IPC-Handler-Implementierung
 */

import state from '../../core/state.js';
import { toolbar, fullscreenTrigger } from '../../core/dom.js';
import { resizeCanvases } from '../../services/canvas.js';

/**
 * Schaltet den Vollbildmodus um.
 *
 * Ruft `electronAPI.toggleFullscreen()` auf und wendet die
 * UI-Änderungen an (Toolbar ein/ausblenden, CSS-Klasse setzen).
 *
 * @async
 * @returns {Promise<void>}
 */
export async function toggleFullscreen() {
  if (window.electronAPI?.toggleFullscreen) {
    const newState = await window.electronAPI.toggleFullscreen();
    applyFullscreenUI(newState);
  }
}

/**
 * Wendet die Vollbild-UI-Änderungen an.
 *
 * Bei Vollbild:
 * - Setzt CSS-Klasse `fullscreen` auf `<body>`
 * - Toolbar wird über CSS ausgeblendet
 *
 * Bei Verlassen:
 * - Entfernt CSS-Klasse
 * - Toolbar wird wieder sichtbar
 *
 * Löst nach 50ms einen Canvas-Resize aus, da sich der Viewport ändert.
 *
 * @param {boolean} fs - `true` für Vollbild, `false` für Fenstermodus
 */
export function applyFullscreenUI(fs) {
  state.isFullscreen = fs;
  if (fs) {
    document.body.classList.add('fullscreen');
  } else {
    document.body.classList.remove('fullscreen');
    toolbar.classList.remove('toolbar-visible');
  }
  setTimeout(resizeCanvases, 50);
}

/**
 * Registriert alle Event-Listener für Vollbild-Verwaltung.
 *
 * - Fullscreen-Button in der Toolbar
 * - Hover-Trigger am oberen Bildschirmrand (Toolbar einblenden)
 * - Toolbar-Hover (Timeout-Management für Ausblenden)
 * - IPC-Listener für OS-seitige Vollbild-Änderungen
 * - Initiale Synchronisation des Vollbild-Status
 *
 * Muss einmalig beim App-Start aufgerufen werden.
 */
export function initFullscreen() {
  document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

  fullscreenTrigger.addEventListener('mouseenter', () => {
    if (!state.isFullscreen) return;
    toolbar.classList.add('toolbar-visible');
    clearTimeout(state.fullscreenToolbarTimeout);
  });

  toolbar.addEventListener('mouseenter', () => {
    if (!state.isFullscreen) return;
    clearTimeout(state.fullscreenToolbarTimeout);
  });

  toolbar.addEventListener('mouseleave', () => {
    if (!state.isFullscreen) return;
    state.fullscreenToolbarTimeout = setTimeout(() => {
      toolbar.classList.remove('toolbar-visible');
    }, 400);
  });

  if (window.electronAPI?.onFullscreenChanged) {
    window.electronAPI.onFullscreenChanged((fs) => {
      applyFullscreenUI(fs);
    });
  }

  // Sync fullscreen state on startup (e.g. if window was reopened in fullscreen)
  if (window.electronAPI?.getFullscreen) {
    window.electronAPI.getFullscreen().then((fs) => {
      if (fs) applyFullscreenUI(fs);
    });
  }
}
