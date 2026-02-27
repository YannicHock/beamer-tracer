// ============================================================
//  Beamer Tracer – Onboarding Tour
// ============================================================

import state from '../../core/state.js';
import { applyFullscreenUI } from '../fullscreen/fullscreen.js';

// ── Tour Step Definitions ────────────────────────────────────
const TOUR_STEPS = [
  {
    target: '#btn-load',
    title: '📂 Bild laden',
    text: 'Lade ein Bild über diesen Button, per Drag & Drop auf das Fenster, oder mit <kbd>Ctrl+V</kbd> aus der Zwischenablage. Das Bild wird als Referenz auf dem Beamer angezeigt.',
  },
  {
    target: '#viewport',
    title: '🖱️ Navigation',
    text: 'Ziehe das Bild mit der <strong>linken Maustaste</strong> oder <strong>Mitteltaste</strong>. Zoome mit dem <strong>Mausrad</strong> oder den Tasten <kbd>+</kbd> / <kbd>−</kbd>. Nutze die <strong>Pfeiltasten</strong> für präzises Verschieben.',
    position: 'center',
  },
  {
    target: '#btn-grid',
    title: '📐 Raster',
    text: 'Blendet ein gleichmäßiges Raster über das Bild ein. Die Rasterweite kannst du im Eingabefeld daneben einstellen. Nach Kalibrierung auch in cm möglich.',
  },
  {
    target: '#btn-center',
    title: '✛ Mittellinien',
    text: 'Zeigt horizontale und vertikale Mittellinien an, um das Bild exakt zu zentrieren.',
  },
  {
    target: '#btn-thirds',
    title: '▦ Drittel-Linien',
    text: 'Blendet Drittel-Linien ein – nützlich zur Ausrichtung nach der Drittel-Regel.',
  },
  {
    target: '#btn-ruler',
    title: '📏 Maßstab',
    text: 'Zeigt eine Referenzlinie an, die nach der Kalibrierung reale Maßeinheiten darstellt.',
  },
  {
    target: '#btn-crosshair',
    title: '✚ Fadenkreuz',
    text: 'Ein Fadenkreuz folgt deinem Mauszeiger – ideal zum präzisen Ausrichten von Elementen.',
  },
  {
    target: '#btn-measure',
    title: '📐 Messwerkzeug',
    text: 'Aktiviere das Messwerkzeug, um Abstände direkt im Bild zu messen. Nach Kalibrierung werden reale Maße in cm angezeigt.',
  },
  {
    target: '#btn-calibrate',
    title: '🔧 Kalibrieren',
    text: 'Starte die 2-Schritt-Kalibrierung: Zuerst wird die Projektionsfläche vermessen, dann ein bekannter Abstand im Bild. Danach sind alle Maße in Zentimetern verfügbar.',
  },
  {
    target: '#slider-contrast',
    title: '🔆 Kontrast & Helligkeit',
    text: 'Passe Kontrast und Helligkeit des Bildes an, um Details besser sichtbar zu machen.',
    padX: 60,
  },
  {
    target: '#btn-settings',
    title: '⚙️ Overlay-Einstellungen',
    text: 'Hier kannst du Farbe, Deckkraft und Linienstärke aller Overlays individuell anpassen.',
  },
  {
    target: '#btn-help',
    title: '❓ Hilfe',
    text: 'Öffnet die Tastenbelegung und weitere Hilfe. Von hier aus kannst du auch jederzeit diese Tour erneut starten.',
  },
  {
    target: '#btn-fullscreen',
    title: '⛶ Vollbild',
    text: 'Wechselt in den Vollbildmodus. Die Toolbar wird automatisch ausgeblendet und erscheint wieder, wenn du den Mauszeiger an den oberen Bildschirmrand bewegst.',
  },
];

// ── Tour State ───────────────────────────────────────────────
let currentStep = -1;
let backdropEl = null;
let tooltipEl = null;
let resizeHandler = null;
let isActive = false;

// ── Public API ───────────────────────────────────────────────

export function startTour() {
  // Exit fullscreen first so toolbar targets are visible
  if (state.isFullscreen) {
    applyFullscreenUI(false);
  }
  // Close any open modals
  document.getElementById('help-overlay')?.classList.add('hidden');
  document.getElementById('settings-overlay')?.classList.add('hidden');

  isActive = true;
  currentStep = 0;
  createBackdrop();
  createTooltip();
  showStep();

  resizeHandler = () => { if (isActive) showStep(); };
  window.addEventListener('resize', resizeHandler);
}

export function endTour() {
  isActive = false;
  currentStep = -1;
  if (backdropEl) { backdropEl.remove(); backdropEl = null; }
  if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  // Persist that user has seen the tour
  try {
    localStorage.setItem('beamer-tracer-tour-done', '1');
  } catch (_) { /* ignore */ }
}

export function isTourActive() {
  return isActive;
}

// ── Internals ────────────────────────────────────────────────

function createBackdrop() {
  if (backdropEl) backdropEl.remove();
  backdropEl = document.createElement('div');
  backdropEl.className = 'tour-backdrop';
  backdropEl.addEventListener('click', (e) => {
    // Clicking the backdrop (outside tooltip) skips the tour
    if (e.target === backdropEl) endTour();
  });
  document.body.appendChild(backdropEl);
}

function createTooltip() {
  if (tooltipEl) tooltipEl.remove();
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'tour-tooltip';
  document.body.appendChild(tooltipEl);
}

