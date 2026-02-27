// ============================================================
//  Beamer Tracer – Canvas Resize
// ============================================================

/**
 * @module renderer/services/canvas
 * @description Canvas-Resize-Handling.
 *
 * Stellt sicher, dass beide Canvas-Elemente (Bild + Overlay) immer die
 * Größe des Viewports haben. Registriert einen `resize`-Event-Listener
 * auf dem Window, der bei Fenstergrößenänderungen automatisch beide
 * Canvas-Dimensionen anpasst und einen Render-Zyklus auslöst.
 */

import { canvasImage, canvasOverlay, viewport } from '../core/dom.js';
import { render } from '../render/index.js';

/**
 * Passt die Breite und Höhe beider Canvas-Elemente an die aktuelle
 * Viewport-Größe an und löst einen vollständigen Render-Zyklus aus.
 *
 * Wird aufgerufen bei:
 * - Window-Resize
 * - Vollbild-Wechsel (mit 50ms Delay für Animation)
 * - Initiale Bootstrap-Phase
 */
export function resizeCanvases() {
  canvasImage.width    = viewport.clientWidth;
  canvasImage.height   = viewport.clientHeight;
  canvasOverlay.width  = viewport.clientWidth;
  canvasOverlay.height = viewport.clientHeight;
  render();
}

/**
 * Registriert den globalen `resize`-Event-Listener.
 * Muss einmalig beim App-Start aufgerufen werden.
 */
export function initCanvas() {
  window.addEventListener('resize', resizeCanvases);
}
