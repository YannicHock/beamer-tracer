// ============================================================
//  Beamer Tracer – Utility Functions
// ============================================================

/**
 * @module renderer/core/utils
 * @description Allgemeine Hilfsfunktionen für Beamer Tracer.
 *
 * Enthält reine Utility-Funktionen ohne Seiteneffekte:
 * - Farbkonvertierung (Hex → RGBA)
 * - Koordinaten-Transformation zwischen Bild- und Screen-Koordinaten
 */

import state from './state.js';

/**
 * Konvertiert einen Hex-Farbwert und eine Deckkraft in einen `rgba()`-CSS-String.
 *
 * @param {string} hex - Hex-Farbwert im Format '#RRGGBB' (z.B. '#ff00aa')
 * @param {number} opacity - Deckkraft im Bereich 0.0–1.0
 * @returns {string} CSS-rgba-String, z.B. 'rgba(255, 0, 170, 0.5)'
 *
 * @example
 * hexToRgba('#ff0000', 0.5) // → 'rgba(255, 0, 0, 0.5)'
 */
export function hexToRgba(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Rechnet Bild-Pixel-Koordinaten in Screen-Pixel-Koordinaten um.
 *
 * Formel: `screenX = imgX * zoom + panX`
 *
 * @param {number} imgX - X-Koordinate im Bild (0 = linker Rand)
 * @param {number} imgY - Y-Koordinate im Bild (0 = oberer Rand)
 * @returns {{ x: number, y: number }} Screen-Pixel-Koordinaten
 *
 * @example
 * // Bei zoom=2, panX=100, panY=50:
 * imgToScreen(10, 20) // → { x: 120, y: 90 }
 */
export function imgToScreen(imgX, imgY) {
  return { x: imgX * state.zoom + state.panX, y: imgY * state.zoom + state.panY };
}

/**
 * Rechnet Screen-Pixel-Koordinaten in Bild-Pixel-Koordinaten um.
 *
 * Formel: `imgX = (screenX - panX) / zoom`
 *
 * Dies ist die Umkehrfunktion von {@link imgToScreen}.
 *
 * @param {number} sx - X-Koordinate auf dem Screen/Canvas
 * @param {number} sy - Y-Koordinate auf dem Screen/Canvas
 * @returns {{ x: number, y: number }} Bild-Pixel-Koordinaten
 *
 * @example
 * // Bei zoom=2, panX=100, panY=50:
 * screenToImg(120, 90) // → { x: 10, y: 20 }
 */
export function screenToImg(sx, sy) {
  return { x: (sx - state.panX) / state.zoom, y: (sy - state.panY) / state.zoom };
}
