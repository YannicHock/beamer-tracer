// ============================================================
//  Beamer Tracer – Renderer
// ============================================================

const canvasImage   = document.getElementById('canvas-image');
const canvasOverlay = document.getElementById('canvas-overlay');
const ctxImg        = canvasImage.getContext('2d');
const ctxOvl        = canvasOverlay.getContext('2d');
const viewport      = document.getElementById('viewport');
const zoomDisplay   = document.getElementById('zoom-display');
const scaleDisplay  = document.getElementById('scale-display');
const contrastDisp  = document.getElementById('contrast-display');
const brightnessDisp= document.getElementById('brightness-display');

// ── State ────────────────────────────────────────────────────
let img        = null;
let imgSrc     = null;
let zoom       = 1.0;
let panX       = 0;
let panY       = 0;

const PAN_FINE   = 1;
const PAN_NORMAL = 5;
const PAN_COARSE = 50;
const ZOOM_STEP  = 0.01;

let contrast   = 100;
let brightness = 100;

let overlays = { grid: false, center: false, thirds: false, ruler: false, crosshair: true };
let gridSize = 50;
let gridSizeCm = 5;   // Rasterweite in cm (wenn kalibriert)

// ── Overlay-Stil-Konfiguration ───────────────────────────────
let overlayStyles = {
  grid:      { color: '#ffffff', opacity: 0.18, width: 0.5 },
  center:    { color: '#00ff00', opacity: 0.6,  width: 1   },
  thirds:    { color: '#0096ff', opacity: 0.5,  width: 1   },
  crosshair: { color: '#ffffff', opacity: 0.45, width: 0.75 },
};

// ── Fadenkreuz-Overlay ───────────────────────────────────────
let crosshairMouseX = -1;   // aktuelle Mausposition (Viewport-relativ)
let crosshairMouseY = -1;

// ── Kalibrierung ─────────────────────────────────────────────
// Schritt 1: Referenzlinie (1 m) auf Overlay – eigene Position & Zoom
// Schritt 2: 2 Punkte auf dem Bild, cm-Eingabe → auto-Zoom
let calibrateStep    = 0;      // 0=inaktiv, 1=Referenzlinie, 2=Punkte
let calibratePoints  = [];

// Referenzlinie (Schritt 1) – eigener Zustand, unabhängig vom Bild
let refLineX     = 0;         // Mitte X (Screen-px)
let refLineY     = 0;         // Mitte Y (Screen-px)
let refLineZoom  = 1.0;       // Zoom-Faktor der Referenzlinie
const REF_BASE_PX = 400;      // Basis-Breite bei refLineZoom=1 (px)

// Ergebnis Schritt 1: Screen-Pixel pro echtem Meter
let screenPxPerMeter = null;

// Ergebnis Schritt 2: kalibrierter Bild-Zoom + Pan
let calibratedZoom = null;
let calibratedPanX = null;
let calibratedPanY = null;

// Drag von Kalibrierpunkten (Schritt 2)
let calPointDragging   = -1;   // Index des aktuell gezogenen Punktes (-1=keiner)
let calPointSelected   = -1;   // Index des zuletzt ausgewählten Punktes
const CAL_POINT_RADIUS = 10;   // Klick-Radius zum Greifen eines Punktes

// Legacy (für Ruler-Overlay)
let calibration = { pxPerCm: null };

// ── Hilfs-Funktion: Hex-Farbe + Opacity → rgba-String ────────
function hexToRgba(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ── Koordinaten-Umrechnung (Bild ↔ Screen) ──────────────────
function imgToScreen(imgX, imgY) {
  return { x: imgX * zoom + panX, y: imgY * zoom + panY };
}
function screenToImg(sx, sy) {
  return { x: (sx - panX) / zoom, y: (sy - panY) / zoom };
}

// Drag
let dragging   = false;
let dragStartX = 0;
let dragStartY = 0;
let panStartX  = 0;
let panStartY  = 0;

// Drag für Referenzlinie (Schritt 1)
let refDragging   = false;
let refDragStartX = 0;
let refDragStartY = 0;
let refPanStartX  = 0;
let refPanStartY  = 0;

// ── Restore aus persistenter Datei (+ localStorage Fallback) ─
(async function restoreState() {
  try {
    // Zuerst aus der Datei lesen (überlebt Restarts sicher)
    let saved = null;
    if (window.electronAPI && window.electronAPI.readConfig) {
      saved = await window.electronAPI.readConfig();
    }
    // Fallback: localStorage (für Migration alter Daten)
    if (!saved) {
      const raw = localStorage.getItem('beamer-tracer-state');
      if (raw) saved = JSON.parse(raw);
    }
    if (!saved) return;

    zoom       = saved.zoom       ?? zoom;
    panX       = saved.panX       ?? panX;
    panY       = saved.panY       ?? panY;
    contrast   = saved.contrast   ?? contrast;
    brightness = saved.brightness ?? brightness;
    gridSize   = saved.gridSize   ?? gridSize;
    gridSizeCm = saved.gridSizeCm ?? gridSizeCm;
    if (saved.overlayStyles) {
      for (const key of Object.keys(overlayStyles)) {
        if (saved.overlayStyles[key]) {
          overlayStyles[key] = { ...overlayStyles[key], ...saved.overlayStyles[key] };
        }
      }
    }
    if (saved.screenPxPerMeter) screenPxPerMeter = saved.screenPxPerMeter;
    if (saved.pxPerCm) calibration.pxPerCm = saved.pxPerCm;
    if (saved.calibratedZoom != null) {
      calibratedZoom = saved.calibratedZoom;
      calibratedPanX = saved.calibratedPanX ?? null;
      calibratedPanY = saved.calibratedPanY ?? null;
    }
    if (saved.imgSrc) {
      imgSrc = saved.imgSrc;
      img = new Image();
      img.onload = () => { render(); updateCalibrationButtons(); };
      img.src = imgSrc;
    }

    // UI-Elemente synchronisieren
    document.getElementById('input-grid-size').value = gridSize;
    document.getElementById('input-grid-size-cm').value = gridSizeCm;
    updateGridInputVisibility();
    document.getElementById('slider-contrast').value = contrast;
    document.getElementById('slider-brightness').value = brightness;
    contrastDisp.textContent = `${contrast}%`;
    brightnessDisp.textContent = `${brightness}%`;

    updateCalibrationButtons();
    render();
  } catch (_) { /* ignore */ }
})();

function saveState() {
  const data = {
    zoom, panX, panY, contrast, brightness, gridSize, gridSizeCm,
    overlayStyles,
    screenPxPerMeter,
    pxPerCm: calibration.pxPerCm,
    calibratedZoom, calibratedPanX, calibratedPanY,
    imgSrc,
  };
  // localStorage als schneller Cache
  try {
    localStorage.setItem('beamer-tracer-state', JSON.stringify(data));
  } catch (_) { /* quota exceeded */ }
  // Persistente Datei (überlebt Restarts sicher)
  if (window.electronAPI && window.electronAPI.writeConfig) {
    window.electronAPI.writeConfig(data);
  }
}

// ── Canvas Resize ────────────────────────────────────────────
function resizeCanvases() {
  canvasImage.width    = viewport.clientWidth;
  canvasImage.height   = viewport.clientHeight;
  canvasOverlay.width  = viewport.clientWidth;
  canvasOverlay.height = viewport.clientHeight;
  render();
}
window.addEventListener('resize', resizeCanvases);

// ── Bild laden ───────────────────────────────────────────────
function loadImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    imgSrc = e.target.result;
    img = new Image();
    img.onload = () => {
      zoom = 1.0;
      panX = (canvasImage.width  - img.width)  / 2;
      panY = (canvasImage.height - img.height) / 2;
      render();
      saveState();
    };
    img.src = imgSrc;
  };
  reader.readAsDataURL(file);
}

