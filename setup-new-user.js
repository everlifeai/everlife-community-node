const BrowserWindow = require('electron').BrowserWindow;
let icon =  'assets/icon.png'
var Path = require('path')
var quitting = false

function openNewUserWindow() {
  const userWindow = new BrowserWindow({
   width: 2000,
   height: 1100,
   webPreferences: {
    nodeIntegration: true
  },
   title: 'Everlife Explorer',
    show: true,
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    backgroundColor: '#EEE',
    icon: icon
  });
  userWindow.loadURL("file://" + Path.join(__dirname, 'html/new-user/step-1.html'))
  userWindow.on('close', function (e) {
    if (!quitting && process.platform === 'darwin') {
      e.preventDefault()
      userWindow.hide()
    }
  })
  userWindow.on('closed', function () {
    if (process.platform !== 'darwin') {
      userWindow =null
      pm2.stopAll()
      electron.app.quit()
    }
  })
  return userWindow;
}

module.exports = {
  openNewUserWindow

}
