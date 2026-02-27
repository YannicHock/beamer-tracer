# 🚀 Quickstart für Entwickler – Beamer Tracer

Leitfaden für Entwickler, die am Beamer Tracer mitarbeiten möchten.

---

## Inhaltsverzeichnis

1. [Entwicklungsumgebung einrichten](#entwicklungsumgebung-einrichten)
2. [Projekt starten](#projekt-starten)
3. [Code-Konventionen](#code-konventionen)
4. [Neues Feature hinzufügen](#neues-feature-hinzufügen)
5. [Debugging](#debugging)
6. [Häufige Stolpersteine](#häufige-stolpersteine)
7. [Build & Release](#build--release)

---

## Entwicklungsumgebung einrichten

### Voraussetzungen

- **Node.js** ≥ 18 (empfohlen: aktueller LTS)
- **npm** ≥ 9
- **Git**
- **Editor:** VS Code empfohlen (ESM-Unterstützung, Electron-Debugging)

### Installation

```bash
git clone <repository-url>
cd beamer-tracer
npm install
```

### Abhängigkeiten

Das Projekt hat **keine Runtime-Dependencies** – alle `dependencies` sind DevDependencies:

| Package | Zweck |
|---------|-------|
| `electron` | Desktop-Runtime |
| `electron-builder` | Erstellen portabler Binaries |
| `esbuild` | Blitzschnelles JavaScript-Bundling |

---

## Projekt starten

```bash
npm start
```

Dieser Befehl:
1. Führt `esbuild` aus → bündelt `src/renderer/main.js` nach `dist/renderer.js`
2. Startet Electron mit dem Main Process (`src/main/main.js`)

### Nur Bundling (ohne Electron starten)

```bash
npm run bundle
```

### Wichtig: Nach jeder Änderung im Renderer

Es gibt **kein Watch-Mode** konfiguriert. Nach Änderungen in `src/renderer/**` muss `npm start` erneut ausgeführt werden, oder du fügst einen Watch-Befehl hinzu:

```bash
# Optional: Watch-Mode hinzufügen
npx esbuild src/renderer/main.js --bundle --outfile=dist/renderer.js --format=iife --platform=browser --watch
```

Dann kannst du in Electron mit `Ctrl+R` die Seite neu laden.

---

## Code-Konventionen

### Allgemein

- **Sprache:** JavaScript (ES6+), kein TypeScript
- **Module:** ES6 `import`/`export` im Renderer, CommonJS `require` im Main/Preload
- **Formatierung:** 2 Spaces Einrückung, einfache Anführungszeichen
- **Keine Frameworks:** Kein React, Vue o.ä. – reines DOM + Canvas

### State-Management

- **Zentraler State:** `src/renderer/core/state.js` ist die Single Source of Truth
- **Direkte Mutation:** State-Properties werden direkt gesetzt (kein Redux, kein Proxy)
- **Nach jeder Änderung:** `render()` aufrufen (aus `render/index.js`)
- **Persistierung:** `saveState()` aufrufen (aus `services/persistence.js`)

```javascript
// ✅ Korrekt
state.zoom = 1.5;
render();
saveState();

// ❌ Falsch: State ändern ohne Render
state.zoom = 1.5;
```

### DOM-Referenzen

- Alle DOM-Referenzen sind in `core/dom.js` zentralisiert
- Neue DOM-Elemente dort hinzufügen und importieren – **nicht** `document.getElementById()` in Feature-Dateien verwenden (Ausnahme: Feature-spezifische Elemente, die nur dort gebraucht werden)

### Canvas-Zeichnung

- Alle Canvas-Operationen in `render/` oder `features/*/…Overlay.js`
- Den `ctxOvl` (Overlay-Kontext) immer mit `save()`/`restore()` umschließen
- Farben über `hexToRgba()` aus `core/utils.js` generieren

### Imports

- Relative Importe innerhalb des Renderers
- Dynamische Imports (`import()`) nur bei zirkulären Abhängigkeiten

---

## Neues Feature hinzufügen

### Schritt 1: Ordner erstellen

```
src/renderer/features/meinFeature/
  meinFeature.js            # Logik
  meinFeatureOverlay.js     # Canvas-Zeichnung (falls nötig)
```

### Schritt 2: State erweitern

In `core/state.js` neue Properties hinzufügen:

```javascript
const state = {
  // ...bestehende Properties...
  
  // ── Mein Feature ──
  meinFeatureActive: false,
  meinFeatureData: [],
};
```

### Schritt 3: Init-Funktion exportieren

```javascript
// features/meinFeature/meinFeature.js
export function initMeinFeature() {
  // Event-Listener binden
  document.getElementById('btn-mein-feature').addEventListener('click', toggle);
}
```

### Schritt 4: In main.js registrieren

```javascript
// renderer/main.js
import { initMeinFeature } from './features/meinFeature/meinFeature.js';

async function init() {
  // ...bestehende Initialisierungen...
  initMeinFeature();
}
```

### Schritt 5: Overlay-Zeichnung registrieren (falls nötig)

In `render/index.js` die Draw-Funktion aufrufen:

```javascript
import { drawMeinFeature } from '../features/meinFeature/meinFeatureOverlay.js';

export function renderOverlay() {
  // ...bestehende Overlays...
  if (state.meinFeatureActive) drawMeinFeature();
}
```

### Schritt 6: Persistierung (falls nötig)

In `services/persistence.js`:
- `saveState()`: Property in `data`-Objekt aufnehmen
- `restoreState()`: Property aus `saved` wiederherstellen

---

## Debugging

### Electron DevTools

Im Entwicklungsmodus kannst du die Chrome DevTools öffnen:
- `Ctrl+Shift+I` (falls Menüleiste sichtbar)
- Oder in `main.js` hinzufügen: `win.webContents.openDevTools();`

### Häufige Debug-Schritte

1. **State inspizieren:** In der Console `state` ist nicht global – füge vorübergehend `window._state = state;` in `renderer/main.js` hinzu
2. **Render-Probleme:** Setze Breakpoints in `render/index.js`
3. **IPC-Probleme:** Prüfe die Main-Process-Console (Terminal, in dem `npm start` läuft)

### Error-Overlay

Fehler beim Bootstrap werden automatisch als rotes Overlay angezeigt (siehe `renderer/main.js` → `catch`-Block).

---

## Häufige Stolpersteine

### 1. „Änderungen werden nicht sichtbar"
→ Renderer muss neu gebündelt werden: `npm start` erneut ausführen.

### 2. „Module not found" nach neuem Import
→ Prüfe, ob der Pfad relativ korrekt ist. esbuild löst Pfade relativ zum importierenden Modul auf.

### 3. „contextBridge" / „electronAPI is undefined"
→ Du bist im Renderer. Dort gibt es kein Node.js. Alle Main-Process-Funktionen müssen über `window.electronAPI` aufgerufen werden (definiert in `preload.js`).

### 4. Zirkuläre Imports
→ Wenn Feature A Feature B importiert und umgekehrt, verwende dynamische Imports:
```javascript
if (state.featureA) {
  import('../featureB/featureB.js').then(m => m.doSomething());
}
```

### 5. Canvas-Zeichnungen verschwinden
→ `render()` wird bei jedem Frame beide Canvas komplett neu gezeichnet (`clearRect`). Zeichne nicht außerhalb des Render-Zyklus.

### 6. Konfigurationsdatei wächst stark
→ Das Bild wird als Base64-Data-URL in der Config gespeichert. Bei großen Bildern kann die Datei mehrere MB groß werden.

---

## Build & Release

### Windows Portable EXE

```bash
npm run build:win
```

Erzeugt: `dist/BeamerTracer-Portable.exe`

### macOS DMG

```bash
npm run build:mac
```

### Portable Konfiguration

Die EXE sucht die Konfigurationsdatei `beamer-tracer-config.json` **im selben Ordner wie die EXE**. Das ermöglicht:
- Betrieb vom USB-Stick
- Individuelle Einstellungen pro Kopie
- Keine Registry- oder AppData-Einträge

### Hinweis: `.gitignore`

Die Datei `beamer-tracer-config.json` enthält nutzerspezifische Daten (inkl. Base64-Bilddaten) und sollte in `.gitignore` aufgenommen werden, sofern noch nicht geschehen.