// Drag & Drop
document.body.addEventListener('dragover', (e) => e.preventDefault());
document.body.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImageFile(file);
});

// Button
document.getElementById('btn-load').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => { if (input.files[0]) loadImageFile(input.files[0]); };
  input.click();
});

// ── Rendering ────────────────────────────────────────────────
function render() {
  renderImage();
  renderOverlay();
}

function renderImage() {
  const w = canvasImage.width;
  const h = canvasImage.height;
  ctxImg.clearRect(0, 0, w, h);
  if (!img) return;

  ctxImg.filter = `contrast(${contrast}%) brightness(${brightness}%)`;

  ctxImg.save();
  ctxImg.translate(panX, panY);
  ctxImg.scale(zoom, zoom);
  ctxImg.drawImage(img, 0, 0);
  ctxImg.restore();

  ctxImg.filter = 'none';

  const zoomPct = Math.round(zoom * 100);
  if (calibratedZoom !== null && Math.abs(zoom - calibratedZoom) < 0.0001) {
    zoomDisplay.textContent = `${zoomPct}% 🎯`;
  } else {
    zoomDisplay.textContent = `${zoomPct}%`;
  }
}

function renderOverlay() {
  const w = canvasOverlay.width;
  const h = canvasOverlay.height;
  ctxOvl.clearRect(0, 0, w, h);

  // ── Bild-Bounding-Box (Screen-Koordinaten) ──
  const imgX0 = img ? panX : 0;
  const imgY0 = img ? panY : 0;
  const imgW  = img ? img.width  * zoom : w;
  const imgH  = img ? img.height * zoom : h;

  // ── Standard-Overlays (relativ zum Bild) ──
  if (overlays.grid) {
    drawGrid(w, h, imgX0, imgY0, imgW, imgH);
  }

  if (overlays.center) {
    const cs = overlayStyles.center;
    ctxOvl.strokeStyle = hexToRgba(cs.color, cs.opacity);
    ctxOvl.lineWidth = cs.width;
    ctxOvl.beginPath();
    ctxOvl.moveTo(imgX0 + imgW / 2, imgY0); ctxOvl.lineTo(imgX0 + imgW / 2, imgY0 + imgH);
    ctxOvl.moveTo(imgX0, imgY0 + imgH / 2); ctxOvl.lineTo(imgX0 + imgW, imgY0 + imgH / 2);
    ctxOvl.stroke();
  }

  if (overlays.thirds) {
    const ts = overlayStyles.thirds;
    ctxOvl.strokeStyle = hexToRgba(ts.color, ts.opacity);
    ctxOvl.lineWidth = ts.width;
    ctxOvl.setLineDash([10, 5]);
    ctxOvl.beginPath();
    for (let i = 1; i <= 2; i++) {
      ctxOvl.moveTo(imgX0 + (imgW / 3) * i, imgY0); ctxOvl.lineTo(imgX0 + (imgW / 3) * i, imgY0 + imgH);
      ctxOvl.moveTo(imgX0, imgY0 + (imgH / 3) * i); ctxOvl.lineTo(imgX0 + imgW, imgY0 + (imgH / 3) * i);
    }
    ctxOvl.stroke();
    ctxOvl.setLineDash([]);
  }

  if (overlays.ruler) {
    drawRuler();
  }

  // ── Kalibrierung Schritt 1: Referenzlinie ──
  if (calibrateStep === 1) {
    drawReferenceLine();
  }

  // ── Kalibrierung Schritt 2: Punkte + Hilfslinie ──
  if (calibrateStep === 2 && calibratePoints.length > 0) {
    ctxOvl.lineWidth = 2;

    // Punkte in Screen-Koordinaten umrechnen
    const screenPts = calibratePoints.map(pt => imgToScreen(pt.imgX, pt.imgY));

    // Hilfslinie zwischen den Punkten (auch während Drag)
    if (screenPts.length === 2) {
      // Gestrichelte Hilfslinie
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

      // Durchgezogene Verbindungslinie
      ctxOvl.strokeStyle = 'rgba(255, 100, 0, 0.9)';
      ctxOvl.lineWidth = 2;
      ctxOvl.beginPath();
      ctxOvl.moveTo(screenPts[0].x, screenPts[0].y);
      ctxOvl.lineTo(screenPts[1].x, screenPts[1].y);
      ctxOvl.stroke();

      // Pixel-Distanz auf dem Screen anzeigen
      const dx = screenPts[1].x - screenPts[0].x;
      const dy = screenPts[1].y - screenPts[0].y;
      const screenDist = Math.sqrt(dx * dx + dy * dy);
      const midX = (screenPts[0].x + screenPts[1].x) / 2;
      const midY = (screenPts[0].y + screenPts[1].y) / 2;
      ctxOvl.font = '13px monospace';
      ctxOvl.fillStyle = 'rgba(255, 100, 0, 0.9)';
      ctxOvl.fillText(`${Math.round(screenDist)} px`, midX + 8, midY - 8);
    }

    // Punkte zeichnen
    for (let i = 0; i < screenPts.length; i++) {
      const pt = screenPts[i];
      const isSelected = (i === calPointSelected);

      // Ausgewählter Punkt: größerer Ring
      if (isSelected) {
        ctxOvl.strokeStyle = 'rgba(255, 255, 0, 0.9)';
        ctxOvl.lineWidth = 2;
        ctxOvl.beginPath();
        ctxOvl.arc(pt.x, pt.y, CAL_POINT_RADIUS, 0, Math.PI * 2);
        ctxOvl.stroke();
      }

      // Punkt füllen
      ctxOvl.fillStyle = isSelected ? 'rgba(255, 200, 0, 0.95)' : 'rgba(255, 100, 0, 0.9)';
      ctxOvl.beginPath();
      ctxOvl.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctxOvl.fill();

      // Label (P1 / P2)
      ctxOvl.font = 'bold 12px monospace';
      ctxOvl.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctxOvl.fillText(`P${i + 1}`, pt.x + 10, pt.y - 10);
    }
  }

  // ── Fadenkreuz-Overlay ──
  if (overlays.crosshair && crosshairMouseX >= 0 && crosshairMouseY >= 0) {
    drawCrosshair(w, h);
  }
}

