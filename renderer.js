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

// Kalibrierung
let calibration     = { pxPerCm: null };
let calibrating     = false;
let calibratePoints = [];

// Drag
let dragging   = false;
let dragStartX = 0;
let dragStartY = 0;
let panStartX  = 0;
let panStartY  = 0;

// ── Restore aus localStorage ─────────────────────────────────
(function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem('beamer-tracer-state'));
    if (!saved) return;
    zoom       = saved.zoom       ?? zoom;
    panX       = saved.panX       ?? panX;
    panY       = saved.panY       ?? panY;
    contrast   = saved.contrast   ?? contrast;
    brightness = saved.brightness ?? brightness;
    gridSize   = saved.gridSize   ?? gridSize;
    if (saved.pxPerCm) calibration.pxPerCm = saved.pxPerCm;
    if (saved.imgSrc) {
      imgSrc = saved.imgSrc;
      img = new Image();
      img.onload = () => render();
      img.src = imgSrc;
    }
  } catch (_) { /* ignore */ }
})();

function saveState() {
  try {
    localStorage.setItem('beamer-tracer-state', JSON.stringify({
      zoom, panX, panY, contrast, brightness, gridSize,
      pxPerCm: calibration.pxPerCm,
      imgSrc,
    }));
  } catch (_) { /* quota exceeded */ }
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
  input.type = 'file'];
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
  zoomDisplay.textContent = `${Math.round(zoom * 100)}%`;
}

function renderOverlay() {
  const w = canvasOverlay.width;
  const h = canvasOverlay.height;
  ctxOvl.clearRect(0, 0, w, h);

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

  if (calibrating && calibratePoints.length > 0) {
    ctxOvl.fillStyle = 'rgba(255, 100, 0, 0.9)';
    for (const pt of calibratePoints) {
      ctxOvl.beginPath();
      ctxOvl.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctxOvl.fill();
    }
  }
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

// ── Mausrad → Zoom zum Cursor ────────────────────────────────
viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect  = viewport.getBoundingClientRect();
  const mx    = e.clientX - rect.left;
  const my    = e.clientY - rect.top;
  const delta = e.deltaY > 0 ? -ZOOM_STEP * 3 : ZOOM_STEP * 3;
  zoomAtPoint(mx, my, delta);
}, { passive: false });

// ── Maus-Drag ────────────────────────────────────────────────
viewport.addEventListener('mousedown', (e) => {
  if (calibrating) {
    handleCalibrateClick(e);
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
  if (!dragging) return;
  panX = panStartX + (e.clientX - dragStartX);
  panY = panStartY + (e.clientY - dragStartY);
  render();
});

window.addEventListener('mouseup', () => {
  if (dragging) {
    dragging = false;
    viewport.classList.remove('dragging');
    saveState();
  }
});

// ── Tastatursteuerung ────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;

  let step = PAN_NORMAL;
  if (e.shiftKey) step = PAN_FINE;
  if (e.ctrlKey || e.metaKey) step = PAN_COARSE;

  let handled = true;

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

// ── Maßstab-Kalibrierung ────────────────────────────────────
document.getElementById('btn-calibrate').addEventListener('click', startCalibration);
document.getElementById('btn-calibrate-cancel').addEventListener('click', cancelCalibration);

function startCalibration() {
  calibrating = true;
  calibratePoints = [];
  viewport.classList.add('calibrating');
  document.getElementById('calibrate-banner').classList.remove('hidden');
  render();
}

function cancelCalibration() {
  calibrating = false;
  calibratePoints = [];
  viewport.classList.remove('calibrating');
  document.getElementById('calibrate-banner').classList.add('hidden');
  render();
}

function handleCalibrateClick(e) {
  const rect = viewport.getBoundingClientRect();
  const mx   = e.clientX - rect.left;
  const my   = e.clientY - rect.top;

  calibratePoints.push({ x: mx, y: my });
  render();

  if (calibratePoints.length === 2) {
    const [p1, p2] = calibratePoints;

    const dx = (p2.x - p1.x) / zoom;
    const dy = (p2.y - p1.y) / zoom;
    const distPx = Math.sqrt(dx * dx + dy * dy);

    const knownCm = parseFloat(document.getElementById('input-calibrate-cm').value);
    if (knownCm > 0 && distPx > 0) {
      calibration.pxPerCm = distPx / knownCm;
      saveState();
    }

    cancelCalibration();
  }
}

// ── Hilfe schließen ──────────────────────────────────────────
document.getElementById('btn-help-close').addEventListener('click', () => {
  document.getElementById('help-overlay').classList.add('hidden');
});

// ── Init ─────────────────────────────────────────────────────
resizeCanvases();