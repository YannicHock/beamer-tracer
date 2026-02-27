/**
 * @module renderer/core/state
 * @description Zentraler Anwendungs-State (Single Source of Truth).
 *
 * Dieses Modul exportiert ein einzelnes State-Objekt, das den gesamten
 * Zustand der Anwendung enthält. Es gibt kein State-Management-Framework –
 * Properties werden direkt mutiert.
 *
 * **Wichtige Konvention:** Nach jeder State-Änderung muss `render()` aus
 * `render/index.js` aufgerufen werden, um die Anzeige zu aktualisieren.
 * Für persistente Änderungen zusätzlich `saveState()` aus `services/persistence.js`.
 *
 * Die Properties sind in folgende Kategorien gruppiert:
 * - **Image:** Geladenes Bild und dessen Data-URL
 * - **Viewport:** Zoom-Faktor und Pan-Offset
 * - **Filter:** Kontrast- und Helligkeitswerte
 * - **Overlays:** Ein/Aus-Status und Styling aller Hilfslinien
 * - **Crosshair:** Aktuelle Mausposition für Fadenkreuz-Zeichnung
 * - **Calibration:** Zustand der 2-Schritt-Kalibrierung
 * - **Measurement:** Zustand des Messwerkzeugs
 * - **Drag:** Zustand des Bild-Pan-Drags per Maus
 * - **Ref-Drag:** Zustand des Referenzlinien-Drags (Kalibrierung Schritt 1)
 * - **Fullscreen:** Vollbild-Status und Toolbar-Timeout
 */

import { DEFAULT_OVERLAY_STYLES } from './constants.js';

/**
 * Das aktuell geladene Bild als HTMLImageElement.
 * `null` wenn kein Bild geladen ist.
 * @type {HTMLImageElement | null}
 */
let img = null;

/**
 * Die Data-URL (Base64) des aktuell geladenen Bildes.
 * Wird für die Persistierung verwendet.
 * @type {string | null}
 */
let imgSrc = null;

/**
 * Zentrales State-Objekt der Anwendung.
 *
 * `img` und `imgSrc` verwenden Getter/Setter, um die privaten Variablen
 * zu kapseln und gleichzeitig über den State-Zugriff zugänglich zu machen.
 *
 * @type {Object}
 */