// ── Raster zeichnen ──────────────────────────────────────────
function drawGrid(w, h, imgX0, imgY0, imgW, imgH) {
  const hasCal = calibration.pxPerCm != null && calibration.pxPerCm > 0;

  // Bestimme den Rasterabstand in Screen-Pixeln
  let stepScreen;
  let labelStep;  // Schrittwert in der Beschriftungseinheit

  if (hasCal) {
    // Kalibriert: gridSizeCm in cm → Bild-Pixel → Screen-Pixel
    const stepImgPx = gridSizeCm * calibration.pxPerCm;
    stepScreen = stepImgPx * zoom;
    labelStep = gridSizeCm;
  } else {
    // Unkalibriert: gridSize ist direkt in Bild-Pixeln
    stepScreen = gridSize * zoom;
    labelStep = gridSize;
  }

  // Mindestabstand: wenn Rasterlinien < 5px Abstand haben, überspringen
  if (stepScreen < 5) return;

  ctxOvl.save();
  const gs = overlayStyles.grid;
  ctxOvl.strokeStyle = hexToRgba(gs.color, gs.opacity);
  ctxOvl.lineWidth = gs.width;

  // Clipping auf den sichtbaren Bereich des Canvas
  const visLeft   = Math.max(0, imgX0);
  const visTop    = Math.max(0, imgY0);
  const visRight  = Math.min(w, imgX0 + imgW);
  const visBottom = Math.min(h, imgY0 + imgH);

  if (visRight <= visLeft || visBottom <= visTop) {
    ctxOvl.restore();
    return;
  }

  // Bestimme den Index der ersten/letzten sichtbaren Linie
  // Vertikale Linien (x)
  const firstIdxX = Math.ceil((visLeft - imgX0) / stepScreen);
  const lastIdxX  = Math.floor((visRight - imgX0) / stepScreen);

  // Horizontale Linien (y)
  const firstIdxY = Math.ceil((visTop - imgY0) / stepScreen);
  const lastIdxY  = Math.floor((visBottom - imgY0) / stepScreen);

  // Vertikale Rasterlinien
  ctxOvl.beginPath();
  for (let i = firstIdxX; i <= lastIdxX; i++) {
    const x = imgX0 + i * stepScreen;
    ctxOvl.moveTo(x, visTop);
    ctxOvl.lineTo(x, visBottom);
  }
  ctxOvl.stroke();

  // Horizontale Rasterlinien
  ctxOvl.beginPath();
  for (let j = firstIdxY; j <= lastIdxY; j++) {
    const y = imgY0 + j * stepScreen;
    ctxOvl.moveTo(visLeft, y);
    ctxOvl.lineTo(visRight, y);
  }
  ctxOvl.stroke();

  // ── Beschriftungen am Rand (nur wenn kalibriert) ──
  if (hasCal) {
    const labelOpacity = Math.min(1, gs.opacity + 0.25);
    ctxOvl.font = '10px monospace';
    ctxOvl.fillStyle = hexToRgba(gs.color, labelOpacity);
    ctxOvl.textBaseline = 'bottom';

    // Vertikale Linien → Beschriftung oben
    for (let i = firstIdxX; i <= lastIdxX; i++) {
      if (i === 0) continue;  // Ursprung überspringen
      const x = imgX0 + i * stepScreen;
      const labelVal = (i * labelStep).toFixed(labelStep % 1 === 0 ? 0 : 1);
      ctxOvl.textAlign = 'center';
      const labelY = Math.max(visTop + 12, imgY0 + 12);
      ctxOvl.fillText(`${labelVal}`, x, labelY);
    }

    // Horizontale Linien → Beschriftung links
    ctxOvl.textAlign = 'left';
    ctxOvl.textBaseline = 'middle';
    for (let j = firstIdxY; j <= lastIdxY; j++) {
      if (j === 0) continue;
      const y = imgY0 + j * stepScreen;
      const labelVal = (j * labelStep).toFixed(labelStep % 1 === 0 ? 0 : 1);
      const labelX = Math.max(visLeft + 3, imgX0 + 3);
      ctxOvl.fillText(`${labelVal}`, labelX, y);
    }

    // Einheiten-Beschriftung am Ursprung
    if (imgX0 >= 0 && imgX0 < w && imgY0 >= 0 && imgY0 < h) {
      ctxOvl.textAlign = 'left';
      ctxOvl.textBaseline = 'top';
      ctxOvl.fillStyle = hexToRgba(gs.color, Math.min(1, gs.opacity + 0.2));
      ctxOvl.fillText('cm', imgX0 + 3, imgY0 + 3);
    }
  }

  ctxOvl.restore();
}

