'use strict'
const path = require('path')

const BrowserWindow = require('electron').BrowserWindow;

const windows = {
    loginWin: null,
}
function openLoginWindow() {
    windows.loginWin = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            nodeIntegration: true
        },
        title: 'Everlife Explorer',
        show: true,
        titleBarStyle: 'hiddenInset',
        autoHideMenuBar: true,
        backgroundColor: '#EEE',
    });
    loginWindow.loadURL("file://" + path.join(__dirname, '..', 'assets', 'face-recognition', 'existinguser.html'))

    loginWindow.on('closed', () => windows.loginWin = null)
}

module.exports = {
    openLoginWindow
}
