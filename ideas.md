# 💡 Beamer Tracer – Ideen zur Verbesserung

---

## 1. 🎨 Farbe der Overlays konfigurierbar machen

**Problem:** Die Overlay-Farben (Raster rot, Mitte grün, Drittel blau) sind fest codiert. Je nach Bild/Hintergrund können sie schlecht sichtbar sein.

**Verbesserung:** Farbpicker in der Toolbar oder im Hilfe-Dialog, mit denen der Nutzer die Farbe und Transparenz jedes Overlays individuell anpassen kann. Einstellung wird in der Config gespeichert.

**Prompt:**
> Füge in die Beamer Tracer App eine Möglichkeit hinzu, die Farben der Overlays (Raster, Mittellinien, Drittel-Linien, Maßstab) über kleine Farbpicker in einem neuen Einstellungs-Dialog zu ändern. Erstelle einen neuen Button "⚙️ Farben" in der Toolbar, der einen Modal-Dialog öffnet. Dort sollen für jedes Overlay ein `<input type="color">` und ein Opacity-Slider vorhanden sein. Die gewählten Farben werden in der Config gespeichert und beim Start wiederhergestellt. Verwende die bestehende saveState/restoreState Logik.

---

## 2. 📸 Bild direkt per Zwischenablage einfügen (Paste)

**Problem:** Aktuell kann man Bilder nur per Datei-Dialog oder Drag & Drop laden. Oft hat man Screenshots schon in der Zwischenablage.

**Verbesserung:** `Ctrl+V` soll Bilder aus der Zwischenablage direkt in die App einfügen.

**Prompt:**
> Füge in die Beamer Tracer App Unterstützung für das Einfügen von Bildern aus der Zwischenablage hinzu. Wenn der Nutzer `Ctrl+V` drückt, soll geprüft werden, ob ein Bild in der Zwischenablage ist (`navigator.clipboard.read()` oder `paste`-Event). Falls ja, wird dieses Bild geladen wie beim Datei-Dialog. Aktualisiere auch die Hilfe-Tabelle mit dem neuen Shortcut.

---

## 3. 📐 Abstandsmessung zwischen zwei Punkten (Messwerkzeug)

**Problem:** Nach der Kalibrierung kann man zwar den Maßstab sehen, aber nicht interaktiv Abstände zwischen beliebigen Punkten im Bild messen.

**Verbesserung:** Ein "Messen"-Werkzeug, mit dem man zwei Punkte klickt und sofort den realen Abstand (in cm) angezeigt bekommt.

**Prompt:**
> Füge ein Messwerkzeug in die Beamer Tracer App ein. Erstelle einen neuen Toolbar-Button "📐 Messen" (Shortcut `M`). Wenn aktiviert, kann der Nutzer zwei Punkte auf dem Bild klicken. Zwischen den Punkten wird eine Linie gezeichnet und der Abstand in Pixeln angezeigt. Falls eine Kalibrierung (pxPerCm) existiert, wird zusätzlich der Abstand in cm angezeigt. Die Punkte sind per Drag verschiebbar. ESC oder erneutes Klicken auf den Button beendet den Messmodus. Mehrere Messungen gleichzeitig sollen möglich sein, mit einem "Alle löschen"-Button.

---

## 4. ↩️ Undo/Redo für Pan & Zoom

**Problem:** Wenn man versehentlich das Bild verschiebt oder den Zoom ändert, gibt es keinen Weg zurück.

**Verbesserung:** `Ctrl+Z` und `Ctrl+Y` für Undo/Redo der Pan- und Zoom-Aktionen.

**Prompt:**
> Implementiere eine Undo/Redo-Funktionalität für Pan und Zoom in der Beamer Tracer App. Erstelle einen History-Stack, der bei jeder Pan/Zoom-Änderung den Zustand (zoom, panX, panY) speichert (max. 50 Einträge). `Ctrl+Z` geht einen Schritt zurück, `Ctrl+Y` einen vor. Füge auch zwei Toolbar-Buttons "↩️" und "↪️" hinzu. Aktualisiere die Hilfe-Tabelle.

---

## 5. 🖼️ Bild-Rotation (90°-Schritte & frei)

**Problem:** Manchmal werden Fotos im falschen Winkel aufgenommen. Aktuell gibt es keine Möglichkeit, das Bild zu rotieren.

**Verbesserung:** Buttons für 90°-Rotation (CW/CCW) und optional ein Slider für freie Rotation.

**Prompt:**
> Füge Bild-Rotation in die Beamer Tracer App ein. Erstelle zwei Toolbar-Buttons "↻ 90°" und "↺ 90°" (Shortcuts `]` und `[`). Die Rotation wird vor dem Zeichnen des Bildes im Canvas angewendet (`ctxImg.rotate()`). Der Rotationswinkel wird im State gespeichert. Füge außerdem einen Slider für freie Rotation (0–360°) im Einstellungs-Bereich hinzu. Die Rotation muss bei Pan & Zoom korrekt berücksichtigt werden. Aktualisiere die Hilfe-Tabelle.