// ── Referenzlinie zeichnen (Schritt 1) ───────────────────────
function drawReferenceLine() {
  const lineW = REF_BASE_PX * refLineZoom;
  const x1 = refLineX - lineW / 2;
  const x2 = refLineX + lineW / 2;
  const y  = refLineY;
  const tickH = 14;

  ctxOvl.save();
  ctxOvl.strokeStyle = '#ff0';
  ctxOvl.fillStyle   = '#ff0';
  ctxOvl.lineWidth   = 3;
  ctxOvl.shadowColor = 'rgba(0,0,0,0.7)';
  ctxOvl.shadowBlur  = 4;

  // Hauptlinie
  ctxOvl.beginPath();
  ctxOvl.moveTo(x1, y);
  ctxOvl.lineTo(x2, y);
  ctxOvl.stroke();

  // Endstriche
  ctxOvl.beginPath();
  ctxOvl.moveTo(x1, y - tickH); ctxOvl.lineTo(x1, y + tickH);
  ctxOvl.moveTo(x2, y - tickH); ctxOvl.lineTo(x2, y + tickH);
  ctxOvl.stroke();

  // 10-cm-Striche (10 Segmente)
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
  ctxOvl.fillText('← 1 Meter →', refLineX, y - tickH - 8);

  // Zoom-Info
  ctxOvl.font = '12px monospace';
  ctxOvl.fillStyle = 'rgba(255,255,0,0.7)';
  ctxOvl.fillText(`Linien-Zoom: ${Math.round(refLineZoom * 100)}%  |  ${Math.round(lineW)} px`, refLineX, y + tickH + 20);

  ctxOvl.restore();
}

