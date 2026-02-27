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

let overlays = { grid: false, center: false, thirds: false, ruler: false };
let gridSize = 50;

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
    zoom, panX, panY, contrast, brightness, gridSize,
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

  // ── Standard-Overlays ──
  if (overlays.grid) {
    ctxOvl.strokeStyle = 'rgba(255, 0, 0, 0.35)';
    ctxOvl.lineWidth = 0.5;
    ctxOvl.beginPath();
    for (let x = 0; x < w; x += gridSize) {
      ctxOvl.moveTo(x, 0); ctxOvl.lineTo(x, h);
    }
    for (let y = 0; y < h; y += gridSize) {
      ctxOvl.moveTo(0, y); ctxOvl.lineTo(w, y);
    }
    ctxOvl.stroke();
  }

  if (overlays.center) {
    ctxOvl.strokeStyle = 'rgba(0, 255, 0, 0.6)';
    ctxOvl.lineWidth = 1;
    ctxOvl.beginPath();
    ctxOvl.moveTo(w / 2, 0); ctxOvl.lineTo(w / 2, h);
    ctxOvl.moveTo(0, h / 2); ctxOvl.lineTo(w, h / 2);
    ctxOvl.stroke();
  }

  if (overlays.thirds) {
    ctxOvl.strokeStyle = 'rgba(0, 150, 255, 0.5)';
    ctxOvl.lineWidth = 1;
    ctxOvl.setLineDash([10, 5]);
    ctxOvl.beginPath();
    for (let i = 1; i <= 2; i++) {
      ctxOvl.moveTo((w / 3) * i, 0); ctxOvl.lineTo((w / 3) * i, h);
      ctxOvl.moveTo(0, (h / 3) * i); ctxOvl.lineTo(w, (h / 3) * i);
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

    // Hilfslinie zwischen den Punkten (auch während Drag)
    if (calibratePoints.length === 2) {
      // Gestrichelte Hilfslinie
      ctxOvl.save();
      ctxOvl.strokeStyle = 'rgba(255, 255, 0, 0.6)';
      ctxOvl.setLineDash([8, 6]);
      ctxOvl.lineWidth = 1.5;
      ctxOvl.beginPath();
      ctxOvl.moveTo(calibratePoints[0].x, calibratePoints[0].y);
      ctxOvl.lineTo(calibratePoints[1].x, calibratePoints[1].y);
      ctxOvl.stroke();
      ctxOvl.setLineDash([]);
      ctxOvl.restore();

      // Durchgezogene Verbindungslinie
      ctxOvl.strokeStyle = 'rgba(255, 100, 0, 0.9)';
      ctxOvl.lineWidth = 2;
      ctxOvl.beginPath();
      ctxOvl.moveTo(calibratePoints[0].x, calibratePoints[0].y);
      ctxOvl.lineTo(calibratePoints[1].x, calibratePoints[1].y);
      ctxOvl.stroke();

      // Pixel-Distanz auf dem Screen anzeigen
      const dx = calibratePoints[1].x - calibratePoints[0].x;
      const dy = calibratePoints[1].y - calibratePoints[0].y;
      const screenDist = Math.sqrt(dx * dx + dy * dy);
      const midX = (calibratePoints[0].x + calibratePoints[1].x) / 2;
      const midY = (calibratePoints[0].y + calibratePoints[1].y) / 2;
      ctxOvl.font = '13px monospace';
      ctxOvl.fillStyle = 'rgba(255, 100, 0, 0.9)';
      ctxOvl.fillText(`${Math.round(screenDist)} px`, midX + 8, midY - 8);
    }

    // Punkte zeichnen
    for (let i = 0; i < calibratePoints.length; i++) {
      const pt = calibratePoints[i];
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

    // Prüfe ob ein existierender Punkt angeklickt wurde
    let hitIdx = -1;
    for (let i = 0; i < calibratePoints.length; i++) {
      const dx = calibratePoints[i].x - mx;
      const dy = calibratePoints[i].y - my;
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

    // Neuen Punkt setzen (max 2)
    if (calibratePoints.length < 2) {
      let px = mx;
      let py = my;
      // Shift: horizontal/vertikal einrasten am ersten Punkt
      if (e.shiftKey && calibratePoints.length === 1) {
        const ref = calibratePoints[0];
        if (Math.abs(mx - ref.x) > Math.abs(my - ref.y)) {
          py = ref.y;  // horizontal
        } else {
          px = ref.x;  // vertikal
        }
      }
      calibratePoints.push({ x: px, y: py });
      calPointSelected = calibratePoints.length - 1;
      // Enable confirm button when 2 points are set
      if (calibratePoints.length === 2) {
        document.getElementById('btn-cal-step2-ok').disabled = false;
      }
      render();
    } else {
      // Beide Punkte schon gesetzt, Klick ins Leere → deselektieren
      calPointSelected = -1;
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

    // Shift: horizontal/vertikal einrasten am jeweils anderen Punkt
    if (e.shiftKey && calibratePoints.length === 2) {
      const otherIdx = calPointDragging === 0 ? 1 : 0;
      const ref = calibratePoints[otherIdx];
      if (Math.abs(mx - ref.x) > Math.abs(my - ref.y)) {
        my = ref.y;  // horizontal
      } else {
        mx = ref.x;  // vertikal
      }
    }

    calibratePoints[calPointDragging].x = mx;
    calibratePoints[calPointDragging].y = my;
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
    return;
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

// ── Rasterweite konfigurieren ────────────────────────────────
document.getElementById('input-grid-size').value = gridSize;
document.getElementById('input-grid-size').addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  if (val >= 5) {
    gridSize = val;
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

  // Abstand in Bild-Pixeln (ohne Zoom)
  const dxImg = (p2.x - p1.x) / zoom;
  const dyImg = (p2.y - p1.y) / zoom;
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

    // Zoom anwenden: Zentriert auf die Mitte der beiden Punkte
    const centerScreenX = (p1.x + p2.x) / 2;
    const centerScreenY = (p1.y + p2.y) / 2;
    const imgCenterX = (centerScreenX - panX) / zoom;
    const imgCenterY = (centerScreenY - panY) / zoom;

    zoom = newZoom;
    panX = canvasImage.width  / 2 - imgCenterX * zoom;
    panY = canvasImage.height / 2 - imgCenterY * zoom;

    // Speichere als kalibrierten Zoom
    calibratedZoom = zoom;
    calibratedPanX = panX;
    calibratedPanY = panY;

    updateCalibrationButtons();
    saveState();
  }

  cancelCalibration();
}

// ── Hilfe schließen ──────────────────────────────────────────
document.getElementById('btn-help-close').addEventListener('click', () => {
  document.getElementById('help-overlay').classList.add('hidden');
});

// ── Init ─────────────────────────────────────────────────────
resizeCanvases();
updateCalibrationButtons();
