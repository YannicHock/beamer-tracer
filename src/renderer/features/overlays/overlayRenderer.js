// ============================================================
//  Beamer Tracer – Overlay Drawing (Grid, Center, Thirds, Ruler, Crosshair)
// ============================================================

import state from '../../core/state.js';
import { canvasOverlay, ctxOvl, scaleDisplay } from '../../core/dom.js';
import { hexToRgba } from '../../core/utils.js';

// ── Grid ─────────────────────────────────────────────────────
export function drawGrid(w, h, imgX0, imgY0, imgW, imgH) {
  const hasCal = state.calibration.pxPerCm != null && state.calibration.pxPerCm > 0;

  let stepScreen, labelStep;

  if (hasCal) {
    const stepImgPx = state.gridSizeCm * state.calibration.pxPerCm;
    stepScreen = stepImgPx * state.zoom;
    labelStep = state.gridSizeCm;
  } else {
    stepScreen = state.gridSize * state.zoom;
    labelStep = state.gridSize;
  }

  if (stepScreen < 5) return;

  ctxOvl.save();
  const gs = state.overlayStyles.grid;
  ctxOvl.strokeStyle = hexToRgba(gs.color, gs.opacity);
  ctxOvl.lineWidth = gs.width;

  const visLeft   = Math.max(0, imgX0);
  const visTop    = Math.max(0, imgY0);
  const visRight  = Math.min(w, imgX0 + imgW);
  const visBottom = Math.min(h, imgY0 + imgH);

  if (visRight <= visLeft || visBottom <= visTop) {
    ctxOvl.restore();
    return;
  }

  const firstIdxX = Math.ceil((visLeft - imgX0) / stepScreen);
  const lastIdxX  = Math.floor((visRight - imgX0) / stepScreen);
  const firstIdxY = Math.ceil((visTop - imgY0) / stepScreen);
  const lastIdxY  = Math.floor((visBottom - imgY0) / stepScreen);

  // Vertical lines
  ctxOvl.beginPath();
  for (let i = firstIdxX; i <= lastIdxX; i++) {
    const x = imgX0 + i * stepScreen;
    ctxOvl.moveTo(x, visTop);
    ctxOvl.lineTo(x, visBottom);
  }
  ctxOvl.stroke();

  // Horizontal lines
  ctxOvl.beginPath();
  for (let j = firstIdxY; j <= lastIdxY; j++) {
    const y = imgY0 + j * stepScreen;
    ctxOvl.moveTo(visLeft, y);
    ctxOvl.lineTo(visRight, y);
  }
  ctxOvl.stroke();

  // Labels (only when calibrated)
  if (hasCal) {
    const labelOpacity = Math.min(1, gs.opacity + 0.25);
    ctxOvl.font = '10px monospace';
    ctxOvl.fillStyle = hexToRgba(gs.color, labelOpacity);
    ctxOvl.textBaseline = 'bottom';

    for (let i = firstIdxX; i <= lastIdxX; i++) {
      if (i === 0) continue;
      const x = imgX0 + i * stepScreen;
      const labelVal = (i * labelStep).toFixed(labelStep % 1 === 0 ? 0 : 1);
      ctxOvl.textAlign = 'center';
      const labelY = Math.max(visTop + 12, imgY0 + 12);
      ctxOvl.fillText(`${labelVal}`, x, labelY);
    }

    ctxOvl.textAlign = 'left';
    ctxOvl.textBaseline = 'middle';
    for (let j = firstIdxY; j <= lastIdxY; j++) {
      if (j === 0) continue;
      const y = imgY0 + j * stepScreen;
      const labelVal = (j * labelStep).toFixed(labelStep % 1 === 0 ? 0 : 1);
      const labelX = Math.max(visLeft + 3, imgX0 + 3);
      ctxOvl.fillText(`${labelVal}`, labelX, y);
    }

    if (imgX0 >= 0 && imgX0 < w && imgY0 >= 0 && imgY0 < h) {
      ctxOvl.textAlign = 'left';
      ctxOvl.textBaseline = 'top';
      ctxOvl.fillStyle = hexToRgba(gs.color, Math.min(1, gs.opacity + 0.2));
      ctxOvl.fillText('cm', imgX0 + 3, imgY0 + 3);
    }
  }

  ctxOvl.restore();
}

// ── Center Lines ─────────────────────────────────────────────
export function drawCenter(imgX0, imgY0, imgW, imgH) {
  const cs = state.overlayStyles.center;
  ctxOvl.strokeStyle = hexToRgba(cs.color, cs.opacity);
  ctxOvl.lineWidth = cs.width;
  ctxOvl.beginPath();
  ctxOvl.moveTo(imgX0 + imgW / 2, imgY0);
  ctxOvl.lineTo(imgX0 + imgW / 2, imgY0 + imgH);
  ctxOvl.moveTo(imgX0, imgY0 + imgH / 2);
  ctxOvl.lineTo(imgX0 + imgW, imgY0 + imgH / 2);
  ctxOvl.stroke();
}