function drawRuler() {
  const w = canvasOverlay.width;
  const h = canvasOverlay.height;
  const startX = 20;
  const startY = h - 50;

  ctxOvl.strokeStyle = 'rgba(255, 255, 0, 0.85)';
  ctxOvl.fillStyle   = 'rgba(255, 255, 0, 0.85)';
  ctxOvl.lineWidth   = 2;
  ctxOvl.font        = '13px monospace';

  if (calibration.pxPerCm) {
    const refCm   = 10;
    const rulerPx = refCm * calibration.pxPerCm * zoom;

    ctxOvl.beginPath();
    ctxOvl.moveTo(startX, startY);
    ctxOvl.lineTo(startX + rulerPx, startY);
    ctxOvl.moveTo(startX, startY - 8); ctxOvl.lineTo(startX, startY + 8);
    ctxOvl.moveTo(startX + rulerPx, startY - 8); ctxOvl.lineTo(startX + rulerPx, startY + 8);
    for (let i = 1; i < refCm; i++) {
      const cx = startX + i * calibration.pxPerCm * zoom;
      ctxOvl.moveTo(cx, startY - 4); ctxOvl.lineTo(cx, startY + 4);
    }
    ctxOvl.stroke();
    ctxOvl.fillText(`${refCm} cm (kalibriert)`, startX, startY - 14);

    scaleDisplay.textContent = `📏 ${calibration.pxPerCm.toFixed(1)} px/cm`;
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

// ── Fadenkreuz zeichnen ──────────────────────────────────────
function drawCrosshair(w, h) {
  const mx = crosshairMouseX;
  const my = crosshairMouseY;

  ctxOvl.save();

  // Gestrichelte halbtransparente Linien
  const chs = overlayStyles.crosshair;
  ctxOvl.strokeStyle = hexToRgba(chs.color, chs.opacity);
  ctxOvl.lineWidth = chs.width;
  ctxOvl.setLineDash([6, 4]);

  // Horizontale Linie
  ctxOvl.beginPath();
  ctxOvl.moveTo(0, my);
  ctxOvl.lineTo(w, my);
  ctxOvl.stroke();

  // Vertikale Linie
  ctxOvl.beginPath();
  ctxOvl.moveTo(mx, 0);
  ctxOvl.lineTo(mx, h);
  ctxOvl.stroke();

  ctxOvl.setLineDash([]);

  // ── Koordinaten-Anzeige neben dem Cursor ──
  if (img) {
    // Bild-Pixel berechnen (inverse Transformation)
    const imgPxX = (mx - panX) / zoom;
    const imgPxY = (my - panY) / zoom;

    // Prüfen ob innerhalb des Bildes
    const insideImage = imgPxX >= 0 && imgPxX < img.width && imgPxY >= 0 && imgPxY < img.height;

    let label = `${Math.round(imgPxX)}, ${Math.round(imgPxY)} px`;
    if (calibration.pxPerCm && calibration.pxPerCm > 0) {
      const cmX = (imgPxX / calibration.pxPerCm).toFixed(1);
      const cmY = (imgPxY / calibration.pxPerCm).toFixed(1);
      label += `  (${cmX}, ${cmY} cm)`;
    }

    // Position: rechts-unterhalb vom Cursor, mit Padding
    const offsetX = 14;
    const offsetY = 20;
    let labelX = mx + offsetX;
    let labelY = my + offsetY;

    // Textgröße messen für Hintergrundbox
    ctxOvl.font = '12px monospace';
    const tm = ctxOvl.measureText(label);
    const textW = tm.width + 8;
    const textH = 18;

    // Am Rand umklappen, damit Label nicht aus dem Canvas ragt
    if (labelX + textW > w) labelX = mx - offsetX - textW;
    if (labelY + textH > h) labelY = my - offsetY - textH;

    // Halbtransparenter Hintergrund
    ctxOvl.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctxOvl.fillRect(labelX - 2, labelY - 13, textW, textH);

    // Textfarbe: weiß wenn im Bild, grau wenn außerhalb
    ctxOvl.fillStyle = insideImage ? 'rgba(255, 255, 255, 0.9)' : 'rgba(150, 150, 150, 0.7)';
    ctxOvl.fillText(label, labelX + 2, labelY);
  }

  ctxOvl.restore();
}

// ── Mausbewegung für Fadenkreuz ──────────────────────────────
viewport.addEventListener('mousemove', (e) => {
  const rect = viewport.getBoundingClientRect();
  crosshairMouseX = e.clientX - rect.left;
  crosshairMouseY = e.clientY - rect.top;
  if (overlays.crosshair) renderOverlay();
});

viewport.addEventListener('mouseleave', () => {
  crosshairMouseX = -1;
  crosshairMouseY = -1;
  if (overlays.crosshair) renderOverlay();
});

// ── Zoom zum Mauszeiger ──────────────────────────────────────
function zoomAtPoint(mouseX, mouseY, zoomDelta) {
  const imgXBefore = (mouseX - panX) / zoom;
  const imgYBefore = (mouseY - panY) / zoom;

  zoom = Math.max(0.01, zoom + zoomDelta);

  panX = mouseX - imgXBefore * zoom;
  panY = mouseY - imgYBefore * zoom;

  render();
  saveState();
}

// ── Mausrad ──────────────────────────────────────────────────
viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect  = viewport.getBoundingClientRect();
  const mx    = e.clientX - rect.left;
  const my    = e.clientY - rect.top;

  if (calibrateStep === 1) {
    // Mausrad zoomt die Referenzlinie
    const delta = e.deltaY > 0 ? -0.02 : 0.02;
    refLineZoom = Math.max(0.05, refLineZoom + delta);
    render();
    return;
  }

  const delta = e.deltaY > 0 ? -ZOOM_STEP * 3 : ZOOM_STEP * 3;
  zoomAtPoint(mx, my, delta);
}, { passive: false });

// ── Maus-Drag ────────────────────────────────────────────────
viewport.addEventListener('mousedown', (e) => {
  if (calibrateStep === 2) {
    const rect = viewport.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;

    // Mittlere Maustaste → immer Pan erlauben (auch während Kalibrierung)
    if (e.button === 1) {
      dragging   = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      panStartX  = panX;
      panStartY  = panY;
      viewport.classList.add('dragging');
      e.preventDefault();
      return;
    }

    // Prüfe ob ein existierender Punkt angeklickt wurde (Bild→Screen für Hit-Test)
    let hitIdx = -1;
    for (let i = 0; i < calibratePoints.length; i++) {
      const sp = imgToScreen(calibratePoints[i].imgX, calibratePoints[i].imgY);
      const dx = sp.x - mx;
      const dy = sp.y - my;
      if (Math.sqrt(dx * dx + dy * dy) <= CAL_POINT_RADIUS) {
        hitIdx = i;
        break;
      }
    }

    if (hitIdx >= 0) {
      // Existierenden Punkt greifen zum Verschieben
      calPointDragging = hitIdx;
      calPointSelected = hitIdx;
      viewport.classList.add('dragging');
      e.preventDefault();
      render();
      return;
    }

    // Neuen Punkt setzen (max 2) – in Bild-Koordinaten speichern
    if (calibratePoints.length < 2) {
      let imgPt = screenToImg(mx, my);
      // Shift: horizontal/vertikal einrasten am ersten Punkt (in Bild-Koordinaten)
      if (e.shiftKey && calibratePoints.length === 1) {
        const ref = calibratePoints[0];
        if (Math.abs(imgPt.x - ref.imgX) > Math.abs(imgPt.y - ref.imgY)) {
          imgPt.y = ref.imgY;  // horizontal
        } else {
          imgPt.x = ref.imgX;  // vertikal
        }
      }
      calibratePoints.push({ imgX: imgPt.x, imgY: imgPt.y });
      calPointSelected = calibratePoints.length - 1;
      // Enable confirm button when 2 points are set
      if (calibratePoints.length === 2) {
        document.getElementById('btn-cal-step2-ok').disabled = false;
      }
      render();
    } else {
      // Beide Punkte schon gesetzt, Klick ins Leere → deselektieren oder Pan starten
      calPointSelected = -1;
      // Bild-Pan im Schritt 2 erlauben
      dragging   = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      panStartX  = panX;
      panStartY  = panY;
      viewport.classList.add('dragging');
      render();
    }
    e.preventDefault();
    return;
  }

  if (calibrateStep === 1) {
    // Drag bewegt die Referenzlinie
    refDragging   = true;
    refDragStartX = e.clientX;
    refDragStartY = e.clientY;
    refPanStartX  = refLineX;
    refPanStartY  = refLineY;
    viewport.classList.add('dragging');
    e.preventDefault();
    return;
  }

  if (e.button === 0 || e.button === 1) {
    dragging   = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panStartX  = panX;
    panStartY  = panY;
    viewport.classList.add('dragging');
    e.preventDefault();
  }
});

