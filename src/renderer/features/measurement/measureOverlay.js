/**
 * @module renderer/features/measurement/measureOverlay
 * @description Canvas-Zeichnung für Messungen.
 *
 * Zeichnet alle Messlinien, Messpunkte und Abstands-Labels auf den
 * Overlay-Canvas. Wird vom Render-Orchestrator aufgerufen.
 *
 * Darstellung:
 * - Cyan-farbene Verbindungslinien zwischen Messpunkten
 * - Kreisförmige Punkte (Doppelkreis: äußerer Stroke + innerer Fill)
 * - Abstandslabel mit schwarzem Hintergrund (Pixel + optional cm)
 *
 * Alle Punkt-Koordinaten werden zur Laufzeit von Bild-Koordinaten
 * in Screen-Koordinaten umgerechnet (via `imgToScreen()`).
 */

import state from '../../core/state.js';
import { ctxOvl } from '../../core/dom.js';
import { imgToScreen } from '../../core/utils.js';

/**
 * Zeichnet einen einzelnen Messpunkt (Doppelkreis) an der gegebenen Screen-Position.
 *
 * @param {number} x - X-Position in Screen-Pixeln
 * @param {number} y - Y-Position in Screen-Pixeln
 * @private
 */
function drawMeasurePoint(x, y) {
  ctxOvl.strokeStyle = 'rgba(0, 200, 255, 0.9)';
  ctxOvl.lineWidth = 2;
  ctxOvl.beginPath();
  ctxOvl.arc(x, y, 7, 0, Math.PI * 2);
  ctxOvl.stroke();

  ctxOvl.fillStyle = 'rgba(0, 220, 255, 0.95)';
  ctxOvl.beginPath();
  ctxOvl.arc(x, y, 4, 0, Math.PI * 2);
  ctxOvl.fill();
}

/**
 * Zeichnet alle Messungen aus `state.measurements` auf den Overlay-Canvas.
 *
 * Für jede abgeschlossene Messung (p1 und p2 vorhanden):
 * - Verbindungslinie (cyan, 2px)
 * - Abstand in Pixel + optional cm (falls kalibriert)
 * - Label mit schwarzem Hintergrund für Lesbarkeit
 *
 * Für laufende Messungen (nur p1): Nur den ersten Punkt zeichnen.
 */
export function drawMeasurements() {
  if (state.measurements.length === 0) return;

  ctxOvl.save();

  for (let mi = 0; mi < state.measurements.length; mi++) {
    const m = state.measurements[mi];
    const sp1 = imgToScreen(m.p1.imgX, m.p1.imgY);

    if (m.p2) {
      const sp2 = imgToScreen(m.p2.imgX, m.p2.imgY);

      // Connection line
      ctxOvl.strokeStyle = 'rgba(0, 200, 255, 0.85)';
      ctxOvl.lineWidth = 2;
      ctxOvl.setLineDash([]);
      ctxOvl.beginPath();
      ctxOvl.moveTo(sp1.x, sp1.y);
      ctxOvl.lineTo(sp2.x, sp2.y);
      ctxOvl.stroke();

      // Distance in image pixels
      const dxImg = m.p2.imgX - m.p1.imgX;
      const dyImg = m.p2.imgY - m.p1.imgY;
      const distImgPx = Math.sqrt(dxImg * dxImg + dyImg * dyImg);

      let label = `${Math.round(distImgPx)} px`;
      if (state.calibration.pxPerCm && state.calibration.pxPerCm > 0) {
        const distCm = distImgPx / state.calibration.pxPerCm;
        label += `  (${distCm.toFixed(1)} cm)`;
      }

      const midX = (sp1.x + sp2.x) / 2;
      const midY = (sp1.y + sp2.y) / 2;

      // Label background
      ctxOvl.font = 'bold 13px monospace';
      const tm = ctxOvl.measureText(label);
      const textW = tm.width + 10;
      const textH = 20;
      ctxOvl.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctxOvl.fillRect(midX - textW / 2, midY - textH - 4, textW, textH);

      // Label text
      ctxOvl.fillStyle = 'rgba(0, 220, 255, 0.95)';
      ctxOvl.textAlign = 'center';
      ctxOvl.fillText(label, midX, midY - 8);
      ctxOvl.textAlign = 'left';

      drawMeasurePoint(sp2.x, sp2.y);
    }

    drawMeasurePoint(sp1.x, sp1.y);
  }

  ctxOvl.restore();
}