// ── Thirds Lines ─────────────────────────────────────────────
export function drawThirds(imgX0, imgY0, imgW, imgH) {
  const ts = state.overlayStyles.thirds;
  ctxOvl.strokeStyle = hexToRgba(ts.color, ts.opacity);
  ctxOvl.lineWidth = ts.width;
  ctxOvl.setLineDash([10, 5]);
  ctxOvl.beginPath();
  for (let i = 1; i <= 2; i++) {
    ctxOvl.moveTo(imgX0 + (imgW / 3) * i, imgY0);
    ctxOvl.lineTo(imgX0 + (imgW / 3) * i, imgY0 + imgH);
    ctxOvl.moveTo(imgX0, imgY0 + (imgH / 3) * i);
    ctxOvl.lineTo(imgX0 + imgW, imgY0 + (imgH / 3) * i);
  }
  ctxOvl.stroke();
  ctxOvl.setLineDash([]);
}

// ── Ruler ────────────────────────────────────────────────────
export function drawRuler() {
  const h = canvasOverlay.height;
  const startX = 20;
  const startY = h - 50;

  ctxOvl.strokeStyle = 'rgba(255, 255, 0, 0.85)';
  ctxOvl.fillStyle   = 'rgba(255, 255, 0, 0.85)';
  ctxOvl.lineWidth   = 2;
  ctxOvl.font        = '13px monospace';

  if (state.calibration.pxPerCm) {
    const refCm   = 10;
    const rulerPx = refCm * state.calibration.pxPerCm * state.zoom;

    ctxOvl.beginPath();
    ctxOvl.moveTo(startX, startY);
    ctxOvl.lineTo(startX + rulerPx, startY);
    ctxOvl.moveTo(startX, startY - 8); ctxOvl.lineTo(startX, startY + 8);
    ctxOvl.moveTo(startX + rulerPx, startY - 8); ctxOvl.lineTo(startX + rulerPx, startY + 8);
    for (let i = 1; i < refCm; i++) {
      const cx = startX + i * state.calibration.pxPerCm * state.zoom;
      ctxOvl.moveTo(cx, startY - 4); ctxOvl.lineTo(cx, startY + 4);
    }
    ctxOvl.stroke();
    ctxOvl.fillText(`${refCm} cm (kalibriert)`, startX, startY - 14);

    scaleDisplay.textContent = `📏 ${state.calibration.pxPerCm.toFixed(1)} px/cm`;
  } else {
    const rulerPx = 200;
    ctxOvl.beginPath();
    ctxOvl.moveTo(startX, startY);
    ctxOvl.lineTo(startX + rulerPx, startY);
    ctxOvl.moveTo(startX, startY - 6); ctxOvl.lineTo(startX, startY + 6);
    ctxOvl.moveTo(startX + rulerPx, startY - 6); ctxOvl.lineTo(startX + rulerPx, startY + 6);
    ctxOvl.stroke();
    ctxOvl.fillText(`${rulerPx}px (nicht kalibriert)`, startX, startY - 14);

    scaleDisplay.textContent = '';
  }
}

// ── Crosshair ────────────────────────────────────────────────
export function drawCrosshair(w, h) {
  const mx = state.crosshairMouseX;
  const my = state.crosshairMouseY;

  ctxOvl.save();

  const chs = state.overlayStyles.crosshair;
  ctxOvl.strokeStyle = hexToRgba(chs.color, chs.opacity);
  ctxOvl.lineWidth = chs.width;
  ctxOvl.setLineDash([6, 4]);

  ctxOvl.beginPath();
  ctxOvl.moveTo(0, my);
  ctxOvl.lineTo(w, my);
  ctxOvl.stroke();

  ctxOvl.beginPath();
  ctxOvl.moveTo(mx, 0);
  ctxOvl.lineTo(mx, h);
  ctxOvl.stroke();

  ctxOvl.setLineDash([]);

  // Coordinate display near cursor
  if (state.img) {
    const imgPxX = (mx - state.panX) / state.zoom;
    const imgPxY = (my - state.panY) / state.zoom;
    const insideImage = imgPxX >= 0 && imgPxX < state.img.width && imgPxY >= 0 && imgPxY < state.img.height;

    let label = `${Math.round(imgPxX)}, ${Math.round(imgPxY)} px`;
    if (state.calibration.pxPerCm && state.calibration.pxPerCm > 0) {
      const cmX = (imgPxX / state.calibration.pxPerCm).toFixed(1);
      const cmY = (imgPxY / state.calibration.pxPerCm).toFixed(1);
      label += `  (${cmX}, ${cmY} cm)`;
    }

    const offsetX = 14;
    const offsetY = 20;
    let labelX = mx + offsetX;
    let labelY = my + offsetY;

    ctxOvl.font = '12px monospace';
    const tm = ctxOvl.measureText(label);
    const textW = tm.width + 8;
    const textH = 18;

    if (labelX + textW > w) labelX = mx - offsetX - textW;
    if (labelY + textH > h) labelY = my - offsetY - textH;

    ctxOvl.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctxOvl.fillRect(labelX - 2, labelY - 13, textW, textH);

    ctxOvl.fillStyle = insideImage ? 'rgba(255, 255, 255, 0.9)' : 'rgba(150, 150, 150, 0.7)';
    ctxOvl.fillText(label, labelX + 2, labelY);
  }

  ctxOvl.restore();
}

