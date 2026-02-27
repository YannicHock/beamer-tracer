// ============================================================
//  Beamer Tracer – DOM References
// ============================================================

export const canvasImage   = document.getElementById('canvas-image');
export const canvasOverlay = document.getElementById('canvas-overlay');
export const ctxImg        = canvasImage.getContext('2d');
export const ctxOvl        = canvasOverlay.getContext('2d');
export const viewport      = document.getElementById('viewport');
export const zoomDisplay   = document.getElementById('zoom-display');
export const scaleDisplay  = document.getElementById('scale-display');
export const contrastDisp  = document.getElementById('contrast-display');
export const brightnessDisp = document.getElementById('brightness-display');
export const toolbar       = document.getElementById('toolbar');
export const contextMenu   = document.getElementById('context-menu');
export const fullscreenTrigger = document.getElementById('fullscreen-trigger');

