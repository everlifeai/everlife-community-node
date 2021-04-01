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
            nodeIntegration: true,
            enableRemoteModule: true,
        },
        title: 'Everlife Explorer',
        show: true,
        titleBarStyle: 'hiddenInset',
        autoHideMenuBar: true,
        backgroundColor: '#EEE',
    });
    windows.loginWin.loadURL("file://" + path.join(__dirname, '..', 'assets', 'face-recognition', 'existinguser.html'))

    windows.loginWin.on('closed', () => windows.loginWin = null)
}

module.exports = {
    openLoginWindow
}
