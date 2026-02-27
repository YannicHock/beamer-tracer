/**
 * @module renderer/core/dom
 * @description Gecachte DOM-Element-Referenzen.
 *
 * Alle häufig verwendeten DOM-Elemente werden hier einmalig per
 * `document.getElementById()` abgerufen und als benannte Exporte
 * bereitgestellt. Das vermeidet wiederholte DOM-Lookups und
 * zentralisiert die Referenzen an einer Stelle.
 *
 * **Konvention:** Feature-spezifische DOM-Elemente, die nur in einem
 * einzelnen Feature verwendet werden, können dort direkt abgefragt werden.
 * Elemente, die in mehreren Modulen gebraucht werden, gehören hierher.
 */

/** @type {HTMLCanvasElement} Canvas für das Bild-Rendering (untere Schicht) */
export const canvasImage   = document.getElementById('canvas-image');
/** @type {HTMLCanvasElement} Canvas für Overlays, Hilfslinien und UI-Elemente (obere Schicht) */
export const canvasOverlay = document.getElementById('canvas-overlay');
/** @type {CanvasRenderingContext2D} 2D-Kontext des Bild-Canvas */
export const ctxImg        = canvasImage.getContext('2d');
/** @type {CanvasRenderingContext2D} 2D-Kontext des Overlay-Canvas */
export const ctxOvl        = canvasOverlay.getContext('2d');
/** @type {HTMLDivElement} Viewport-Container (enthält beide Canvas-Elemente) */
export const viewport      = document.getElementById('viewport');
/** @type {HTMLSpanElement} Anzeige des aktuellen Zoom-Werts in der Toolbar */
export const zoomDisplay   = document.getElementById('zoom-display');
/** @type {HTMLSpanElement} Anzeige des Maßstabs (px/cm) in der Toolbar */
export const scaleDisplay  = document.getElementById('scale-display');
/** @type {HTMLSpanElement} Anzeige des Kontrast-Werts in der Toolbar */
export const contrastDisp  = document.getElementById('contrast-display');
/** @type {HTMLSpanElement} Anzeige des Helligkeits-Werts in der Toolbar */
export const brightnessDisp = document.getElementById('brightness-display');
/** @type {HTMLDivElement} Toolbar-Leiste am oberen Bildschirmrand */
export const toolbar       = document.getElementById('toolbar');
/** @type {HTMLDivElement} Benutzerdefiniertes Kontextmenü-Element */
export const contextMenu   = document.getElementById('context-menu');
/** @type {HTMLDivElement} Unsichtbare Trigger-Zone für Toolbar im Vollbild */
export const fullscreenTrigger = document.getElementById('fullscreen-trigger');

