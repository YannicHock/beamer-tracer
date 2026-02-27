/**
 * @module renderer/features/tour/tour
 * @description Interaktive Onboarding-Einführungstour.
 *
 * Zeigt eine schrittweise Einführung in alle Toolbar-Elemente der App.
 * Jeder Schritt hebt ein UI-Element hervor (Spotlight via `clip-path`)
 * und zeigt einen Tooltip mit Erklärung an.
 *
 * Features:
 * - 13 Schritte (alle Toolbar-Elemente + Viewport-Navigation)
 * - Spotlight-Effekt mit Backdrop-Cutout
 * - Tooltip-Positionierung (unter oder über dem Ziel, automatisch)
 * - Navigation: Weiter/Zurück/Überspringen (Buttons + Pfeiltasten + ESC)
 * - Fortschrittsbalken
 * - Automatischer Start beim ersten Besuch (via localStorage-Flag)
 * - Beendet Vollbild und schließt offene Modals vor Start
 *
 * Tour-Zustand wird intern verwaltet (nicht im zentralen State),
 * da er nicht persistiert werden muss.
 */

import state from '../../core/state.js';
import { applyFullscreenUI } from '../fullscreen/fullscreen.js';

/**
 * Definition aller Tour-Schritte.
 * Jeder Schritt hat:
 * - `target` – CSS-Selektor des hervorzuhebenden Elements
 * - `title` – Überschrift im Tooltip
 * - `text` – HTML-Beschreibung im Tooltip
 * - `position` (optional) – 'center' für zentrierte Darstellung ohne Spotlight
 * - `padX` (optional) – Zusätzliches horizontales Padding für den Spotlight
 *
 * @type {Array<{target: string, title: string, text: string, position?: string, padX?: number}>}
 * @private
 */
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
/** @type {number} Aktueller Schritt-Index (-1 = nicht aktiv) @private */
let currentStep = -1;
/** @type {HTMLDivElement|null} Backdrop-Element mit Spotlight-Cutout @private */
let backdropEl = null;
/** @type {HTMLDivElement|null} Tooltip-Element @private */
let tooltipEl = null;
/** @type {Function|null} Window-Resize-Handler (für Neupositionierung) @private */
let resizeHandler = null;
/** @type {boolean} Ist die Tour gerade aktiv? @private */
let isActive = false;

// ── Public API ───────────────────────────────────────────────

/**
 * Startet die Einführungstour.
 *
 * Verlässt den Vollbildmodus (falls aktiv), schließt offene Modals,
 * erstellt Backdrop + Tooltip und zeigt den ersten Schritt an.
 * Registriert einen Resize-Handler zur Neupositionierung.
 */
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

/**
 * Beendet die Tour und räumt alle DOM-Elemente auf.
 * Setzt `beamer-tracer-tour-done` in localStorage, um
 * den Auto-Start bei zukünftigen Besuchen zu verhindern.
 */
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

/**
 * Gibt zurück, ob die Tour gerade aktiv ist.
 * @returns {boolean}
 */
export function isTourActive() {
  return isActive;
}

// ── Internals ────────────────────────────────────────────────

/**
 * Erstellt das halbtransparente Backdrop-Element mit Spotlight-Cutout.
 * Klick auf den Backdrop (außerhalb des Tooltips) beendet die Tour.
 * @private
 */
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

/**
 * Erstellt das Tooltip-DOM-Element.
 * @private
 */
function createTooltip() {
  if (tooltipEl) tooltipEl.remove();
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'tour-tooltip';
  document.body.appendChild(tooltipEl);
}

/**
 * Zeigt den aktuellen Tour-Schritt an.
 *
 * Ablauf:
 * 1. Spotlight-Cutout auf das Ziel-Element setzen (via `clip-path` Polygon)
 * 2. Tooltip-Inhalt rendern (Titel, Text, Navigation, Fortschrittsbalken)
 * 3. Event-Listener für Weiter/Zurück/Überspringen binden
 * 4. Tooltip positionieren
 *
 * Falls `currentStep` außerhalb des gültigen Bereichs liegt, wird die Tour beendet.
 * @private
 */
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
// Registriert globalen Keydown-Handler (Capture-Phase):
// - ESC: Tour beenden
// - Pfeil rechts / Enter: Nächster Schritt
// - Pfeil links: Vorheriger Schritt
// stopImmediatePropagation verhindert, dass andere Handler die Tasten verarbeiten.
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

/**
 * Startet die Tour automatisch beim ersten Besuch.
 * Prüft `localStorage.getItem('beamer-tracer-tour-done')`.
 * Wartet 600ms nach dem Laden, bevor die Tour startet.
 */
export function maybeAutoStartTour() {
  try {
    if (!localStorage.getItem('beamer-tracer-tour-done')) {
      setTimeout(startTour, 600);
    }
  } catch (_) { /* ignore */ }
}

/**
 * Registriert den Tour-Button im Hilfe-Dialog und den Auto-Start.
 * Muss einmalig beim App-Start aufgerufen werden.
 */
export function initTour() {
  // Button in help overlay
  const btnTourFromHelp = document.getElementById('btn-tour-start');
  if (btnTourFromHelp) {
    btnTourFromHelp.addEventListener('click', () => startTour());
  }

  // Auto-start for first-time users
  maybeAutoStartTour();
}
