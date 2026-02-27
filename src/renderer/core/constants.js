// ============================================================
//  Beamer Tracer – Constants
// ============================================================

/**
 * @module renderer/core/constants
 * @description Anwendungsweite Konstanten für Beamer Tracer.
 *
 * Enthält alle magischen Zahlen, die in der Anwendung verwendet werden,
 * an einem zentralen Ort. Änderungen hier wirken sich auf das gesamte
 * Verhalten der App aus.
 */

/** @constant {number} Fein-Pan-Schrittweite in Pixel (Shift + Pfeiltaste) */
export const PAN_FINE = 1;
/** @constant {number} Normal-Pan-Schrittweite in Pixel (Pfeiltaste) */
export const PAN_NORMAL = 5;
/** @constant {number} Grob-Pan-Schrittweite in Pixel (Ctrl + Pfeiltaste) */
export const PAN_COARSE = 50;
/** @constant {number} Zoom-Schrittweite pro Tastendruck (1% = 0.01) */
export const ZOOM_STEP = 0.01;

/**
 * Basislänge der Kalibrierungs-Referenzlinie in Screen-Pixeln bei Zoom 1.0.
 * Die tatsächliche Länge ist `REF_BASE_PX * state.refLineZoom`.
 * Repräsentiert 1 Meter auf der Projektionsfläche.
 * @constant {number}
 */
export const REF_BASE_PX = 400;

/**
 * Klick-Radius für Kalibrierpunkte in Screen-Pixeln.
 * Innerhalb dieses Radius wird ein Klick als Treffer auf den Punkt gewertet.
 * @constant {number}
 */
export const CAL_POINT_RADIUS = 10;

/**
 * Klick-Radius für Messpunkte in Screen-Pixeln.
 * Innerhalb dieses Radius wird ein Klick als Treffer auf den Punkt gewertet.
 * @constant {number}
 */
export const MEASURE_POINT_RADIUS = 10;

/**
 * Schlüssel aller konfigurierbaren Overlay-Typen.
 * Wird für die Schleife über Settings-Inputs verwendet.
 * @constant {string[]}
 */
export const OVERLAY_KEYS = ['grid', 'center', 'thirds', 'crosshair'];

/**
 * Standard-Overlay-Stile (Farbe, Deckkraft, Linienstärke).
 * Werden beim Reset im Settings-Panel wiederhergestellt.
 *
 * @typedef {Object} OverlayStyle
 * @property {string} color - Hex-Farbwert (z.B. '#ffffff')
 * @property {number} opacity - Deckkraft (0.0–1.0)
 * @property {number} width - Linienstärke in Pixel
 *
 * @constant {Readonly<{grid: OverlayStyle, center: OverlayStyle, thirds: OverlayStyle, crosshair: OverlayStyle}>}
 */
export const DEFAULT_OVERLAY_STYLES = Object.freeze({
  grid:      { color: '#ffffff', opacity: 0.18, width: 0.5 },
  center:    { color: '#00ff00', opacity: 0.6,  width: 1 },
  thirds:    { color: '#0096ff', opacity: 0.5,  width: 1 },
  crosshair: { color: '#ffffff', opacity: 0.45, width: 0.75 },
});
