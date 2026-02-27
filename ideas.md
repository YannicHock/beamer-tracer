

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

## 6. 🔲 Fullscreen-Toggle & versteckbare Toolbar

**Problem:** Beim Beamer-Einsatz stört die Toolbar. Maximaler Bildschirmplatz ist gefragt.

**Verbesserung:** `F11` oder `F` für Fullscreen, Toolbar wird im Fullscreen automatisch ausgeblendet und erscheint beim Hover am oberen Rand.

**Prompt:**
> Füge einen Fullscreen-Modus in die Beamer Tracer App ein. Shortcut `F` oder `F11` togglet zwischen Fullscreen und Fenster-Modus (nutze die Electron `win.setFullScreen()` API über IPC). Im Fullscreen wird die Toolbar ausgeblendet und erscheint nur beim Mouse-Hover über die oberen 5px des Bildschirms (CSS transition, smooth slide-in). Füge einen Toolbar-Button "⛶ Vollbild" hinzu. Der Viewport soll im Fullscreen die vollen 100vh nutzen. Aktualisiere die Hilfe-Tabelle.

---

## 10. 🖱️ Rechtsklick-Kontextmenü

**Problem:** Alle Funktionen sind nur über Toolbar und Shortcuts zugänglich. Power-User vermissen ein Kontextmenü.

**Verbesserung:** Rechtsklick öffnet ein Kontextmenü mit den wichtigsten Aktionen.

**Prompt:**
> Füge ein eigenes Rechtsklick-Kontextmenü (kein natives Electron-Menü) in die Beamer Tracer App ein. Bei Rechtsklick auf den Viewport erscheint ein schickes dunkles Popup-Menü mit folgenden Einträgen: "Bild laden", "Raster an/aus", "Mitte an/aus", "Drittel an/aus", "Maßstab an/aus", Trennlinie, "Ansicht zurücksetzen", "Kalibrieren", Trennlinie, "Hilfe". Das Menü wird mit HTML/CSS im Renderer erstellt, positioniert sich an der Mausposition und schließt bei Klick oder ESC. Verwende die bestehenden Toggle-Funktionen.