const state = {
  // ── Image ──
  get img() { return img; },
  set img(v) { img = v; },
  get imgSrc() { return imgSrc; },
  set imgSrc(v) { imgSrc = v; },

  // ── Viewport ──
  /** @type {number} Aktueller Zoom-Faktor (1.0 = 100%, 0.01 = Minimum) */
  zoom: 1.0,
  /** @type {number} Horizontaler Pan-Offset in Screen-Pixeln */
  panX: 0,
  /** @type {number} Vertikaler Pan-Offset in Screen-Pixeln */
  panY: 0,

  // ── Filters ──
  /** @type {number} Kontrast in Prozent (50–300, Standard: 100) */
  contrast: 100,
  /** @type {number} Helligkeit in Prozent (0–300, Standard: 100) */
  brightness: 100,

  // ── Overlays ──
  /**
   * Ein/Aus-Status der einzelnen Overlays.
   * @type {{ grid: boolean, center: boolean, thirds: boolean, ruler: boolean, crosshair: boolean }}
   */
  overlays: { grid: false, center: false, thirds: false, ruler: false, crosshair: true },
  /** @type {number} Rasterweite in Pixel (unkalibrierter Modus) */
  gridSize: 50,
  /** @type {number} Rasterweite in Zentimetern (kalibrierter Modus) */
  gridSizeCm: 5,

  /**
   * Visuelle Stile der Overlays (Farbe, Deckkraft, Linienstärke).
   * Wird im Settings-Panel konfiguriert und persistiert.
   * @type {{ grid: OverlayStyle, center: OverlayStyle, thirds: OverlayStyle, crosshair: OverlayStyle }}
   */
  overlayStyles: {
    grid:      { ...DEFAULT_OVERLAY_STYLES.grid },
    center:    { ...DEFAULT_OVERLAY_STYLES.center },
    thirds:    { ...DEFAULT_OVERLAY_STYLES.thirds },
    crosshair: { ...DEFAULT_OVERLAY_STYLES.crosshair },
  },

  // ── Crosshair ──
  /** @type {number} X-Position des Mauszeigers im Viewport (Screen-Pixel). -1 = außerhalb */
  crosshairMouseX: -1,
  /** @type {number} Y-Position des Mauszeigers im Viewport (Screen-Pixel). -1 = außerhalb */
  crosshairMouseY: -1,

  // ── Calibration ──
  /**
   * Aktueller Kalibrierungs-Schritt.
   * - 0: Kalibrierung inaktiv
   * - 1: Referenzlinie positionieren (Schritt 1)
   * - 2: Kalibrierpunkte setzen (Schritt 2)
   * @type {0 | 1 | 2}
   */
  calibrateStep: 0,
  /** @type {Array<{imgX: number, imgY: number}>} Gesetzte Kalibrierpunkte (max 2, in Bild-Koordinaten) */
  calibratePoints: [],
  /** @type {number} X-Position der Referenzlinie in Screen-Pixeln (Schritt 1) */
  refLineX: 0,
  /** @type {number} Y-Position der Referenzlinie in Screen-Pixeln (Schritt 1) */
  refLineY: 0,
  /** @type {number} Zoom-Faktor der Referenzlinie (Schritt 1, 1.0 = REF_BASE_PX) */
  refLineZoom: 1.0,
  /** @type {number|null} Screen-Pixel pro Meter (ermittelt in Schritt 1). null = nicht kalibriert */
  screenPxPerMeter: null,
  /** @type {number|null} Zoom-Wert der kalibrierten Ansicht. null = keine Kalibrierung */
  calibratedZoom: null,
  /** @type {number|null} PanX-Wert der kalibrierten Ansicht */
  calibratedPanX: null,
  /** @type {number|null} PanY-Wert der kalibrierten Ansicht */
  calibratedPanY: null,
  /** @type {number} Index des gerade per Drag verschobenen Kalibrierpunkts (-1 = keiner) */
  calPointDragging: -1,
  /** @type {number} Index des ausgewählten Kalibrierpunkts (-1 = keiner) */
  calPointSelected: -1,
  /**
   * Kalibrierungs-Ergebnis.
   * @type {{ pxPerCm: number|null }} pxPerCm = Bild-Pixel pro Zentimeter (null = nicht kalibriert)
   */
  calibration: { pxPerCm: null },

  // ── Measurement ──
  /** @type {boolean} Messmodus aktiv? */
  measureActive: false,
  /**
   * Alle Messungen. Jede Messung hat 2 Punkte (p1 und p2) in Bild-Koordinaten.
   * p2 ist null, wenn die Messung noch nicht abgeschlossen ist.
   * @type {Array<{p1: {imgX: number, imgY: number}, p2: {imgX: number, imgY: number}|null}>}
   */
  measurements: [],
  /** @type {number} Index der aktuell laufenden Messung (-1 = keine laufende) */
  measureCurrentIdx: -1,
  /**
   * Codierter Index des gerade per Drag verschobenen Messpunkts.
   * Kodierung: measureIndex * 10 + pointIndex (0 = p1, 1 = p2). -1 = kein Drag.
   * @type {number}
   */
  measureDragging: -1,

  // ── Drag (image pan) ──
  /** @type {boolean} Wird das Bild gerade per Maus verschoben? */
  dragging: false,
  /** @type {number} Maus-X bei Drag-Start (clientX) */
  dragStartX: 0,
  /** @type {number} Maus-Y bei Drag-Start (clientY) */
  dragStartY: 0,
  /** @type {number} panX-Wert bei Drag-Start */
  panStartX: 0,
  /** @type {number} panY-Wert bei Drag-Start */
  panStartY: 0,

  // ── Drag (reference line step 1) ──
  /** @type {boolean} Wird die Referenzlinie gerade per Maus verschoben? (Kalibrierung Schritt 1) */
  refDragging: false,
  /** @type {number} Maus-X bei Referenzlinien-Drag-Start */
  refDragStartX: 0,
  /** @type {number} Maus-Y bei Referenzlinien-Drag-Start */
  refDragStartY: 0,
  /** @type {number} refLineX-Wert bei Drag-Start */
  refPanStartX: 0,
  /** @type {number} refLineY-Wert bei Drag-Start */
  refPanStartY: 0,

  // ── Fullscreen ──
  /** @type {boolean} Ist die Anwendung im Vollbildmodus? */
  isFullscreen: false,
  /** @type {number|null} Timeout-ID für das automatische Ausblenden der Toolbar im Vollbild */
  fullscreenToolbarTimeout: null,
};

export default state;