window.addEventListener('mousemove', (e) => {
  // Drag eines Kalibrierpunkts (Schritt 2)
  if (calPointDragging >= 0 && calibrateStep === 2) {
    const rect = viewport.getBoundingClientRect();
    let mx = e.clientX - rect.left;
    let my = e.clientY - rect.top;

    // In Bild-Koordinaten umrechnen
    let imgPt = screenToImg(mx, my);

    // Shift: horizontal/vertikal einrasten am jeweils anderen Punkt (in Bild-Koordinaten)
    if (e.shiftKey && calibratePoints.length === 2) {
      const otherIdx = calPointDragging === 0 ? 1 : 0;
      const ref = calibratePoints[otherIdx];
      if (Math.abs(imgPt.x - ref.imgX) > Math.abs(imgPt.y - ref.imgY)) {
        imgPt.y = ref.imgY;  // horizontal
      } else {
        imgPt.x = ref.imgX;  // vertikal
      }
    }

    calibratePoints[calPointDragging].imgX = imgPt.x;
    calibratePoints[calPointDragging].imgY = imgPt.y;
    render();
    return;
  }

  if (refDragging) {
    refLineX = refPanStartX + (e.clientX - refDragStartX);
    refLineY = refPanStartY + (e.clientY - refDragStartY);
    render();
    return;
  }
  if (!dragging) return;
  panX = panStartX + (e.clientX - dragStartX);
  panY = panStartY + (e.clientY - dragStartY);
  render();
});

window.addEventListener('mouseup', () => {
  if (calPointDragging >= 0) {
    calPointDragging = -1;
    viewport.classList.remove('dragging');
    render();
    return;
  }
  if (refDragging) {
    refDragging = false;
    viewport.classList.remove('dragging');
    return;
  }
  if (dragging) {
    dragging = false;
    viewport.classList.remove('dragging');
    saveState();
  }
});

// ── Tastatursteuerung ────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;

  // Während Schritt 1: Pfeiltasten bewegen Referenzlinie, +/- zoomen sie
  if (calibrateStep === 1) {
    let handled = true;
    const step = e.shiftKey ? 1 : (e.ctrlKey ? 20 : 5);
    switch (e.key) {
      case 'ArrowUp':    refLineY -= step; break;
      case 'ArrowDown':  refLineY += step; break;
      case 'ArrowLeft':  refLineX -= step; break;
      case 'ArrowRight': refLineX += step; break;
      case '+': case '=': refLineZoom = Math.max(0.05, refLineZoom + 0.01); break;
      case '-':            refLineZoom = Math.max(0.05, refLineZoom - 0.01); break;
      case 'Escape':       cancelCalibration(); return;
      default: handled = false;
    }
    if (handled) { e.preventDefault(); render(); }
    return;
  }

  if (calibrateStep === 2) {
    if (e.key === 'Escape') { cancelCalibration(); return; }
    if (e.key === 'Enter') {
      if (calibratePoints.length === 2) applyCalibrationStep2();
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && calPointSelected >= 0) {
      calibratePoints.splice(calPointSelected, 1);
      calPointSelected = calibratePoints.length > 0 ? 0 : -1;
      calPointDragging = -1;
      document.getElementById('btn-cal-step2-ok').disabled = (calibratePoints.length < 2);
      e.preventDefault();
      render();
      return;
    }
    // Zoom und Pan in Schritt 2 durchlassen (nicht return)
  }

  let step = PAN_NORMAL;
  if (e.shiftKey && !e.altKey) step = PAN_FINE;
  if (e.ctrlKey || e.metaKey) step = PAN_COARSE;

  let handled = true;

  // Alt + Arrow für Zoom
  if (e.altKey) {
    switch (e.key) {
      case 'ArrowUp': {
        const zs = e.shiftKey ? ZOOM_STEP : ZOOM_STEP * 3;
        zoomAtPoint(canvasImage.width / 2, canvasImage.height / 2, zs);
        e.preventDefault();
        return;
      }
      case 'ArrowDown': {
        const zs = e.shiftKey ? -ZOOM_STEP : -ZOOM_STEP * 3;
        zoomAtPoint(canvasImage.width / 2, canvasImage.height / 2, zs);
        e.preventDefault();
        return;
      }
    }
  }

  switch (e.key) {
    case 'ArrowUp':    panY += step; break;
    case 'ArrowDown':  panY -= step; break;
    case 'ArrowLeft':  panX += step; break;
    case 'ArrowRight': panX -= step; break;
    case '+': case '=':
      zoomAtPoint(canvasImage.width / 2, canvasImage.height / 2, ZOOM_STEP);
      return;
    case '-':
      zoomAtPoint(canvasImage.width / 2, canvasImage.height / 2, -ZOOM_STEP);
      return;
    case '0':
      if (img) {
        zoom = 1.0;
        panX = (canvasImage.width  - img.width)  / 2;
        panY = (canvasImage.height - img.height) / 2;
      }
      break;
    case 'g': case 'G': toggleOverlay('grid',    'btn-grid');    break;
    case 'c': case 'C': toggleOverlay('center',  'btn-center');  break;
    case 't': case 'T': toggleOverlay('thirds',  'btn-thirds');  break;
    case 'r': case 'R': toggleOverlay('ruler',   'btn-ruler');   break;
    case 'x': case 'X': toggleOverlay('crosshair', 'btn-crosshair'); break;
    case 'h': case 'H': case 'F1':
      document.getElementById('help-overlay').classList.toggle('hidden');
      break;
    case 'o': case 'O':
      if (e.ctrlKey || e.metaKey) {
        document.getElementById('btn-load').click();
      } else { handled = false; }
      break;
    default:
      handled = false;
  }

  if (handled) {
    e.preventDefault();
    render();
    saveState();
  }
});

