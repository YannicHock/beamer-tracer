# 🎯 Beamer Tracer

Portable Electron-App zum Vorzeichnen mit einem Beamer. Bild laden, feingranular positionieren, Hilfslinien einblenden – direkt vom USB-Stick starten.

## Features

- **Feingranulares Pan & Zoom** – Pfeiltasten (1px / 5px / 50px), Mausrad-Zoom zum Cursor
- **Maus-Drag** – Bild per Linksklick oder Mitteltaste ziehen
- **Hilfslinien** – Raster (konfigurierbare Weite), Mittellinien, Drittel-Raster
- **Maßstab-Kalibrierung** – 2 Punkte klicken, bekannte Strecke eingeben → kalibriertes Lineal
- **Kontrast & Helligkeit** – Live-Slider
- **Session-Restore** – Letzte Datei, Zoom, Position und Einstellungen werden gespeichert
- **Portabel** – Als einzelne `.exe` ohne Installation lauffähig

## Tastenkürzel

| Taste | Aktion |
|---|---|
| Pfeiltasten | Pan (5px) |
| Shift + Pfeiltasten | Fein-Pan (1px) |
| Ctrl + Pfeiltasten | Grob-Pan (50px) |
| + / − | Zoom rein/raus |
| Mausrad | Zoom zum Cursor |
| G | Raster ein/aus |
| C | Mittellinien |
| T | Drittel-Linien |
| R | Maßstab-Referenz |
| 0 | Ansicht zurücksetzen |
| Ctrl + O | Bild laden |
| H / F1 | Hilfe anzeigen |

## Projektstruktur

```
├── main.js                  # Electron Main Process (IPC, Fenster)
├── preload.js               # Context Bridge (electronAPI)
├── index.html               # UI-Markup
├── styles.css               # Styling
└── src/renderer/            # Renderer (ES6 Module)
    ├── main.js              # Entry Point – initialisiert alle Module
    ├── state.js             # Zentraler State (Single Source of Truth)
    ├── constants.js         # Konstanten (Pan/Zoom-Steps, Radien, …)
    ├── dom.js               # DOM-Element-Referenzen
    ├── utils.js             # Hilfsfunktionen (Farbe, Koordinaten)
    ├── canvas.js            # Canvas Resize
    ├── persistence.js       # State speichern / laden
    ├── calibration.js       # Kalibrierungs-Logik (2-Schritt)
    ├── measurement.js       # Messwerkzeug
    ├── settings.js          # Overlay-Einstellungen, Raster, Filter
    ├── fullscreen.js        # Vollbild-Verwaltung
    ├── contextMenu.js       # Rechtsklick-Kontextmenü
    ├── render/
    │   ├── index.js         # Render-Orchestrator
    │   ├── image.js         # Bild-Rendering (Kontrast/Helligkeit)
    │   ├── overlays.js      # Raster, Mitte, Drittel, Maßstab, Fadenkreuz
    │   ├── calibrationOverlay.js  # Referenzlinie + Kalibrierpunkte
    │   └── measureOverlay.js      # Messungen zeichnen
    └── events/
        ├── keyboard.js      # Tastatur-Handler
        ├── mouse.js         # Maus-Handler (Pan, Zoom, Drag, …)
        └── dragdrop.js      # Drag & Drop, Einfügen, Bild laden
```

## Starten (Entwicklung)

```bash
npm install
npm start
```

## Portable .exe bauen (Windows)

```bash
npm run build:win
```

Erzeugt `dist/BeamerTracer-Portable.exe` – direkt auf einen USB-Stick kopieren und starten.

## macOS bauen

```bash
npm run build:mac
```

## Lizenz

MIT
