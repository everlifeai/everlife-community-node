'use strict'
const path = require('path')

const { BrowserWindow } = require('electron')

const windows = {
    buyEverWin: null,
}

function openBuyEverWindow() {
    if(windows.buyEverWin) windows.buyEverWin.show()
    else createWindow()
}

function createWindow() {
    windows.buyEverWin = new BrowserWindow({
        width: 400,
        height: 660,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        backgroundColor: '#EEE',
    })

    windows.buyEverWin.loadFile(path.join(__dirname, '..', 'assets', 'setup', 'buy-ever.html'))

    windows.buyEverWin.on('closed', () => windows.buyEverWin = null)
}

module.exports = {
    openBuyEverWindow
}