// ── Overlay Toggles ──────────────────────────────────────────
function toggleOverlay(key, btnId) {
  overlays[key] = !overlays[key];
  document.getElementById(btnId).classList.toggle('active');
}

document.getElementById('btn-grid').addEventListener('click', () => {
  toggleOverlay('grid', 'btn-grid'); render();
});
document.getElementById('btn-center').addEventListener('click', () => {
  toggleOverlay('center', 'btn-center'); render();
});
document.getElementById('btn-thirds').addEventListener('click', () => {
  toggleOverlay('thirds', 'btn-thirds'); render();
});
document.getElementById('btn-ruler').addEventListener('click', () => {
  toggleOverlay('ruler', 'btn-ruler'); render();
});
document.getElementById('btn-crosshair').addEventListener('click', () => {
  toggleOverlay('crosshair', 'btn-crosshair'); render();
});

// ── Rasterweite konfigurieren ────────────────────────────────
function updateGridInputVisibility() {
  const hasCal = calibration.pxPerCm != null;
  document.getElementById('grid-input-px').style.display = hasCal ? 'none' : 'flex';
  document.getElementById('grid-input-cm').style.display = hasCal ? 'flex' : 'none';
}

document.getElementById('input-grid-size').value = gridSize;
document.getElementById('input-grid-size').addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  if (val >= 5) {
    gridSize = val;
    render();
    saveState();
  }
});

document.getElementById('input-grid-size-cm').value = gridSizeCm;
document.getElementById('input-grid-size-cm').addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  if (val >= 0.5) {
    gridSizeCm = val;
    render();
    saveState();
  }
});

// ── Kontrast / Helligkeit ────────────────────────────────────
document.getElementById('slider-contrast').value = contrast;
document.getElementById('slider-contrast').addEventListener('input', (e) => {
  contrast = parseInt(e.target.value, 10);
  contrastDisp.textContent = `${contrast}%`;
  render();
  saveState();
});

document.getElementById('slider-brightness').value = brightness;
document.getElementById('slider-brightness').addEventListener('input', (e) => {
  brightness = parseInt(e.target.value, 10);
  brightnessDisp.textContent = `${brightness}%`;
  render();
  saveState();
});

// ══════════════════════════════════════════════════════════════
//  KALIBRIERUNG (2-Schritt)
// ══════════════════════════════════════════════════════════════

document.getElementById('btn-calibrate').addEventListener('click', startCalibration);
document.getElementById('btn-cal-cancel').addEventListener('click', cancelCalibration);
document.getElementById('btn-cal-cancel2').addEventListener('click', cancelCalibration);
document.getElementById('btn-cal-step1-ok').addEventListener('click', finishStep1);
document.getElementById('btn-cal-step2-ok').addEventListener('click', applyCalibrationStep2);

// Kalibrierten Zoom wiederherstellen
document.getElementById('btn-restore-zoom').addEventListener('click', () => {
  if (calibratedZoom !== null) {
    zoom = calibratedZoom;
    if (calibratedPanX !== null) panX = calibratedPanX;
    if (calibratedPanY !== null) panY = calibratedPanY;
    render();
    saveState();
  }
});

// Kalibrierung neu starten
document.getElementById('btn-recalibrate').addEventListener('click', () => {
  calibratedZoom = null;
  calibratedPanX = null;
  calibratedPanY = null;
  calibration.pxPerCm = null;
  screenPxPerMeter = null;
  updateCalibrationButtons();
  updateGridInputVisibility();
  saveState();
  startCalibration();
});

function updateCalibrationButtons() {
  const restoreBtn = document.getElementById('btn-restore-zoom');
  const recalBtn   = document.getElementById('btn-recalibrate');
  if (calibratedZoom !== null) {
    restoreBtn.classList.remove('hidden');
    recalBtn.classList.remove('hidden');
  } else {
    restoreBtn.classList.add('hidden');
    recalBtn.classList.add('hidden');
  }
}

// ── Schritt 1 starten ────────────────────────────────────────
function startCalibration() {
  if (!img) return;
  calibrateStep = 1;
  calibratePoints = [];

  // Referenzlinie in die Mitte des Viewports setzen
  refLineX    = canvasOverlay.width / 2;
  refLineY    = canvasOverlay.height / 2;
  refLineZoom = 1.0;

  viewport.classList.remove('calibrating');
  viewport.classList.add('calibrating-step1');
  document.getElementById('calibrate-banner-step1').classList.remove('hidden');
  document.getElementById('calibrate-banner-step2').classList.add('hidden');
  render();
}

// ── Schritt 1 abschließen ────────────────────────────────────
function finishStep1() {
  // Die Referenzlinie hat jetzt lineW = REF_BASE_PX * refLineZoom Screen-Pixel
  // Das entspricht 1 Meter in echt.
  screenPxPerMeter = REF_BASE_PX * refLineZoom;

  // Weiter zu Schritt 2
  calibrateStep = 2;
  calibratePoints = [];
  calPointDragging = -1;
  calPointSelected = -1;
  document.getElementById('calibrate-banner-step1').classList.add('hidden');
  document.getElementById('calibrate-banner-step2').classList.remove('hidden');
  document.getElementById('btn-cal-step2-ok').disabled = true;
  viewport.classList.remove('calibrating-step1');
  viewport.classList.add('calibrating');
  render();
}

