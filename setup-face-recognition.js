const BrowserWindow = require('electron').BrowserWindow;
let icon =  'assets/icon.png'
var Path = require('path')
var quitting = false

function openLoginWindow() {
  const loginWindow = new BrowserWindow({
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
  loginWindow.loadURL("file://" + Path.join(__dirname, 'html/face-recognition/existinguser.html'))
  loginWindow.on('close', function (e) {
    if (!quitting && process.platform === 'darwin') {
      e.preventDefault()
      loginWindow.hide()
    }
  })
  loginWindow.on('closed', function () {
    if (process.platform !== 'darwin') {
      loginWindow =null
      pm2.stopAll()
      electron.app.quit()
    }
  })
  return loginWindow;
}

module.exports = {
  openLoginWindow

}
