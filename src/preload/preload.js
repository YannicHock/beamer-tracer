const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile:    () => ipcRenderer.invoke('dialog:openFile'),
  readConfig:  () => ipcRenderer.invoke('config:read'),
  writeConfig: (data) => ipcRenderer.invoke('config:write', data),
  toggleFullscreen: () => ipcRenderer.invoke('fullscreen:toggle'),
  getFullscreen:    () => ipcRenderer.invoke('fullscreen:get'),
  onFullscreenChanged: (cb) => ipcRenderer.on('fullscreen:changed', (_e, val) => cb(val)),
});