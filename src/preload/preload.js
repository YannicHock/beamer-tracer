/**
 * @module preload
 * @description Electron Preload Script – Context Bridge.
 *
 * Dieses Script läuft in einem privilegierten Kontext zwischen Main und Renderer.
 * Es exponiert über `contextBridge.exposeInMainWorld` ein sicheres API-Objekt
 * (`window.electronAPI`) im Renderer, ohne Node.js-Zugriff zu gewähren.
 *
 * Alle Kommunikation zwischen Renderer und Main Process läuft über dieses API.
 *
 * @see {@link module:main} für die IPC-Handler-Implementierungen
 */
const { contextBridge, ipcRenderer } = require('electron');

/**
 * Öffentliches API-Objekt, verfügbar als `window.electronAPI` im Renderer.
 *
 * @typedef {Object} ElectronAPI
 * @property {function(): Promise<string|null>} openFile - Öffnet nativen Datei-Dialog, gibt Bild als Data-URL zurück (oder null bei Abbruch)
 * @property {function(): Promise<Object|null>} readConfig - Liest die portable Konfigurationsdatei, gibt JSON-Objekt zurück (oder null)
 * @property {function(Object): Promise<boolean>} writeConfig - Schreibt Daten in die portable Konfigurationsdatei
 * @property {function(): Promise<boolean>} toggleFullscreen - Schaltet Vollbild um, gibt neuen Status zurück
 * @property {function(): Promise<boolean>} getFullscreen - Gibt aktuellen Vollbild-Status zurück
 * @property {function(function(boolean): void): void} onFullscreenChanged - Registriert Callback für Vollbild-Änderungen durch das OS
 */
contextBridge.exposeInMainWorld('electronAPI', {
  openFile:    () => ipcRenderer.invoke('dialog:openFile'),
  readConfig:  () => ipcRenderer.invoke('config:read'),
  writeConfig: (data) => ipcRenderer.invoke('config:write', data),
  toggleFullscreen: () => ipcRenderer.invoke('fullscreen:toggle'),
  getFullscreen:    () => ipcRenderer.invoke('fullscreen:get'),
  onFullscreenChanged: (cb) => ipcRenderer.on('fullscreen:changed', (_e, val) => cb(val)),
});