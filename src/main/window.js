const { app, BrowserWindow } = require('electron');  // Added app import
const path = require('path');
const { registerIpcHandlers } = require('./ipc');

async function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 680,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            preload: path.join(__dirname, '../../public/preload.js')
        }
    });

    mainWindow.loadURL(
        !app.isPackaged
            ? 'http://localhost:4000'
            : `file://${path.join(__dirname, '../../build/index.html')}`
    );

    if (app.isPackaged) {
        mainWindow.setMenu(null);
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    registerIpcHandlers(mainWindow);

    return mainWindow;
}

exports.createWindow = createWindow;