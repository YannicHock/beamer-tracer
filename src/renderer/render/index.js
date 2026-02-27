/**
 * @module renderer/render
 * @description Render-Orchestrator – Koordiniert das Zeichnen aller visuellen Elemente.
 *
 * Dieses Modul ist der zentrale Einstiegspunkt für alle Render-Operationen.
 * Es ruft die spezialisierten Draw-Funktionen in der richtigen Reihenfolge auf.
 *
 * **Render-Reihenfolge (von unten nach oben):**
 * 1. Bild mit Transformationen und Filtern (canvas-image)
 * 2. Overlay-Canvas leeren (canvas-overlay)
 * 3. Raster, Mittellinien, Drittel-Linien, Maßstab
 * 4. Kalibrierungs-Overlays (Referenzlinie oder Kalibrierpunkte)
 * 5. Messungen
 * 6. Fadenkreuz (immer ganz oben)
 *
 * **Wichtig:** `render()` muss nach jeder State-Änderung aufgerufen werden.
 * Für reine Overlay-Änderungen (z.B. Mausbewegung) kann `renderOverlay()`
 * separat aufgerufen werden, um das Bild-Rendering zu überspringen.
 */

import state from '../core/state.js';
import { canvasOverlay, ctxOvl } from '../core/dom.js';
import { renderImage } from './image.js';
import { drawGrid, drawCenter, drawThirds, drawRuler, drawCrosshair } from '../features/overlays/overlayRenderer.js';
import { drawReferenceLine, drawCalibrationPoints } from '../features/calibration/calibrationOverlay.js';
import { drawMeasurements } from '../features/measurement/measureOverlay.js';

/**
 * Führt einen vollständigen Render-Zyklus durch:
 * Zeichnet das Bild neu und alle Overlays darüber.
 */
export function render() {
  renderImage();
  renderOverlay();
}

/**
 * Zeichnet nur die Overlay-Schicht neu (ohne das Bild).
 *
 * Wird verwendet, wenn sich nur Overlay-relevante Daten geändert haben
 * (z.B. Mausposition für Fadenkreuz), um unnötiges Bild-Rendering zu vermeiden.
 *
 * Berechnet die Bild-Bounding-Box in Screen-Koordinaten und übergibt sie
 * an die einzelnen Draw-Funktionen, damit Overlays korrekt positioniert werden.
 */
export function renderOverlay() {
  const w = canvasOverlay.width;
  const h = canvasOverlay.height;
  ctxOvl.clearRect(0, 0, w, h);

  // Image bounding box (screen coordinates)
  const imgX0 = state.img ? state.panX : 0;
  const imgY0 = state.img ? state.panY : 0;
  const imgW  = state.img ? state.img.width  * state.zoom : w;
  const imgH  = state.img ? state.img.height * state.zoom : h;

  // Standard overlays
  if (state.overlays.grid)    drawGrid(w, h, imgX0, imgY0, imgW, imgH);
  if (state.overlays.center)  drawCenter(imgX0, imgY0, imgW, imgH);
  if (state.overlays.thirds)  drawThirds(imgX0, imgY0, imgW, imgH);
  if (state.overlays.ruler)   drawRuler();

  // Calibration overlays
  if (state.calibrateStep === 1) drawReferenceLine();
  if (state.calibrateStep === 2) drawCalibrationPoints();

  // Measurements
  drawMeasurements();

  // Crosshair
  if (state.overlays.crosshair && state.crosshairMouseX >= 0 && state.crosshairMouseY >= 0) {
    drawCrosshair(w, h);
  }
}
