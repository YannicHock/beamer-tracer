const { app, BrowserWindow, ipcMain } = require('electron');
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
  // Dev-Modus: Projektordner
  return __dirname;
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
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');
  win.setMenuBarVisibility(false);

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