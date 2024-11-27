const { app } = require('electron');
const { createWindow } = require('../src/main/window');
const { initDatabase } = require('../src/main/database');

let mainWindow;

async function main() {
    try {
        await initDatabase();
        mainWindow = await createWindow(); // createWindow will handle IPC registration
    } catch (error) {
        console.error('Error starting application:', error);
        app.quit();
    }
}

app.on('ready', main);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        main();
    }
});