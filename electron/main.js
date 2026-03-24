import { app, BrowserWindow, dialog, ipcMain, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import log from 'electron-log';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

log.transports.file.level = 'info';
autoUpdater.logger = log;

let mainWindow;
let updateCheckInProgress = false;

function setupContentSecurityPolicy() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;"
        ]
      }
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '..', 'build', 'icon.png')
  });

  const startURL = app.isPackaged
    ? `file://${path.join(__dirname, '..', 'dist', 'index.html')}`
    : 'http://localhost:5173';

  mainWindow.loadURL(startURL);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupAutoUpdater() {
  if (!app.isPackaged) {
    log.info('Auto-updater disabled in development mode');
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    if (mainWindow) {
      mainWindow.webContents.send('update-checking');
    }
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    updateCheckInProgress = false;
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    }

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available. Would you like to download it now?`,
      buttons: ['Download', 'Later'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available:', info);
    updateCheckInProgress = false;
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available', {
        version: info.version
      });
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    updateCheckInProgress = false;
    if (mainWindow) {
      mainWindow.webContents.send('update-error', {
        message: err.message
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let logMessage = 'Download speed: ' + progressObj.bytesPerSecond;
    logMessage = logMessage + ' - Downloaded ' + progressObj.percent + '%';
    logMessage = logMessage + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
    log.info(logMessage);

    if (mainWindow) {
      mainWindow.webContents.send('update-download-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version
      });
    }

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'A new version has been downloaded. Restart now to install it?',
      buttons: ['Restart', 'Later'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.checkForUpdatesAndNotify();

  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 1000 * 60 * 60);
}

function setupIpcHandlers() {
  ipcMain.handle('check-for-updates', async () => {
    if (!app.isPackaged) {
      return {
        success: false,
        message: 'Updates are only available in production builds'
      };
    }

    if (updateCheckInProgress) {
      return {
        success: false,
        message: 'Update check already in progress'
      };
    }

    try {
      updateCheckInProgress = true;
      const result = await autoUpdater.checkForUpdates();
      return {
        success: true,
        currentVersion: app.getVersion(),
        updateInfo: result.updateInfo
      };
    } catch (error) {
      updateCheckInProgress = false;
      log.error('Error checking for updates:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });

  ipcMain.handle('download-update', async () => {
    if (!app.isPackaged) {
      return {
        success: false,
        message: 'Updates are only available in production builds'
      };
    }

    try {
      await autoUpdater.downloadUpdate();
      return {
        success: true,
        message: 'Download started'
      };
    } catch (error) {
      log.error('Error downloading update:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });

  ipcMain.handle('install-update', async () => {
    if (!app.isPackaged) {
      return {
        success: false,
        message: 'Updates are only available in production builds'
      };
    }

    try {
      autoUpdater.quitAndInstall();
      return {
        success: true
      };
    } catch (error) {
      log.error('Error installing update:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });

  ipcMain.handle('get-app-version', async () => {
    return {
      version: app.getVersion(),
      isPackaged: app.isPackaged
    };
  });
}

app.whenReady().then(() => {
  setupContentSecurityPolicy();
  setupIpcHandlers();
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
