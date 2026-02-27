// ============================================================
//  Beamer Tracer – Mouse Events (Pan, Zoom, Drag, Calibration, Measurement)
// ============================================================

import state from '../core/state.js';
import { viewport } from '../core/dom.js';
import { ZOOM_STEP, CAL_POINT_RADIUS, MEASURE_POINT_RADIUS } from '../core/constants.js';
import { imgToScreen, screenToImg } from '../core/utils.js';
import { render, renderOverlay } from '../render/index.js';
import { saveState } from '../services/persistence.js';
import { updateMeasureClearButton } from '../features/measurement/measurement.js';

// ── Zoom at Point ────────────────────────────────────────────
export function zoomAtPoint(mouseX, mouseY, zoomDelta) {
  const imgXBefore = (mouseX - state.panX) / state.zoom;
  const imgYBefore = (mouseY - state.panY) / state.zoom;

  state.zoom = Math.max(0.01, state.zoom + zoomDelta);

  state.panX = mouseX - imgXBefore * state.zoom;
  state.panY = mouseY - imgYBefore * state.zoom;

  render();
  saveState();
}

// ── Init ─────────────────────────────────────────────────────
export function initMouse() {
  // ── Crosshair tracking ──
  viewport.addEventListener('mousemove', (e) => {
    const rect = viewport.getBoundingClientRect();
    state.crosshairMouseX = e.clientX - rect.left;
    state.crosshairMouseY = e.clientY - rect.top;
    if (state.overlays.crosshair) renderOverlay();
  });

  viewport.addEventListener('mouseleave', () => {
    state.crosshairMouseX = -1;
    state.crosshairMouseY = -1;
    if (state.overlays.crosshair) renderOverlay();
  });

  // ── Wheel ──
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;

    if (state.calibrateStep === 1) {
      const delta = e.deltaY > 0 ? -0.02 : 0.02;
      state.refLineZoom = Math.max(0.05, state.refLineZoom + delta);
      render();
      return;
    }

    const delta = e.deltaY > 0 ? -ZOOM_STEP * 3 : ZOOM_STEP * 3;
    zoomAtPoint(mx, my, delta);
  }, { passive: false });

  // ── Mousedown ──
  viewport.addEventListener('mousedown', (e) => {
    // ── Measurement mode ──
    if (state.measureActive && state.calibrateStep === 0) {
      const rect = viewport.getBoundingClientRect();
      const mx   = e.clientX - rect.left;
      const my   = e.clientY - rect.top;

      // Middle mouse → pan
      if (e.button === 1) {
        startPanDrag(e);
        return;
      }

      // Hit-test existing measure points
      let hitMeasure = -1;
      for (let mi = 0; mi < state.measurements.length; mi++) {
        const m = state.measurements[mi];
        const sp1 = imgToScreen(m.p1.imgX, m.p1.imgY);
        const d1 = Math.sqrt((sp1.x - mx) ** 2 + (sp1.y - my) ** 2);
        if (d1 <= MEASURE_POINT_RADIUS) { hitMeasure = mi * 10; break; }
        if (m.p2) {
          const sp2 = imgToScreen(m.p2.imgX, m.p2.imgY);
          const d2 = Math.sqrt((sp2.x - mx) ** 2 + (sp2.y - my) ** 2);
          if (d2 <= MEASURE_POINT_RADIUS) { hitMeasure = mi * 10 + 1; break; }
        }
      }

      if (hitMeasure >= 0) {
        state.measureDragging = hitMeasure;
        viewport.classList.add('dragging');
        e.preventDefault();
        return;
      }

      // New point
      const imgPt = screenToImg(mx, my);
      if (state.measureCurrentIdx >= 0 && state.measurements[state.measureCurrentIdx] && !state.measurements[state.measureCurrentIdx].p2) {
        state.measurements[state.measureCurrentIdx].p2 = { imgX: imgPt.x, imgY: imgPt.y };
        state.measureCurrentIdx = -1;
        updateMeasureClearButton();
        render();
      } else {
        state.measurements.push({ p1: { imgX: imgPt.x, imgY: imgPt.y }, p2: null });
        state.measureCurrentIdx = state.measurements.length - 1;
        render();
      }
      e.preventDefault();
      return;
    }

    // ── Calibration Step 2 ──
    if (state.calibrateStep === 2) {
      const rect = viewport.getBoundingClientRect();
      const mx   = e.clientX - rect.left;
      const my   = e.clientY - rect.top;

      if (e.button === 1) { startPanDrag(e); return; }

      // Hit-test calibration points
      let hitIdx = -1;
      for (let i = 0; i < state.calibratePoints.length; i++) {
        const sp = imgToScreen(state.calibratePoints[i].imgX, state.calibratePoints[i].imgY);
        const dx = sp.x - mx;
        const dy = sp.y - my;
        if (Math.sqrt(dx * dx + dy * dy) <= CAL_POINT_RADIUS) {
          hitIdx = i;
          break;
        }
      }

      if (hitIdx >= 0) {
        state.calPointDragging = hitIdx;
        state.calPointSelected = hitIdx;
        viewport.classList.add('dragging');
        e.preventDefault();
        render();
        return;
      }

      // New calibration point (max 2)
      if (state.calibratePoints.length < 2) {
        let imgPt = screenToImg(mx, my);
        if (e.shiftKey && state.calibratePoints.length === 1) {
          const ref = state.calibratePoints[0];
          if (Math.abs(imgPt.x - ref.imgX) > Math.abs(imgPt.y - ref.imgY)) {
            imgPt.y = ref.imgY;
          } else {
            imgPt.x = ref.imgX;
          }
        }
        state.calibratePoints.push({ imgX: imgPt.x, imgY: imgPt.y });
        state.calPointSelected = state.calibratePoints.length - 1;
        if (state.calibratePoints.length === 2) {
          document.getElementById('btn-cal-step2-ok').disabled = false;
        }
        render();
      } else {
        state.calPointSelected = -1;
        startPanDrag(e);
        render();
      }
      e.preventDefault();
      return;
    }

    // ── Calibration Step 1 (drag reference line) ──
    if (state.calibrateStep === 1) {
      state.refDragging   = true;
      state.refDragStartX = e.clientX;
      state.refDragStartY = e.clientY;
      state.refPanStartX  = state.refLineX;
      state.refPanStartY  = state.refLineY;
      viewport.classList.add('dragging');
      e.preventDefault();
      return;
    }

    // ── Normal pan (left or middle button) ──
    if (e.button === 0 || e.button === 1) {
      startPanDrag(e);
    }
  });

  // ── Mousemove (global) ──
  window.addEventListener('mousemove', (e) => {
    // Measure point drag
    if (state.measureDragging >= 0) {
      const rect = viewport.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const imgPt = screenToImg(mx, my);
      const mi = Math.floor(state.measureDragging / 10);
      const pi = state.measureDragging % 10;
      if (state.measurements[mi]) {
        const pt = pi === 0 ? state.measurements[mi].p1 : state.measurements[mi].p2;
        if (pt) { pt.imgX = imgPt.x; pt.imgY = imgPt.y; }
      }
      render();
      return;
    }

    // Calibration point drag (step 2)
    if (state.calPointDragging >= 0 && state.calibrateStep === 2) {
      const rect = viewport.getBoundingClientRect();
      let imgPt = screenToImg(e.clientX - rect.left, e.clientY - rect.top);

      if (e.shiftKey && state.calibratePoints.length === 2) {
        const otherIdx = state.calPointDragging === 0 ? 1 : 0;
        const ref = state.calibratePoints[otherIdx];
        if (Math.abs(imgPt.x - ref.imgX) > Math.abs(imgPt.y - ref.imgY)) {
          imgPt.y = ref.imgY;
        } else {
          imgPt.x = ref.imgX;
        }
      }

      state.calibratePoints[state.calPointDragging].imgX = imgPt.x;
      state.calibratePoints[state.calPointDragging].imgY = imgPt.y;
      render();
      return;
    }

    // Reference line drag
    if (state.refDragging) {
      state.refLineX = state.refPanStartX + (e.clientX - state.refDragStartX);
      state.refLineY = state.refPanStartY + (e.clientY - state.refDragStartY);
      render();
      return;
    }

    // Normal pan drag
    if (!state.dragging) return;
    state.panX = state.panStartX + (e.clientX - state.dragStartX);
    state.panY = state.panStartY + (e.clientY - state.dragStartY);
    render();
  });

  // ── Mouseup (global) ──
  window.addEventListener('mouseup', () => {
    if (state.measureDragging >= 0) {
      state.measureDragging = -1;
      viewport.classList.remove('dragging');
      render();
      return;
    }
    if (state.calPointDragging >= 0) {
      state.calPointDragging = -1;
      viewport.classList.remove('dragging');
      render();
      return;
    }
    if (state.refDragging) {
      state.refDragging = false;
      viewport.classList.remove('dragging');
      return;
    }
    if (state.dragging) {
      state.dragging = false;
      viewport.classList.remove('dragging');
      saveState();
    }
  });
}

// ── Helper ───────────────────────────────────────────────────
function startPanDrag(e) {
  state.dragging   = true;
  state.dragStartX = e.clientX;
  state.dragStartY = e.clientY;
  state.panStartX  = state.panX;
  state.panStartY  = state.panY;
  viewport.classList.add('dragging');
  e.preventDefault();
}

