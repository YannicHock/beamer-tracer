/**
 * @module renderer/events/dragdrop
 * @description Bild-Laden via Drag & Drop, Zwischenablage und Datei-Dialog.
 *
 * Bietet drei Wege zum Laden eines Bildes:
 * 1. **Datei-Dialog** – Über den „📂 Bild"-Button oder Ctrl+O
 *    (nativer Electron-Dialog via `electronAPI.openFile()`)
 * 2. **Drag & Drop** – Datei auf das Fenster ziehen
 * 3. **Zwischenablage** – Ctrl+V (Bild aus Clipboard einfügen)
 *
 * Alle Bilder werden intern als **Data-URL** (Base64) verarbeitet und
 * im zentralen State als `state.imgSrc` gespeichert (für Persistierung).
 *
 * Nach dem Laden wird das Bild auf Zoom 1.0 gesetzt und zentriert.
 *
 * Fallback: Ohne `electronAPI` (z.B. im Browser) wird ein verstecktes
 * `<input type="file">` verwendet statt des nativen Dialogs.
 */

import state from '../core/state.js';
import { canvasImage } from '../core/dom.js';
import { render } from '../render/index.js';
import { saveState } from '../services/persistence.js';

/**
 * Lädt ein Bild aus einer Data-URL und zeigt es an.
 *
 * Setzt `state.imgSrc` und erstellt ein neues `Image()`-Objekt.
 * Bei `onload`: Setzt Zoom auf 1.0, zentriert das Bild im Viewport,
 * ruft `render()` und `saveState()` auf.
 *
 * @param {string} dataUrl - Bild als Data-URL (z.B. 'data:image/png;base64,...')
 */
export function loadImageFromDataURL(dataUrl) {
  state.imgSrc = dataUrl;
  state.img = new Image();
  state.img.onload = () => {
    state.zoom = 1.0;
    state.panX = (canvasImage.width  - state.img.width)  / 2;
    state.panY = (canvasImage.height - state.img.height) / 2;
    render();
    saveState();
  };
  state.img.src = state.imgSrc;
}

/**
 * Liest eine Bild-Datei (File-Objekt) und lädt sie via Data-URL.
 *
 * Verwendet `FileReader.readAsDataURL()` und delegiert an
 * `loadImageFromDataURL()` nach dem Lesen.
 *
 * @param {File} file - Ein File-Objekt (aus Drag & Drop, Clipboard oder Input)
 */
export function loadImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => loadImageFromDataURL(e.target.result);
  reader.readAsDataURL(file);
}

/**
 * Registriert alle Event-Listener für Bild-Laden.
 *
 * - `dragover` / `drop` auf `document.body` (Drag & Drop)
 * - `paste` auf `document` (Zwischenablage, ignoriert Input-Felder)
 * - Click-Handler auf `btn-load` (Electron-Dialog oder Fallback-Input)
 *
 * Muss einmalig beim App-Start aufgerufen werden.
 */
export function initDragDrop() {
  // Drag & Drop
  document.body.addEventListener('dragover', (e) => e.preventDefault());
  document.body.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImageFile(file);
  });

  // Paste from clipboard (Ctrl+V)
  document.addEventListener('paste', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const items = (e.clipboardData || {}).items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) loadImageFile(file);
        return;
      }
    }
  });

  // Load button – prefer native Electron dialog, fallback to hidden <input>
  document.getElementById('btn-load').addEventListener('click', async () => {
    if (window.electronAPI?.openFile) {
      const dataUrl = await window.electronAPI.openFile();
      if (dataUrl) loadImageFromDataURL(dataUrl);
      return;
    }
    // Fallback for non-Electron environments
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => { if (input.files[0]) loadImageFile(input.files[0]); };
    input.click();
  });
}