// ── Kalibrierung abbrechen ───────────────────────────────────
function cancelCalibration() {
  calibrateStep = 0;
  calibratePoints = [];
  calPointDragging = -1;
  calPointSelected = -1;
  viewport.classList.remove('calibrating');
  viewport.classList.remove('calibrating-step1');
  document.getElementById('calibrate-banner-step1').classList.add('hidden');
  document.getElementById('calibrate-banner-step2').classList.add('hidden');
  // Reset confirm button
  const confirmBtn = document.getElementById('btn-cal-step2-ok');
  if (confirmBtn) confirmBtn.disabled = true;
  render();
}

// ── Schritt 2: Bestätigung – Kalibrierung anwenden ───────────
function applyCalibrationStep2() {
  if (calibrateStep !== 2 || calibratePoints.length !== 2) return;

  const [p1, p2] = calibratePoints;

  // Abstand in Bild-Pixeln (direkt aus Bild-Koordinaten)
  const dxImg = p2.imgX - p1.imgX;
  const dyImg = p2.imgY - p1.imgY;
  const distImgPx = Math.sqrt(dxImg * dxImg + dyImg * dyImg);

  const knownCm = parseFloat(document.getElementById('input-calibrate-cm').value);
  if (knownCm > 0 && distImgPx > 0 && screenPxPerMeter > 0) {
    // Wie viele Screen-Pixel sollen knownCm in echt sein?
    const screenPxPerCm = screenPxPerMeter / 100;
    const targetScreenPx = knownCm * screenPxPerCm;

    // Aktuell: distImgPx * zoom = Screen-Pixel der Strecke
    // Wir brauchen: distImgPx * newZoom = targetScreenPx
    const newZoom = targetScreenPx / distImgPx;

    // pxPerCm für Ruler (bei Zoom=1 im Bild)
    calibration.pxPerCm = distImgPx / knownCm;

    // Zoom anwenden: Zentriert auf die Mitte der beiden Punkte (in Bild-Koordinaten)
    const imgCenterX = (p1.imgX + p2.imgX) / 2;
    const imgCenterY = (p1.imgY + p2.imgY) / 2;

    zoom = newZoom;
    panX = canvasImage.width  / 2 - imgCenterX * zoom;
    panY = canvasImage.height / 2 - imgCenterY * zoom;

    // Speichere als kalibrierten Zoom
    calibratedZoom = zoom;
    calibratedPanX = panX;
    calibratedPanY = panY;

    updateCalibrationButtons();
    updateGridInputVisibility();
    saveState();
  }

  cancelCalibration();
}

// ── Hilfe schließen ──────────────────────────────────────────
document.getElementById('btn-help-close').addEventListener('click', () => {
  document.getElementById('help-overlay').classList.add('hidden');
});

// ══════════════════════════════════════════════════════════════
//  OVERLAY-EINSTELLUNGEN
// ══════════════════════════════════════════════════════════════

const OVERLAY_KEYS = ['grid', 'center', 'thirds', 'crosshair'];

const defaultOverlayStyles = {
  grid:      { color: '#ffffff', opacity: 0.18, width: 0.5 },
  center:    { color: '#00ff00', opacity: 0.6,  width: 1   },
  thirds:    { color: '#0096ff', opacity: 0.5,  width: 1   },
  crosshair: { color: '#ffffff', opacity: 0.45, width: 0.75 },
};

/** Sync alle Settings-UI-Elemente mit dem aktuellen overlayStyles-Objekt */
function syncSettingsUI() {
  for (const key of OVERLAY_KEYS) {
    const s = overlayStyles[key];
    document.getElementById(`style-${key}-color`).value   = s.color;
    document.getElementById(`style-${key}-opacity`).value  = s.opacity;
    document.getElementById(`style-${key}-width`).value    = s.width;
    document.getElementById(`style-${key}-opacity-val`).textContent = `${Math.round(s.opacity * 100)}%`;
    document.getElementById(`style-${key}-width-val`).textContent   = s.width.toFixed(s.width % 1 === 0 ? 0 : 2);
  }
}

// Einstellungen öffnen / schließen
document.getElementById('btn-settings').addEventListener('click', () => {
  syncSettingsUI();
  document.getElementById('settings-overlay').classList.remove('hidden');
});
document.getElementById('btn-settings-close').addEventListener('click', () => {
  document.getElementById('settings-overlay').classList.add('hidden');
});
// Klick auf Backdrop schließt
document.getElementById('settings-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById('settings-overlay').classList.add('hidden');
  }
});

// Zurücksetzen
document.getElementById('btn-settings-reset').addEventListener('click', () => {
  for (const key of OVERLAY_KEYS) {
    overlayStyles[key] = { ...defaultOverlayStyles[key] };
  }
  syncSettingsUI();
  render();
  saveState();
});

// Event-Listener für alle Einstellungs-Inputs registrieren
for (const key of OVERLAY_KEYS) {
  // Farbe
  document.getElementById(`style-${key}-color`).addEventListener('input', (e) => {
    overlayStyles[key].color = e.target.value;
    render();
    saveState();
  });
  // Deckkraft
  document.getElementById(`style-${key}-opacity`).addEventListener('input', (e) => {
    overlayStyles[key].opacity = parseFloat(e.target.value);
    document.getElementById(`style-${key}-opacity-val`).textContent = `${Math.round(overlayStyles[key].opacity * 100)}%`;
    render();
    saveState();
  });
  // Linienstärke
  document.getElementById(`style-${key}-width`).addEventListener('input', (e) => {
    overlayStyles[key].width = parseFloat(e.target.value);
    const w = overlayStyles[key].width;
    document.getElementById(`style-${key}-width-val`).textContent = w.toFixed(w % 1 === 0 ? 0 : 2);
    render();
    saveState();
  });
}

// ── Init ─────────────────────────────────────────────────────
resizeCanvases();
updateCalibrationButtons();
updateGridInputVisibility();
syncSettingsUI();
