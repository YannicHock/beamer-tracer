// ============================================================
//  Beamer Tracer – Central State
// ============================================================

import { DEFAULT_OVERLAY_STYLES } from './constants.js';

/** @type {HTMLImageElement | null} */
let img = null;
/** @type {string | null} */
let imgSrc = null;

const state = {
  // ── Image ──
  get img() { return img; },
  set img(v) { img = v; },
  get imgSrc() { return imgSrc; },
  set imgSrc(v) { imgSrc = v; },

  // ── Viewport ──
  zoom: 1.0,
  panX: 0,
  panY: 0,

  // ── Filters ──
  contrast: 100,
  brightness: 100,

  // ── Overlays ──
  overlays: { grid: false, center: false, thirds: false, ruler: false, crosshair: true },
  gridSize: 50,
  gridSizeCm: 5,

  overlayStyles: {
    grid:      { ...DEFAULT_OVERLAY_STYLES.grid },
    center:    { ...DEFAULT_OVERLAY_STYLES.center },
    thirds:    { ...DEFAULT_OVERLAY_STYLES.thirds },
    crosshair: { ...DEFAULT_OVERLAY_STYLES.crosshair },
  },

  // ── Crosshair ──
  crosshairMouseX: -1,
  crosshairMouseY: -1,

  // ── Calibration ──
  calibrateStep: 0,       // 0=inactive, 1=reference line, 2=points
  calibratePoints: [],
  refLineX: 0,
  refLineY: 0,
  refLineZoom: 1.0,
  screenPxPerMeter: null,
  calibratedZoom: null,
  calibratedPanX: null,
  calibratedPanY: null,
  calPointDragging: -1,
  calPointSelected: -1,
  calibration: { pxPerCm: null },

  // ── Measurement ──
  measureActive: false,
  measurements: [],
  measureCurrentIdx: -1,
  measureDragging: -1,

  // ── Drag (image pan) ──
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  panStartX: 0,
  panStartY: 0,

  // ── Drag (reference line step 1) ──
  refDragging: false,
  refDragStartX: 0,
  refDragStartY: 0,
  refPanStartX: 0,
  refPanStartY: 0,

  // ── Fullscreen ──
  isFullscreen: false,
  fullscreenToolbarTimeout: null,
};

export default state;

