# 🧩 Features – Beamer Tracer

Detaillierte Dokumentation aller Features der Anwendung. Für jeden Feature-Bereich wird erklärt: Was es tut, wie es funktioniert, welche Dateien beteiligt sind und wie die Implementierung aufgebaut ist.

---

## Inhaltsverzeichnis

1. [Bild laden & anzeigen](#bild-laden--anzeigen)
2. [Pan & Zoom](#pan--zoom)
3. [Overlay-System](#overlay-system)
4. [2-Schritt-Kalibrierung](#2-schritt-kalibrierung)
5. [Messwerkzeug](#messwerkzeug)
6. [Fadenkreuz](#fadenkreuz)
7. [Kontrast & Helligkeit](#kontrast--helligkeit)
8. [Vollbild-Modus](#vollbild-modus)
9. [Kontextmenü](#kontextmenü)
10. [Onboarding-Tour](#onboarding-tour)
11. [Persistenz (Session-Restore)](#persistenz-session-restore)
12. [Overlay-Einstellungen](#overlay-einstellungen)

---

## Bild laden & anzeigen

### Dateien
- `events/dragdrop.js` – Laden-Logik (3 Wege)
- `render/image.js` – Canvas-Rendering des Bildes
- `src/main/main.js` – Nativer Datei-Dialog (IPC)

### Drei Wege zum Laden

| Methode | Auslöser | Implementierung |
|---------|----------|-----------------|
| **Datei-Dialog** | Button „📂 Bild" oder `Ctrl+O` | `electronAPI.openFile()` → Main Process öffnet nativen Dialog, liest Datei, gibt Data-URL zurück |
| **Drag & Drop** | Datei auf Fenster ziehen | `dragover`/`drop`-Events auf `document.body` |
| **Zwischenablage** | `Ctrl+V` | `paste`-Event, durchsucht `clipboardData.items` nach Bildern |

### Interner Ablauf

1. Bild wird als **Data-URL** (Base64) in `state.imgSrc` gespeichert
2. Neues `Image()`-Objekt wird erstellt → `state.img`
3. Bei `onload`: Zoom auf 1.0, Bild zentrieren, `render()` + `saveState()`

### Fallback ohne Electron

Wenn `window.electronAPI` nicht verfügbar ist (z.B. im Browser), wird ein verstecktes `<input type="file">` verwendet.

---

## Pan & Zoom

### Dateien
- `events/mouse.js` – Maus-Drag und Mausrad-Zoom
- `events/keyboard.js` – Tastatur-Pan und Zoom
- `core/constants.js` – Pan-Schrittweiten und Zoom-Step

### Pan (Verschieben)

| Eingabe | Schrittweite |
|---------|-------------|
| Pfeiltasten | 5px (`PAN_NORMAL`) |
| Shift + Pfeiltasten | 1px (`PAN_FINE`) |
| Ctrl + Pfeiltasten | 50px (`PAN_COARSE`) |
| Maus-Drag (links / mitte) | Frei (pixelgenau) |

### Zoom

| Eingabe | Verhalten |
|---------|-----------|
| Mausrad | Zoom zum Cursor-Punkt (`zoomAtPoint`) |
| `+` / `−` | Zoom um 1% zur Canvas-Mitte |
| Alt + Pfeil hoch/runter | Zoom zur Canvas-Mitte (3% / 1% mit Shift) |

### `zoomAtPoint()`-Algorithmus

```
1. Bild-Koordinaten unter dem Cursor berechnen: imgX = (mouseX - panX) / zoom
2. Neuen Zoom-Wert setzen (min 0.01)
3. Pan so anpassen, dass derselbe Bild-Punkt unter dem Cursor bleibt:
   panX = mouseX - imgX * newZoom
```

Dadurch zoomt das Mausrad immer zum Punkt unter dem Cursor – nicht zur Mitte.

---

## Overlay-System

### Dateien
- `features/overlays/overlays.js` – Toggle-Logik
- `features/overlays/overlayRenderer.js` – Canvas-Zeichnung
- `core/state.js` – `state.overlays` (Ein/Aus-Flags)
- `core/state.js` – `state.overlayStyles` (Farbe, Deckkraft, Dicke)

### Verfügbare Overlays

| Overlay | Taste | Beschreibung |
|---------|-------|--------------|
| **Raster** (Grid) | `G` | Gleichmäßiges Gitter über das Bild. Pixelbasiert (unkalibriert) oder cm-basiert (kalibriert) |
| **Mittellinien** (Center) | `C` | Horizontale + vertikale Linie durch die Bildmitte |
| **Drittel** (Thirds) | `T` | Gestrichelte Drittel-Linien (Rule of Thirds) |
| **Maßstab** (Ruler) | `R` | Referenzlinie am unteren Bildschirmrand |
| **Fadenkreuz** (Crosshair) | `X` | Folgt dem Mauszeiger (siehe eigener Abschnitt) |

### Toggle-Mechanismus

`toggleOverlay(key, btnId)` in `overlays.js`:
1. Invertiert `state.overlays[key]`
2. Toggled CSS-Klasse `active` am zugehörigen Button
3. Aufrufer muss `render()` aufrufen

### Raster-Berechnung (Grid)

- **Unkalibriert:** `stepScreen = gridSize * zoom` (Pixel-basiert)
- **Kalibriert:** `stepScreen = gridSizeCm * pxPerCm * zoom` (cm-basiert)
- Raster wird nur im sichtbaren Bildbereich gezeichnet (Performance-Optimierung)
- Bei kalibriertem Raster werden cm-Labels angezeigt

### Styling

Jedes Overlay hat drei konfigurierbare Eigenschaften:
- `color` (Hex-Farbe)
- `opacity` (0.05–1.0)
- `width` (Linienstärke, 0.25–5.0)

Die Konvertierung von Hex+Opacity zu `rgba()` erfolgt über `hexToRgba()` in `utils.js`.

---

## 2-Schritt-Kalibrierung

### Dateien
- `features/calibration/calibration.js` – Logik & State-Übergänge
- `features/calibration/calibrationOverlay.js` – Canvas-Zeichnung

### Zweck

Die Kalibrierung ermöglicht es, Pixel-Abstände in echte Zentimeter umzurechnen. Voraussetzung: Der Beamer projiziert auf eine Fläche mit bekannten Maßen.

### Schritt 1: Projektionsfläche vermessen

**Ziel:** `state.screenPxPerMeter` ermitteln (wie viele Screen-Pixel entsprechen 1 Meter auf der Wand)

**Ablauf:**
1. Gelbe 1-Meter-Referenzlinie wird auf dem Canvas angezeigt
2. Benutzer zieht und skaliert die Linie (Maus-Drag + Mausrad), bis sie genau 1 Meter auf der Wand abdeckt
3. Bei Bestätigung: `screenPxPerMeter = REF_BASE_PX * refLineZoom`

**Steuerung:**
- Maus-Drag: Linie verschieben
- Mausrad / `+` `−`: Linie skalieren
- Pfeiltasten: Feinpositionierung

### Schritt 2: Bild kalibrieren

**Ziel:** `state.calibration.pxPerCm` ermitteln (wie viele Bild-Pixel entsprechen 1 cm)

**Ablauf:**
1. Benutzer klickt 2 Punkte auf dem Bild (bekannter Abstand)
2. Gibt den realen Abstand in cm ein
3. Bei Bestätigung:
   - `pxPerCm = distImgPx / knownCm`
   - Neuer Zoom: `newZoom = (knownCm * screenPxPerCm) / distImgPx`
   - Pan so anpassen, dass die Mitte der 2 Punkte zentriert ist
   - Kalibrierten Zoom + Pan speichern für spätere Wiederherstellung

**Punkte-Interaktion:**
- Klick: Neuen Punkt setzen (max 2)
- Drag: Bestehenden Punkt verschieben
- Shift: Horizontal/vertikal einrasten
- Delete/Backspace: Ausgewählten Punkt löschen

### State-Übergänge

```
calibrateStep: 0 (inaktiv)
  → startCalibration() → 1 (Referenzlinie)
  → finishStep1()      → 2 (Kalibrierpunkte)
  → applyCalibrationStep2() oder cancelCalibration() → 0
```

### Nach Kalibrierung

- Raster kann in cm eingestellt werden (statt Pixel)
- Maßstab-Ruler zeigt „10 cm (kalibriert)" an
- Messwerkzeug zeigt Abstände in cm an
- Zoom-Display zeigt 🎯 wenn kalibrierter Zoom aktiv
- „🎯 Zoom"-Button stellt kalibrierten Zoom wieder her
- „🔄 Neu"-Button startet Neukalibrierung

---

## Messwerkzeug

### Dateien
- `features/measurement/measurement.js` – Logik & Modus-Verwaltung
- `features/measurement/measureOverlay.js` – Canvas-Zeichnung
- `events/mouse.js` – Maus-Interaktion im Messmodus

### Ablauf

1. Aktivierung: Button „📐 Messen" oder Taste `M`
2. Cursor wechselt zu Crosshair
3. Erster Klick: Punkt 1 setzen
4. Zweiter Klick: Punkt 2 setzen → Messung abgeschlossen
5. Weitere Messungen möglich (mehrere Linien gleichzeitig)
6. Punkte können nachträglich per Drag verschoben werden

### Anzeige

- Verbindungslinie zwischen den Punkten (cyan)
- Label mit Abstand in Pixel
- Falls kalibriert: zusätzlich Abstand in cm
- Schwarzer Hintergrund hinter dem Label für Lesbarkeit

### Daten-Struktur

```javascript
state.measurements = [
  { p1: { imgX, imgY }, p2: { imgX, imgY } },  // Abgeschlossene Messung
  { p1: { imgX, imgY }, p2: null },              // Laufende Messung (1 Punkt)
];
```

Punkte werden in **Bild-Koordinaten** gespeichert, damit sie bei Zoom/Pan korrekt bleiben.

---

## Fadenkreuz

### Dateien
- `features/overlays/overlayRenderer.js` → `drawCrosshair()`
- `events/mouse.js` – Mausposition-Tracking

### Verhalten

- Folgt dem Mauszeiger über den gesamten Viewport
- Zeigt Koordinaten des Bild-Pixels unter dem Cursor an
- Falls kalibriert: zusätzlich cm-Werte
- Koordinaten-Label wechselt die Seite, wenn es am Rand abgeschnitten würde
- Verschwindet, wenn die Maus den Viewport verlässt (`mouseleave`)
- Farbe, Deckkraft und Linienstärke konfigurierbar

---

## Kontrast & Helligkeit

### Dateien
- `features/settings/settings.js` – Slider-Handler
- `render/image.js` – CSS-Filter auf Canvas anwenden

### Implementierung

Verwendet den Canvas-2D-`filter`-Property:

```javascript
ctxImg.filter = `contrast(${state.contrast}%) brightness(${state.brightness}%)`;
```

- Bereich: 50%–300% (Kontrast), 0%–300% (Helligkeit)
- Standardwert: jeweils 100%
- Wird bei jedem `renderImage()` angewendet und danach zurückgesetzt

---

## Vollbild-Modus

### Dateien
- `features/fullscreen/fullscreen.js` – Logik & UI
- `src/main/main.js` – IPC-Handler für nativen Fullscreen

### Verhalten

1. Aktivierung: Button „⛶" oder Taste `F` / `F11`
2. Electron setzt nativen Fullscreen (`win.setFullScreen()`)
3. Toolbar wird ausgeblendet (`body.fullscreen` CSS-Klasse)
4. Toolbar erscheint bei Mausbewegung zum oberen Bildschirmrand
5. Toolbar verschwindet nach 400ms wenn Maus den Toolbar verlässt
6. ESC beendet Vollbild

### Trigger-Zone

`#fullscreen-trigger` ist ein unsichtbares Element am oberen Bildschirmrand. Bei `mouseenter` wird die Toolbar sichtbar gemacht.

---

## Kontextmenü

### Dateien
- `features/contextMenu/contextMenu.js`
- HTML: `#context-menu` in `index.html`

### Verhalten

- Rechtsklick im Viewport öffnet ein benutzerdefiniertes Kontextmenü
- Standard-Browser-Kontextmenü wird unterdrückt (`preventDefault`)
- Menü-Position wird an Fensterrändern angepasst
- Klick außerhalb oder ESC schließt das Menü
- Checkmarks zeigen aktive Overlays an

### Aktionen

| Menüpunkt | Aktion |
|-----------|--------|
| 📂 Bild laden | Klickt programmatisch den Load-Button |
| 📐 Raster an/aus | `toggleOverlay('grid')` |
| ✛ Mitte an/aus | `toggleOverlay('center')` |
| ▦ Drittel an/aus | `toggleOverlay('thirds')` |
| 📏 Maßstab an/aus | `toggleOverlay('ruler')` |
| ↩️ Ansicht zurücksetzen | Zoom=1, Bild zentrieren |
| 🔧 Kalibrieren | `startCalibration()` |
| ❓ Hilfe | Help-Overlay toggled |
| 🎓 Einführungstour | `startTour()` |

---

## Onboarding-Tour

### Dateien
- `features/tour/tour.js`
- CSS: `.tour-*` Klassen in `styles.css`

### Verhalten

- Startet automatisch beim ersten Besuch (prüft `localStorage`)
- Kann manuell über Hilfe-Dialog oder Kontextmenü gestartet werden
- 13 Schritte, die alle Toolbar-Elemente erklären
- Spotlight-Effekt hebt das aktuelle Element hervor (via `clip-path`)
- Navigation: Vor/Zurück/Überspringen, auch per Pfeiltasten und ESC
- Tooltip positioniert sich automatisch über oder unter dem Ziel-Element
- Beendet Vollbild-Modus und schließt offene Modals vor Start

### Auto-Start-Logik

```javascript
if (!localStorage.getItem('beamer-tracer-tour-done')) {
  setTimeout(startTour, 600);
}
```

Nach Abschluss oder Überspringen wird `beamer-tracer-tour-done` in `localStorage` gesetzt.

---

## Persistenz (Session-Restore)

### Dateien
- `services/persistence.js`
- `src/main/main.js` – IPC-Handler für Datei-I/O

### Gespeicherte Daten

| Feld | Beschreibung |
|------|-------------|
| `zoom`, `panX`, `panY` | Viewport-Position |
| `contrast`, `brightness` | Filter-Einstellungen |
| `gridSize`, `gridSizeCm` | Rasterweiten |
| `overlayStyles` | Farbe/Deckkraft/Dicke aller Overlays |
| `screenPxPerMeter` | Kalibrierungsdaten (Schritt 1) |
| `pxPerCm` | Kalibrierungsdaten (Schritt 2) |
| `calibratedZoom/PanX/PanY` | Kalibrierter Viewport |
| `imgSrc` | Bild als Base64-Data-URL |

### Details → siehe [ARCHITECTURE.md](./ARCHITECTURE.md#persistenz-strategie)

---

## Overlay-Einstellungen

### Dateien
- `features/settings/settings.js`
- HTML: `#settings-overlay` in `index.html`

### Panel

Über den ⚙️-Button wird ein Modal geöffnet mit Einstellungen für:
- **Raster:** Farbe, Deckkraft (5%–100%), Linienstärke (0.25–5)
- **Mittellinien:** dto.
- **Drittel-Linien:** dto.
- **Fadenkreuz:** dto.

### Reset

Der „↩️ Zurücksetzen"-Button stellt die Standardwerte aus `DEFAULT_OVERLAY_STYLES` in `constants.js` wieder her.

### Implementierung

Jedes Overlay hat drei Inputs (Color, Range für Opacity, Range für Width). Die Event-Listener werden in einer Schleife über `OVERLAY_KEYS` generiert, um Code-Duplizierung zu vermeiden.