function showStep() {
  if (currentStep < 0 || currentStep >= TOUR_STEPS.length) {
    endTour();
    return;
  }

  const step = TOUR_STEPS[currentStep];
  const targetEl = document.querySelector(step.target);

  // ── Highlight target with clip-path cutout ────────────────
  if (targetEl && step.position !== 'center') {
    const rect = targetEl.getBoundingClientRect();
    const pad = 6;
    const padX = step.padX ?? pad;
    const top    = Math.max(0, rect.top - pad);
    const left   = Math.max(0, rect.left - padX);
    const bottom = Math.min(window.innerHeight, rect.bottom + pad);
    const right  = Math.min(window.innerWidth, rect.right + padX);
    const r = 8; // border-radius for cutout

    // SVG-based polygon with rounded look via inset()
    backdropEl.style.clipPath =
      `polygon(evenodd, ` +
      `0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ` +           // outer rectangle
      `${left + r}px ${top}px, ${left}px ${top + r}px, ` +        // cutout
      `${left}px ${bottom - r}px, ${left + r}px ${bottom}px, ` +
      `${right - r}px ${bottom}px, ${right}px ${bottom - r}px, ` +
      `${right}px ${top + r}px, ${right - r}px ${top}px, ` +
      `${left + r}px ${top}px` +
      `)`;
  } else {
    backdropEl.style.clipPath = '';
  }

  // ── Render tooltip content ─────────────────────────────────
  const total = TOUR_STEPS.length;
  const isFirst = currentStep === 0;
  const isLast  = currentStep === total - 1;

  tooltipEl.innerHTML = `
    <div class="tour-tooltip-header">
      <span class="tour-tooltip-title">${step.title}</span>
      <span class="tour-tooltip-counter">${currentStep + 1} / ${total}</span>
    </div>
    <div class="tour-tooltip-body">${step.text}</div>
    <div class="tour-tooltip-progress">
      <div class="tour-tooltip-progress-bar" style="width:${((currentStep + 1) / total) * 100}%"></div>
    </div>
    <div class="tour-tooltip-actions">
      <button class="tour-btn-skip" title="Tour beenden">Überspringen</button>
      <div class="tour-tooltip-nav">
        ${!isFirst ? '<button class="tour-btn-prev">← Zurück</button>' : ''}
        <button class="tour-btn-next">${isLast ? '✅ Fertig' : 'Weiter →'}</button>
      </div>
    </div>
  `;

  // ── Event listeners ─────────────────────────────────────────
  tooltipEl.querySelector('.tour-btn-skip').addEventListener('click', endTour);
  tooltipEl.querySelector('.tour-btn-next').addEventListener('click', () => {
    if (currentStep >= TOUR_STEPS.length - 1) { endTour(); return; }
    currentStep++;
    showStep();
  });
  const prevBtn = tooltipEl.querySelector('.tour-btn-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentStep > 0) { currentStep--; showStep(); }
    });
  }

  // ── Position tooltip ─────────────────────────────────────────
  positionTooltip(targetEl, step);
}

function positionTooltip(targetEl, step) {
  if (!tooltipEl) return;

  // Reset classes
  tooltipEl.classList.remove('tour-tooltip-above', 'tour-tooltip-below', 'tour-tooltip-center');

  if (!targetEl || step.position === 'center') {
    // Center on screen
    tooltipEl.classList.add('tour-tooltip-center');
    tooltipEl.style.left = '50%';
    tooltipEl.style.top = '50%';
    tooltipEl.style.transform = 'translate(-50%, -50%)';
    return;
  }

  const rect = targetEl.getBoundingClientRect();
  const ttRect = tooltipEl.getBoundingClientRect();
  const margin = 14;

  // Prefer below, fall back to above
  let top, left;
  const spaceBelow = window.innerHeight - rect.bottom;

  if (spaceBelow >= ttRect.height + margin + 20) {
    // Below
    top = rect.bottom + margin;
    tooltipEl.classList.add('tour-tooltip-below');
  } else {
    // Above
    top = rect.top - ttRect.height - margin;
    tooltipEl.classList.add('tour-tooltip-above');
  }

  // Horizontal: center on target, clamp to viewport
  left = rect.left + rect.width / 2 - ttRect.width / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - ttRect.width - 12));
  top  = Math.max(12, Math.min(top, window.innerHeight - ttRect.height - 12));

  tooltipEl.style.transform = 'none';
  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top  = `${top}px`;
}

// ── Keyboard Navigation ──────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (!isActive) return;
  if (e.key === 'Escape') {
    endTour();
    e.stopImmediatePropagation();
    e.preventDefault();
  } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
    if (currentStep >= TOUR_STEPS.length - 1) { endTour(); return; }
    currentStep++;
    showStep();
    e.stopImmediatePropagation();
    e.preventDefault();
  } else if (e.key === 'ArrowLeft') {
    if (currentStep > 0) { currentStep--; showStep(); }
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}, true);

// ── Auto-start on first visit ────────────────────────────────
export function maybeAutoStartTour() {
  try {
    if (!localStorage.getItem('beamer-tracer-tour-done')) {
      setTimeout(startTour, 600);
    }
  } catch (_) { /* ignore */ }
}

// ── Init ─────────────────────────────────────────────────────
export function initTour() {
  // Button in help overlay
  const btnTourFromHelp = document.getElementById('btn-tour-start');
  if (btnTourFromHelp) {
    btnTourFromHelp.addEventListener('click', () => startTour());
  }

  // Auto-start for first-time users
  maybeAutoStartTour();
}

