/**
 * @module renderer/render/image
 * @description Bild-Rendering auf dem Bild-Canvas.
 *
 * Zeichnet das geladene Bild mit den aktuellen Viewport-Transformationen
 * (Zoom + Pan) und CSS-Filtern (Kontrast + Helligkeit) auf `canvas-image`.
 *
 * Aktualisiert außerdem die Zoom-Anzeige in der Toolbar.
 * Zeigt ein 🎯-Symbol, wenn der aktuelle Zoom dem kalibrierten Zoom entspricht.
 */

import state from '../core/state.js';
import { canvasImage, ctxImg, zoomDisplay } from '../core/dom.js';

/**
 * Zeichnet das Bild auf den Bild-Canvas (`canvas-image`).
 *
 * Ablauf:
 * 1. Canvas leeren (`clearRect`)
 * 2. CSS-Filter setzen (Kontrast, Helligkeit)
 * 3. Canvas-Kontext transformieren: `translate(panX, panY)` + `scale(zoom, zoom)`
 * 4. Bild an Position (0, 0) im transformierten Kontext zeichnen
 * 5. Filter zurücksetzen
 * 6. Zoom-Anzeige in der Toolbar aktualisieren
 *
 * Falls kein Bild geladen ist (`state.img === null`), wird der Canvas
 * lediglich geleert und die Funktion kehrt zurück.
 */
export function renderImage() {
  const w = canvasImage.width;
  const h = canvasImage.height;
  ctxImg.clearRect(0, 0, w, h);
  if (!state.img) return;

  ctxImg.filter = `contrast(${state.contrast}%) brightness(${state.brightness}%)`;

  ctxImg.save();
  ctxImg.translate(state.panX, state.panY);
  ctxImg.scale(state.zoom, state.zoom);
  ctxImg.drawImage(state.img, 0, 0);
  ctxImg.restore();

  ctxImg.filter = 'none';

  const zoomPct = Math.round(state.zoom * 100);
  if (state.calibratedZoom !== null && Math.abs(state.zoom - state.calibratedZoom) < 0.0001) {
    zoomDisplay.textContent = `${zoomPct}% 🎯`;
  } else {
    zoomDisplay.textContent = `${zoomPct}%`;
  }
}