---

## 6. 🔲 Fullscreen-Toggle & versteckbare Toolbar

**Problem:** Beim Beamer-Einsatz stört die Toolbar. Maximaler Bildschirmplatz ist gefragt.

**Verbesserung:** `F11` oder `F` für Fullscreen, Toolbar wird im Fullscreen automatisch ausgeblendet und erscheint beim Hover am oberen Rand.

**Prompt:**
> Füge einen Fullscreen-Modus in die Beamer Tracer App ein. Shortcut `F` oder `F11` togglet zwischen Fullscreen und Fenster-Modus (nutze die Electron `win.setFullScreen()` API über IPC). Im Fullscreen wird die Toolbar ausgeblendet und erscheint nur beim Mouse-Hover über die oberen 5px des Bildschirms (CSS transition, smooth slide-in). Füge einen Toolbar-Button "⛶ Vollbild" hinzu. Der Viewport soll im Fullscreen die vollen 100vh nutzen. Aktualisiere die Hilfe-Tabelle.

---

## 7. 💾 Mehrere Kalibrierungs-Profile speichern

**Problem:** Wenn man zwischen verschiedenen Beamern oder Räumen wechselt, muss man jedes Mal neu kalibrieren.

**Verbesserung:** Kalibrierungen als benannte Profile speichern und per Dropdown wiederherstellen.

**Prompt:**
> Füge ein Profil-System für Kalibrierungen in die Beamer Tracer App ein. Erstelle ein Dropdown-Menü neben dem Kalibrierungs-Button, das gespeicherte Profile auflistet. Nach einer Kalibrierung erscheint ein Dialog "Profil speichern" mit Namenseingabe. Profile werden in der Config-Datei unter einem `profiles`-Array gespeichert (Name, screenPxPerMeter, pxPerCm, calibratedZoom, calibratedPanX, calibratedPanY). Ein Profil kann per Klick geladen oder per Button gelöscht werden.

---

## 8. 🌓 Dark/Light Theme Toggle

**Problem:** Die App hat nur ein dunkles Theme. In hellen Umgebungen kann ein helles Theme besser lesbar sein.

**Verbesserung:** Theme-Switch in der Toolbar.

**Prompt:**
> Füge einen Dark/Light Theme Toggle in die Beamer Tracer App ein. Erstelle einen Toolbar-Button "🌓 Theme". Bei Klick wird zwischen einer dunklen (aktuelles Design) und einer hellen Variante gewechselt. Nutze CSS-Variablen (`--bg`, `--toolbar-bg`, `--text`, `--border`, etc.) in `styles.css` und togglee eine CSS-Klasse `light-theme` auf `<body>`. Die Wahl wird in der Config gespeichert.

---

## 9. 📏 Dynamisches Pixelraster, das sich dem Zoom anpasst

**Problem:** Das aktuelle Raster hat eine feste Pixelweite. Bei starkem Zoom wird es unbrauchbar.

**Verbesserung:** Das Raster soll sich an den Zoom-Level anpassen und in "echten" Einheiten (z.B. cm nach Kalibrierung) gezeichnet werden.

**Prompt:**
> Verbessere das Raster-Overlay in der Beamer Tracer App so, dass es sich dynamisch dem Zoom anpasst. Wenn eine Kalibrierung existiert, soll das Raster in cm-Einheiten gezeichnet werden (z.B. alle 1 cm, 5 cm, 10 cm – je nach Zoom-Stufe). Das Raster soll sich mit dem Bild mitbewegen (nicht screen-fixed), also relativ zum Bild gezeichnet werden. Zeige am Rand dezente Beschriftungen der Rasterlinien in cm an. Ohne Kalibrierung soll es weiterhin im alten Pixel-Modus funktionieren.

---

## 10. 🖱️ Rechtsklick-Kontextmenü

**Problem:** Alle Funktionen sind nur über Toolbar und Shortcuts zugänglich. Power-User vermissen ein Kontextmenü.

**Verbesserung:** Rechtsklick öffnet ein Kontextmenü mit den wichtigsten Aktionen.

**Prompt:**
> Füge ein eigenes Rechtsklick-Kontextmenü (kein natives Electron-Menü) in die Beamer Tracer App ein. Bei Rechtsklick auf den Viewport erscheint ein schickes dunkles Popup-Menü mit folgenden Einträgen: "Bild laden", "Raster an/aus", "Mitte an/aus", "Drittel an/aus", "Maßstab an/aus", Trennlinie, "Ansicht zurücksetzen", "Kalibrieren", Trennlinie, "Hilfe". Das Menü wird mit HTML/CSS im Renderer erstellt, positioniert sich an der Mausposition und schließt bei Klick oder ESC. Verwende die bestehenden Toggle-Funktionen.

