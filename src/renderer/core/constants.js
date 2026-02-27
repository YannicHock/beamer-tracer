// ============================================================
//  Beamer Tracer – Constants
// ============================================================

export const PAN_FINE = 1;
export const PAN_NORMAL = 5;
export const PAN_COARSE = 50;
export const ZOOM_STEP = 0.01;

export const REF_BASE_PX = 400;
export const CAL_POINT_RADIUS = 10;
export const MEASURE_POINT_RADIUS = 10;

export const OVERLAY_KEYS = ['grid', 'center', 'thirds', 'crosshair'];

export const DEFAULT_OVERLAY_STYLES = Object.freeze({
  grid:      { color: '#ffffff', opacity: 0.18, width: 0.5 },
  center:    { color: '#00ff00', opacity: 0.6,  width: 1 },
  thirds:    { color: '#0096ff', opacity: 0.5,  width: 1 },
  crosshair: { color: '#ffffff', opacity: 0.45, width: 0.75 },
});

