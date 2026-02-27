# 🎯 Beamer Tracer

Portable Electron-App zum Vorzeichnen mit einem Beamer. Bild laden, feingranular positionieren, Hilfslinien einblenden – direkt vom USB-Stick starten.

> **Für Entwickler:** Detaillierte technische Dokumentation findest du in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/QUICKSTART.md`](docs/QUICKSTART.md) und [`docs/FEATURES.md`](docs/FEATURES.md).

---

## Features

- **Feingranulares Pan & Zoom** – Pfeiltasten (1px / 5px / 50px), Mausrad-Zoom zum Cursor
- **Maus-Drag** – Bild per Linksklick oder Mitteltaste ziehen
- **Hilfslinien** – Raster (konfigurierbare Weite in px oder cm), Mittellinien, Drittel-Raster, Fadenkreuz
- **Maßstab-Kalibrierung** – 2-Schritt-Prozess: Projektionsfläche vermessen → bekannten Abstand im Bild markieren → kalibriertes Lineal in cm
- **Messwerkzeug** – Abstände im Bild messen (in Pixel und nach Kalibrierung in cm)
- **Kontrast & Helligkeit** – Live-Slider (50%–300%)
- **Overlay-Einstellungen** – Farbe, Deckkraft und Linienstärke aller Overlays individuell anpassbar
- **Session-Restore** – Letzte Datei, Zoom, Position, Kalibrierung und Einstellungen werden automatisch gespeichert
- **Einführungstour** – Interaktive Onboarding-Tour für neue Benutzer
- **Kontextmenü** – Rechtsklick für Schnellzugriff auf alle Funktionen
- **Portabel** – Als einzelne `.exe` ohne Installation lauffähig (USB-Stick-tauglich)

---

## Schnellstart

### Voraussetzungen

- [Node.js](https://nodejs.org/) ≥ 18 (mit npm)
- Git

### Installation & Start

```bash
git clone <repository-url>
cd beamer-tracer
npm install
npm start
```

`npm start` bündelt den Renderer-Code mit esbuild und startet die Electron-App.

---

## Tastenkürzel

| Taste | Aktion |
|---|---|
| Pfeiltasten | Pan (5px) |
| Shift + Pfeiltasten | Fein-Pan (1px) |
| Ctrl + Pfeiltasten | Grob-Pan (50px) |
| + / − | Zoom rein/raus (1%) |
| Mausrad | Zoom zum Cursor |
| Linke Maus / Mitteltaste | Bild ziehen |
| G | Raster ein/aus |
| C | Mittellinien ein/aus |
| T | Drittel-Linien ein/aus |
| R | Maßstab ein/aus |
| X | Fadenkreuz ein/aus |
| M | Messwerkzeug ein/aus |
| F / F11 | Vollbild ein/aus |
| 0 | Ansicht zurücksetzen |
| Ctrl + O | Bild laden (Datei-Dialog) |
| Ctrl + V | Bild aus Zwischenablage einfügen |
| H / F1 | Hilfe anzeigen |

---

## Projektstruktur

```
beamer-tracer/
├── package.json                  # Projekt-Definition, Scripts, DevDependencies
├── beamer-tracer-config.json     # Portable Konfiguration (generiert, nicht einchecken)
├── docs/                         # Entwickler-Dokumentation
│   ├── ARCHITECTURE.md           # Technische Architektur & Datenfluss
│   ├── QUICKSTART.md           # Entwickler-Leitfaden & Konventionen
│   └── FEATURES.md               # Detaillierte Feature-Dokumentation
├── dist/                         # Gebündelter Renderer (generiert)
│   └── renderer.js
├── src/
│   ├── main/
│   │   └── main.js               # Electron Main Process (IPC, Fenster, Datei-I/O)
│   ├── preload/
│   │   └── preload.js            # Context Bridge → window.electronAPI
│   └── renderer/                 # Renderer-Code (ES6 Module, gebündelt via esbuild)
│       ├── main.js               # Entry Point – Bootstrap aller Module
│       ├── index.html            # HTML-Markup (Toolbar, Modals, Canvas, Menüs)
│       ├── styles.css            # Vollständiges Styling
│       ├── core/                 # Kern-Module
│       │   ├── state.js          # Zentraler State (Single Source of Truth)
│       │   ├── constants.js      # Konstanten (Pan/Zoom-Steps, Radien, …)
│       │   ├── dom.js            # Gecachte DOM-Element-Referenzen
│       │   └── utils.js          # Hilfsfunktionen (Farbe, Koordinaten)
│       ├── services/             # Querschnitts-Dienste
│       │   ├── canvas.js         # Canvas-Resize-Handling
│       │   └── persistence.js    # State speichern/laden (Datei + localStorage)
│       ├── render/               # Rendering-Pipeline
│       │   ├── index.js          # Render-Orchestrator
│       │   └── image.js          # Bild-Rendering (Zoom, Pan, Filter)
│       ├── features/             # Feature-Module
│       │   ├── calibration/      # 2-Schritt-Maßstab-Kalibrierung
│       │   ├── measurement/      # Messwerkzeug
│       │   ├── overlays/         # Hilfslinien (Grid, Center, Thirds, Ruler, Crosshair)
│       │   ├── settings/         # Overlay-Einstellungen & Filter
│       │   ├── fullscreen/       # Vollbild-Verwaltung
│       │   ├── contextMenu/      # Rechtsklick-Kontextmenü
│       │   └── tour/             # Onboarding-Einführungstour
│       └── events/               # Event-Handler
│           ├── keyboard.js       # Tastatur (Pan, Zoom, Shortcuts)
│           ├── mouse.js          # Maus (Drag, Zoom, Kalibrierung, Messung)
│           └── dragdrop.js       # Drag & Drop, Paste, Datei-Dialog
```

---

## Build

### Portable .exe bauen (Windows)

```bash
npm run build:win
```

Erzeugt `dist/BeamerTracer-Portable.exe` – direkt auf einen USB-Stick kopieren und starten.
Die Konfigurationsdatei wird automatisch neben der EXE erstellt.

### macOS bauen

```bash
npm run build:mac
```

---

## Dokumentation für Entwickler

| Dokument | Inhalt |
|----------|--------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Prozess-Architektur, Datenfluss, State, Render-Pipeline, IPC, Persistenz, Build |
| [docs/QUICKSTART.md](docs/QUICKSTART.md) | Einrichtung, Code-Konventionen, Feature-Architektur, Debugging, Stolpersteine |
| [docs/FEATURES.md](docs/FEATURES.md) | Alle Features im Detail: Kalibrierung, Messung, Overlays, Tour, etc. |

Zusätzlich sind alle Quelldateien mit **JSDoc-Kommentaren** versehen, die Module, Funktionen, Parameter und Rückgabewerte dokumentieren.

---

## Lizenz

MIT