---

## 11. 🔍 Bildinfo & Metadaten anzeigen

**Problem:** Man sieht nirgendwo die Auflösung, Dateigröße oder den Dateinamen des geladenen Bildes.

**Verbesserung:** Eine Info-Leiste oder ein Dialog mit Bild-Metadaten.

**Prompt:**
> Füge eine Bild-Info-Anzeige in die Beamer Tracer App ein. Speichere beim Laden den Dateinamen, die Auflösung (Breite × Höhe) und die Dateigröße. Zeige in der unteren rechten Ecke des Viewports eine dezente, halbtransparente Info-Zeile: `"photo.jpg  |  4032×3024  |  3.2 MB  |  Zoom: 182%"`. Die Anzeige kann mit Shortcut `I` ein-/ausgeblendet werden. Füge den Shortcut zur Hilfe-Tabelle hinzu.

---

## 12. 🎯 Fadenkreuz-Cursor mit Koordinatenanzeige

**Problem:** Beim präzisen Positionieren fehlt ein visuelles Fadenkreuz am Cursor.

**Verbesserung:** Optional ein Fadenkreuz-Overlay, das dem Mauszeiger folgt und die aktuelle Bild-Koordinate anzeigt.

**Prompt:**
> Füge ein optionales Fadenkreuz-Overlay in die Beamer Tracer App ein. Neuer Toolbar-Button "🎯 Fadenkreuz" (Shortcut `X`). Wenn aktiviert, werden horizontale und vertikale Linien durch die aktuelle Mausposition auf dem Overlay-Canvas gezeichnet (dünne gestrichelte Linien, halbtransparent). Neben dem Cursor wird die Bild-Koordinate in Pixeln angezeigt (und in cm, falls kalibriert). Nutze `mousemove` auf dem Viewport. Aktualisiere die Hilfe-Tabelle.

---

## 13. 🖨️ Screenshot/Export der aktuellen Ansicht

**Problem:** Man kann die aktuelle Ansicht (Bild + Overlays) nicht exportieren.

**Verbesserung:** Button zum Speichern der aktuellen Canvas-Ansicht als PNG.

**Prompt:**
> Füge eine Screenshot/Export-Funktion in die Beamer Tracer App ein. Neuer Toolbar-Button "📷 Export" (Shortcut `Ctrl+S`). Bei Klick wird ein temporärer Canvas erstellt, auf dem zuerst das Bild-Canvas und dann das Overlay-Canvas übereinandergelegt gerendert werden. Das Ergebnis wird als PNG heruntergeladen. Nutze `canvas.toBlob()` und erstelle einen Download-Link. Der Dateiname soll `beamer-tracer-export-YYYY-MM-DD-HHmmss.png` sein.

---

## 14. 🔄 Bild horizontal/vertikal spiegeln

**Problem:** Manchmal ist ein Bild spiegelverkehrt (z.B. bei Beamer-Rückprojektion).

**Verbesserung:** Buttons zum Spiegeln des Bildes.

**Prompt:**
> Füge Bild-Spiegelung in die Beamer Tracer App ein. Zwei neue Toolbar-Buttons: "↔ H-Spiegeln" und "↕ V-Spiegeln". Bei Klick wird das Bild horizontal bzw. vertikal gespiegelt (`ctxImg.scale(-1, 1)` bzw. `ctxImg.scale(1, -1)`). Der Spiegelungszustand (flipH, flipV als Boolean) wird im State gespeichert. Die Spiegelung wird in `renderImage()` vor dem `drawImage()` angewendet. Aktualisiere die Hilfe-Tabelle (z.B. Shortcuts `Shift+H` und `Shift+V`).

---

## 15. ⌨️ Mini-Kommandozeile / Quick-Actions (Spotlight-Style)

**Problem:** Bei vielen Features wird es unübersichtlich. Erfahrene Nutzer wollen schnellen Zugriff.

**Verbesserung:** `Ctrl+P` oder `Ctrl+K` öffnet eine Suchleiste, in der man Befehle tippen kann (ähnlich VS Code Command Palette).

**Prompt:**
> Füge eine Command-Palette (Spotlight-Style) in die Beamer Tracer App ein. `Ctrl+K` öffnet ein zentriertes Suchfeld-Overlay. Es enthält eine Liste aller verfügbaren Aktionen (Bild laden, Raster toggle, Kalibrieren, Zoom zurücksetzen, Hilfe, etc.) mit zugehörigen Shortcuts. Beim Tippen wird die Liste gefiltert. Enter auf einem Eintrag führt die Aktion aus und schließt das Overlay. ESC schließt es. Erstelle die Aktion-Liste als Array von Objekten `{label, shortcut, action}` in renderer.js. Style das Overlay mit dunklem Hintergrund, abgerundeten Ecken und Highlight der aktuellen Auswahl.

