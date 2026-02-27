// ============================================================
//  Beamer Tracer – Utility Functions
// ============================================================

import state from './state.js';

/**
 * Convert hex color + opacity to an rgba() string.
 * @param {string} hex  e.g. '#ff00aa'
 * @param {number} opacity  0..1
 * @returns {string}
 */
export function hexToRgba(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Image-pixel → screen-pixel.
 */
export function imgToScreen(imgX, imgY) {
  return { x: imgX * state.zoom + state.panX, y: imgY * state.zoom + state.panY };
}

/**
 * Screen-pixel → image-pixel.
 */
export function screenToImg(sx, sy) {
  return { x: (sx - state.panX) / state.zoom, y: (sy - state.panY) / state.zoom };
}

