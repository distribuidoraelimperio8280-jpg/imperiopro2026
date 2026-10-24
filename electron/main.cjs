const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  // Resolve icon properly across development and production
  const iconPath = fs.existsSync(path.join(__dirname, '../assets/icon.png'))
    ? path.join(__dirname, '../assets/icon.png')
    : path.join(__dirname, '../public/icon.png');

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'IMPERIO PRO CONTABILIDAD - Sistema Offline',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    autoHideMenuBar: true,
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

// IPC Handlers for Native Printing & PDF Saving
ipcMain.handle('print-document', async (event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'Ventana no disponible' };
  try {
    mainWindow.webContents.print({
      silent: options.silent || false,
      printBackground: true,
      deviceName: options.deviceName || '',
    }, (success, failureReason) => {
      if (!success) console.log('Impresión cancelada o fallida:', failureReason);
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-pdf', async (event, { base64Data, defaultFilename }) => {
  if (!mainWindow) return { success: false };
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar Factura o Reporte PDF',
      defaultPath: defaultFilename || 'Factura_ImperioPro.pdf',
      filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }],
    });

    if (filePath) {
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);
      return { success: true, filePath };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  // Set Application User Model ID for Windows Taskbar icon pinning and notifications
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.imperiopro.facturacion');
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
