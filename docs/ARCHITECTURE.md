# 🏗️ Architektur – Beamer Tracer

Dieses Dokument beschreibt die technische Architektur der Electron-Anwendung **Beamer Tracer**. Es richtet sich an Entwickler, die das Projekt verstehen, erweitern oder Fehler beheben möchten.

---

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Prozess-Architektur (Electron)](#prozess-architektur-electron)
3. [Verzeichnisstruktur](#verzeichnisstruktur)
4. [Datenfluss](#datenfluss)
5. [Zentraler State](#zentraler-state)
6. [Render-Pipeline](#render-pipeline)
7. [IPC-Kanäle](#ipc-kanäle)
8. [Persistenz-Strategie](#persistenz-strategie)
9. [Build & Bundling](#build--bundling)
10. [Feature-Architektur-Muster](#feature-architektur-muster)

---

## Überblick

Beamer Tracer ist eine portable Electron-Desktop-Anwendung zum Anzeigen von Bildern über einen Beamer. Die App ermöglicht feingranulares Pan & Zoom, verschiedene Hilfslinien-Overlays, eine 2-Schritt-Maßstab-Kalibrierung und ein Messwerkzeug.

**Technologie-Stack:**
- **Runtime:** Electron 40+
- **Bundler:** esbuild (IIFE-Format für den Renderer)
- **Sprache:** Vanilla JavaScript (ES6-Module im Renderer)
- **Rendering:** HTML5 Canvas (2D-Kontext, kein WebGL)
- **Packaging:** electron-builder (Portable EXE / DMG)

---

## Prozess-Architektur (Electron)

Electron arbeitet mit einer strikten Prozess-Trennung:

```
┌─────────────────────────────────────────────────────────┐
│                    Main Process                          │
│  src/main/main.js                                       │
│  ─ Erstellt das BrowserWindow                           │
│  ─ Verwaltet IPC-Handler (Datei-Dialog, Config, FS)     │
│  ─ Zugriff auf Node.js & Dateisystem                    │
└──────────────────────┬──────────────────────────────────┘
                       │ IPC (invoke/handle, send/on)
┌──────────────────────┴──────────────────────────────────┐
│                   Preload Script                         │
│  src/preload/preload.js                                  │
│  ─ Context Bridge: exponiert `window.electronAPI`        │
│  ─ Einziger Berührungspunkt zwischen Main und Renderer   │
└──────────────────────┬──────────────────────────────────┘
                       │ window.electronAPI.*
┌──────────────────────┴──────────────────────────────────┐
│                  Renderer Process                        │
│  src/renderer/ (gebündelt via esbuild → dist/renderer.js)│
│  ─ Kein Node.js-Zugriff (contextIsolation: true)         │
│  ─ ES6-Module, zentraler State, Canvas-Rendering         │
│  ─ Alle UI-Logik, Events, Features                       │
└─────────────────────────────────────────────────────────┘
```

**Wichtig:** `nodeIntegration` ist deaktiviert und `contextIsolation` ist aktiviert. Der Renderer kann nur über die in `preload.js` definierte `window.electronAPI`-Schnittstelle mit dem Main-Prozess kommunizieren.

---

## Verzeichnisstruktur

```
beamer-tracer/
├── package.json                  # Projektdefinition, Scripts, Dependencies
├── beamer-tracer-config.json     # Portable Konfigurationsdatei (generiert)
├── docs/                         # Dokumentation
│   ├── ARCHITECTURE.md           # Dieses Dokument
│   ├── QUICKSTART.md           # Entwickler-Leitfaden
│   └── FEATURES.md               # Feature-Dokumentation
├── dist/                         # Gebündeltes Renderer-Script (generiert)
│   └── renderer.js
├── src/
│   ├── main/
│   │   └── main.js               # Electron Main Process
│   ├── preload/
│   │   └── preload.js            # Context Bridge (electronAPI)
│   └── renderer/
│       ├── main.js               # Entry Point – Bootstrap aller Module
│       ├── index.html            # HTML-Markup (Toolbar, Modals, Canvas)
│       ├── styles.css            # Vollständiges Styling (789 Zeilen)
│       ├── core/                 # Kern-Module (State, Konstanten, DOM, Utils)
│       │   ├── state.js          # Zentraler State (Single Source of Truth)
│       │   ├── constants.js      # Konstanten (Pan/Zoom-Steps, Radien, …)
│       │   ├── dom.js            # Gecachte DOM-Element-Referenzen
│       │   └── utils.js          # Hilfs-Funktionen (Farb-Konvertierung, Koordinaten)
│       ├── services/             # Querschnitts-Dienste
│       │   ├── canvas.js         # Canvas-Resize & Window-Resize-Handler
│       │   └── persistence.js    # State speichern / laden (Datei + localStorage)
│       ├── render/               # Rendering-Pipeline
│       │   ├── index.js          # Render-Orchestrator (ruft alle Renderer auf)
│       │   └── image.js          # Bild-Rendering (Translate/Scale/Filter)
│       ├── features/             # Feature-Module (jeweils in eigenem Ordner)
│       │   ├── calibration/      # 2-Schritt-Maßstab-Kalibrierung
│       │   │   ├── calibration.js        # Logik (State-Übergänge, Berechnung)
│       │   │   └── calibrationOverlay.js # Canvas-Zeichnung (Referenzlinie, Punkte)
│       │   ├── measurement/      # Messwerkzeug
│       │   │   ├── measurement.js        # Logik (Aktivierung, Punkte-Verwaltung)
│       │   │   └── measureOverlay.js     # Canvas-Zeichnung (Linien, Labels)
│       │   ├── overlays/         # Hilfslinien-Overlays
│       │   │   ├── overlays.js           # Toggle-Logik & Button-Init
│       │   │   └── overlayRenderer.js    # Canvas-Zeichnung (Grid, Center, …)
│       │   ├── settings/         # Overlay-Einstellungen & Filter
│       │   │   └── settings.js
│       │   ├── fullscreen/       # Vollbild-Verwaltung
│       │   │   └── fullscreen.js
│       │   ├── contextMenu/      # Rechtsklick-Kontextmenü
│       │   │   └── contextMenu.js
│       │   └── tour/             # Onboarding-Einführungstour
│       │       └── tour.js
│       └── events/               # Event-Handler
│           ├── keyboard.js       # Tastatur (Pan, Zoom, Shortcuts)
│           ├── mouse.js          # Maus (Pan-Drag, Zoom, Kalibrierung, Messung)
│           └── dragdrop.js       # Drag & Drop, Paste, Datei-Dialog
```

---

## Datenfluss

```
Benutzer-Aktion (Tastatur/Maus/UI)
         │
         ▼
   Event-Handler
   (events/*.js, features/*/*.js)
         │
         ▼
   State-Mutation
   (core/state.js wird direkt modifiziert)
         │
         ▼
   render() aufrufen
   (render/index.js)
         │
    ┌────┴────┐
    ▼         ▼
renderImage()  renderOverlay()
(render/       (render/index.js →
 image.js)      overlayRenderer.js,
                calibrationOverlay.js,
                measureOverlay.js)
         │
         ▼
   saveState()
   (services/persistence.js)
         │
    ┌────┴────┐
    ▼         ▼
localStorage   electronAPI.writeConfig()
(schneller     (persistente JSON-Datei
 Cache)         neben der EXE)
```

**Kernprinzip:** Nach jeder State-Änderung wird `render()` aufgerufen, um beide Canvas-Layer (Bild + Overlay) neu zu zeichnen. Anschließend wird `saveState()` aufgerufen, um den Zustand zu persistieren.

---

## Zentraler State

Der gesamte Anwendungszustand liegt in einem einzigen Objekt in `core/state.js`. Es gibt **kein** State-Management-Framework – der State wird direkt mutiert.

### State-Kategorien

| Kategorie | Properties | Beschreibung |
|-----------|-----------|--------------|
| **Image** | `img`, `imgSrc` | HTMLImageElement und Data-URL des geladenen Bildes |
| **Viewport** | `zoom`, `panX`, `panY` | Aktueller Zoom-Faktor und Pan-Offset |
| **Filter** | `contrast`, `brightness` | CSS-Filter-Werte (50–300%) |
| **Overlays** | `overlays.*`, `gridSize`, `gridSizeCm`, `overlayStyles` | Ein/Aus-Status und Styling aller Overlays |
| **Crosshair** | `crosshairMouseX`, `crosshairMouseY` | Aktuelle Mausposition für Fadenkreuz |
| **Calibration** | `calibrateStep`, `calibratePoints`, `refLine*`, `screenPxPerMeter`, `calibrated*`, `calPoint*`, `calibration.pxPerCm` | 2-Schritt-Kalibrierungs-Zustand |
| **Measurement** | `measureActive`, `measurements`, `measureCurrentIdx`, `measureDragging` | Messwerkzeug-Zustand |
| **Drag** | `dragging`, `dragStart*`, `panStart*` | Bild-Pan per Mausdrag |
| **Ref-Drag** | `refDragging`, `refDragStart*`, `refPanStart*` | Referenzlinien-Drag (Kalibrierung Schritt 1) |
| **Fullscreen** | `isFullscreen`, `fullscreenToolbarTimeout` | Vollbild-Zustand |

---

## Render-Pipeline

Die Anwendung verwendet **zwei übereinander liegende Canvas-Elemente**:

1. **`canvas-image`** (unten): Zeichnet das Bild mit Zoom, Pan und CSS-Filtern
2. **`canvas-overlay`** (oben): Zeichnet alle Overlays, Hilfslinien und UI-Elemente

### Render-Reihenfolge (`render/index.js`)

```
render()
 ├── renderImage()          → canvas-image: Bild mit Transformationen + Filtern
 └── renderOverlay()        → canvas-overlay:
      ├── drawGrid()        → Rasterlinien (pixelbasiert oder cm-basiert)
      ├── drawCenter()      → Horizontale + vertikale Mittellinie
      ├── drawThirds()      → Drittel-Linien (gestrichelt)
      ├── drawRuler()       → Maßstab-Referenz am unteren Rand
      ├── drawReferenceLine()  → Gelbe 1-Meter-Linie (nur Kalibrierung Schritt 1)
      ├── drawCalibrationPoints() → Kalibrierpunkte + Verbindungslinie (Schritt 2)
      ├── drawMeasurements()    → Alle Mess-Linien + Labels
      └── drawCrosshair()      → Fadenkreuz + Koordinatenanzeige
```

### Koordinaten-System

- **Image-Pixel:** Koordinaten im Original-Bild (0,0 = links oben)
- **Screen-Pixel:** Koordinaten auf dem Bildschirm/Canvas

Transformation: `screenX = imgX * zoom + panX`  
Umkehrung: `imgX = (screenX - panX) / zoom`

Die Funktionen `imgToScreen()` und `screenToImg()` in `core/utils.js` kapseln diese Umrechnung.

---

## IPC-Kanäle

| Kanal | Richtung | Beschreibung |
|-------|----------|--------------|
| `config:read` | Renderer → Main | Liest die portable JSON-Konfigurationsdatei |
| `config:write` | Renderer → Main | Schreibt State in die portable JSON-Datei |
| `dialog:openFile` | Renderer → Main | Öffnet nativen Datei-Dialog, gibt Bild als Data-URL zurück |
| `fullscreen:toggle` | Renderer → Main | Schaltet Vollbild um, gibt neuen Status zurück |
| `fullscreen:get` | Renderer → Main | Gibt aktuellen Vollbild-Status zurück |
| `fullscreen:changed` | Main → Renderer | Benachrichtigt bei Vollbild-Änderung (z.B. durch OS) |

---

## Persistenz-Strategie

Die App nutzt eine **duale Persistenz-Strategie**:

1. **localStorage** (schneller Cache): Sofort verfügbar, überlebt aber keine Neuinstallation
2. **Portable JSON-Datei** (`beamer-tracer-config.json`): Liegt neben der EXE (portabel auf USB-Stick)

### Beim Speichern (`saveState`):
- Schreibt in **beide** Speicher gleichzeitig
- Speichert: Zoom, Pan, Filter, Grid-Einstellungen, Overlay-Styles, Kalibrierungs-Daten und das Bild (als Base64 Data-URL)

### Beim Laden (`restoreState`):
1. Versucht zuerst `electronAPI.readConfig()` (portable Datei)
2. Falls nicht verfügbar: Fallback auf `localStorage`
3. Stellt alle State-Werte wieder her
4. Lädt das Bild asynchron (via `Image.onload`)

### Pfad-Ermittlung (Main Process):
- **Gepackt:** `path.dirname(process.resourcesPath)` → Ordner der EXE
- **Dev-Modus:** Projektordner (2 Ebenen über `src/main/`)

---

## Build & Bundling

### esbuild-Konfiguration

```bash
esbuild src/renderer/main.js --bundle --outfile=dist/renderer.js --format=iife --platform=browser
```

- **Entry Point:** `src/renderer/main.js`
- **Output:** `dist/renderer.js` (einzelne Datei)
- **Format:** IIFE (Immediately Invoked Function Expression) – läuft im Browser ohne Module-Loader
- **Platform:** `browser` (kein Node.js im Renderer)

### NPM-Scripts

| Script | Beschreibung |
|--------|--------------|
| `npm run bundle` | Nur esbuild-Bundling |
| `npm start` | Bundle + Electron starten (Entwicklung) |
| `npm run build:win` | Bundle + Portable Windows EXE erstellen |
| `npm run build:mac` | Bundle + macOS DMG erstellen |

### Warum esbuild?

Da der Renderer `contextIsolation: true` nutzt, können ES6-Module nicht direkt geladen werden. esbuild bündelt alle Module in eine einzige IIFE-Datei, die via `<script>`-Tag in `index.html` eingebunden wird.

---

## Feature-Architektur-Muster

Jedes Feature folgt einem einheitlichen Muster:

### 1. Ordner-Struktur
```
features/
  featureName/
    featureName.js          # Logik (State-Manipulation, Event-Handler)
    featureNameOverlay.js   # Canvas-Zeichnung (optional)
```

### 2. Initialisierung
Jedes Feature exportiert eine `initFeatureName()`-Funktion, die:
- Event-Listener an DOM-Elemente bindet
- Initiale UI-Synchronisation durchführt

Alle `init*`-Funktionen werden in `renderer/main.js` in der richtigen Reihenfolge aufgerufen.

### 3. Zirkuläre Abhängigkeiten
Einige Features referenzieren sich gegenseitig (z.B. Kalibrierung deaktiviert Messmodus). Um zirkuläre Imports zu vermeiden, werden **dynamische Imports** verwendet:

```javascript
// In calibration.js:
if (state.measureActive) {
  import('../measurement/measurement.js').then(m => m.deactivateMeasureMode());
}
```

### 4. Render-Integration
Draw-Funktionen werden im Render-Orchestrator (`render/index.js`) aufgerufen, nicht in den Features selbst. Features rufen nach State-Änderungen `render()` auf.

