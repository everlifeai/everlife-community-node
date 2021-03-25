'use strict'
const fs = require('fs')
const path = require('path')

const u = require('@elife/utils')

const electron = require('electron')
const BrowserWindow = electron.BrowserWindow

function checkAndCreateMnemonicKeys(cb) {
    const secretFile = path.join(u.ssbLoc(), 'secret')
    if(fs.existsSync(secretFile)) return cb()

    u.ensureExists(u.ssbLoc(), err => {
      if(err) cb(err)
      else {
        openWindow()
        electron.ipcMain.on('mnemonic-keys-done', (e, err) => cb(err))
      }
    })
}

const windows = {
    mnemonicWin: null
}
function openWindow(ctx) {
    windows.mnemonicWin = new BrowserWindow({
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
    })
    windows.mnemonicWin.loadURL("file://" + path.join(__dirname, '..', 'assets', 'setup', 'step-1.html'))

    windows.mnemonicWin.on('closed', () => windows.mnemonicWin = null)
}

module.exports = {
    checkAndCreateMnemonicKeys,
}
