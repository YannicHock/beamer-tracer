// ============================================================
//  Beamer Tracer – Calibration Overlay Drawing
// ============================================================

import state from '../../core/state.js';
import { ctxOvl } from '../../core/dom.js';
import { REF_BASE_PX, CAL_POINT_RADIUS } from '../../core/constants.js';
import { imgToScreen } from '../../core/utils.js';

// ── Reference Line (Step 1) ──────────────────────────────────
export function drawReferenceLine() {
  const lineW = REF_BASE_PX * state.refLineZoom;
  const x1 = state.refLineX - lineW / 2;
  const x2 = state.refLineX + lineW / 2;
  const y  = state.refLineY;
  const tickH = 14;

  ctxOvl.save();
  ctxOvl.strokeStyle = '#ff0';
  ctxOvl.fillStyle   = '#ff0';
  ctxOvl.lineWidth   = 3;
  ctxOvl.shadowColor = 'rgba(0,0,0,0.7)';
  ctxOvl.shadowBlur  = 4;

  // Main line
  ctxOvl.beginPath();
  ctxOvl.moveTo(x1, y);
  ctxOvl.lineTo(x2, y);
  ctxOvl.stroke();

  // End ticks
  ctxOvl.beginPath();
  ctxOvl.moveTo(x1, y - tickH); ctxOvl.lineTo(x1, y + tickH);
  ctxOvl.moveTo(x2, y - tickH); ctxOvl.lineTo(x2, y + tickH);
  ctxOvl.stroke();

  // 10-cm ticks
  ctxOvl.lineWidth = 1.5;
  for (let i = 1; i < 10; i++) {
    const cx = x1 + (lineW / 10) * i;
    const th = (i === 5) ? tickH * 0.7 : tickH * 0.4;
    ctxOvl.beginPath();
    ctxOvl.moveTo(cx, y - th); ctxOvl.lineTo(cx, y + th);
    ctxOvl.stroke();
  }

  // Label
  ctxOvl.shadowBlur = 0;
  ctxOvl.font = 'bold 16px monospace';
  ctxOvl.textAlign = 'center';
  ctxOvl.fillText('← 1 Meter →', state.refLineX, y - tickH - 8);

  // Zoom info
  ctxOvl.font = '12px monospace';
  ctxOvl.fillStyle = 'rgba(255,255,0,0.7)';
  ctxOvl.fillText(
    `Linien-Zoom: ${Math.round(state.refLineZoom * 100)}%  |  ${Math.round(lineW)} px`,
    state.refLineX, y + tickH + 20,
  );

  ctxOvl.restore();
}

// ── Calibration Points (Step 2) ──────────────────────────────
export function drawCalibrationPoints() {
  if (state.calibratePoints.length === 0) return;

  ctxOvl.lineWidth = 2;

  const screenPts = state.calibratePoints.map(pt => imgToScreen(pt.imgX, pt.imgY));

  // Line + distance label between points
  if (screenPts.length === 2) {
    // Dashed helper line
    ctxOvl.save();
    ctxOvl.strokeStyle = 'rgba(255, 255, 0, 0.6)';
    ctxOvl.setLineDash([8, 6]);
    ctxOvl.lineWidth = 1.5;
    ctxOvl.beginPath();
    ctxOvl.moveTo(screenPts[0].x, screenPts[0].y);
    ctxOvl.lineTo(screenPts[1].x, screenPts[1].y);
    ctxOvl.stroke();
    ctxOvl.setLineDash([]);
    ctxOvl.restore();

    // Solid connection line
    ctxOvl.strokeStyle = 'rgba(255, 100, 0, 0.9)';
    ctxOvl.lineWidth = 2;
    ctxOvl.beginPath();
    ctxOvl.moveTo(screenPts[0].x, screenPts[0].y);
    ctxOvl.lineTo(screenPts[1].x, screenPts[1].y);
    ctxOvl.stroke();

    // Distance label
    const dx = screenPts[1].x - screenPts[0].x;
    const dy = screenPts[1].y - screenPts[0].y;
    const screenDist = Math.sqrt(dx * dx + dy * dy);
    const midX = (screenPts[0].x + screenPts[1].x) / 2;
    const midY = (screenPts[0].y + screenPts[1].y) / 2;
    ctxOvl.font = '13px monospace';
    ctxOvl.fillStyle = 'rgba(255, 100, 0, 0.9)';
    ctxOvl.fillText(`${Math.round(screenDist)} px`, midX + 8, midY - 8);
  }

  // Draw points
  for (let i = 0; i < screenPts.length; i++) {
    const pt = screenPts[i];
    const isSelected = (i === state.calPointSelected);

    if (isSelected) {
      ctxOvl.strokeStyle = 'rgba(255, 255, 0, 0.9)';
      ctxOvl.lineWidth = 2;
      ctxOvl.beginPath();
      ctxOvl.arc(pt.x, pt.y, CAL_POINT_RADIUS, 0, Math.PI * 2);
      ctxOvl.stroke();
    }

    ctxOvl.fillStyle = isSelected ? 'rgba(255, 200, 0, 0.95)' : 'rgba(255, 100, 0, 0.9)';
    ctxOvl.beginPath();
    ctxOvl.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
    ctxOvl.fill();

    ctxOvl.font = 'bold 12px monospace';
    ctxOvl.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctxOvl.fillText(`P${i + 1}`, pt.x + 10, pt.y - 10);
  }
}

