const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./electron/ipc');
const { initDatabase } = require('./electron/database');

let mainWindow;

async function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Register IPC handlers
  registerIpcHandlers(win);

  // Load the app
  if (app.isPackaged) {
    await win.loadFile(path.join(__dirname, 'build', 'index.html'));
  } else {
    await win.loadURL('http://localhost:4000');
  }

  return win;
}

async function main() {
  try {
    await initDatabase();
    mainWindow = await createWindow();
  } catch (error) {
    console.error('Error starting application:', error);
    app.quit();
  }
}

// App lifecycle handlers
app.whenReady().then(main);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    main();
  }
});

// Handle exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});