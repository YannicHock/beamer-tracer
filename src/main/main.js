const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Persistente Konfigurationsdatei neben der Executable ─────
// Portable: alles relativ zum Ausführungsordner (z.B. USB-Stick)
function getPortableDir() {
  if (app.isPackaged) {
    // Gepackt: exe liegt z.B. in D:\stick\BeamerTracer.exe
    // process.resourcesPath = …\resources → eine Ebene hoch = exe-Ordner
    return path.dirname(process.resourcesPath);
  }
  // Dev-Modus: Projektordner (src/main → 2 Ebenen hoch)
  return path.join(__dirname, '..', '..');
}

function getConfigPath() {
  return path.join(getPortableDir(), 'beamer-tracer-config.json');
}

ipcMain.handle('config:read', () => {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8');
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
});

ipcMain.handle('config:write', (_event, data) => {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (_) {
    return false;
  }
});

// ── Fenster ──────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.setMenuBarVisibility(false);
  // ── File Open Dialog ─────────────────────────────────────────
  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Bild laden',
      filters: [
        { name: 'Bilder', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] },
        { name: 'Alle Dateien', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    if (canceled || filePaths.length === 0) return null;

    const filePath = filePaths[0];
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml' };
    const mime = mimeMap[ext] || 'application/octet-stream';
    const buffer = fs.readFileSync(filePath);
    return `data:${mime};base64,${buffer.toString('base64')}`;
  });

  // ── Fullscreen IPC ───────────────────────────────────────────
  ipcMain.handle('fullscreen:toggle', () => {
    const isFS = win.isFullScreen();
    win.setFullScreen(!isFS);
    return !isFS;
  });

  ipcMain.handle('fullscreen:get', () => {
    return win.isFullScreen();
  });

  // Notify renderer when fullscreen state changes (e.g. via OS controls)
  win.on('enter-full-screen', () => {
    win.webContents.send('fullscreen:changed', true);
  });
  win.on('leave-full-screen', () => {
    win.webContents.send('fullscreen:changed', false);
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());