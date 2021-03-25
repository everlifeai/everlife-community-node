'use strict'

function pass(){
  var u = require('@elife/utils');
  const fs =require('fs')
  const logpass = document.querySelector('.pswrd').value;

  fs.readFile(path.join(u.dataLoc(), 'login_password.json'),"utf8", (err, data) => {
    if(err) {
      console.error(err)
    } else {
      data = JSON.parse(data);
      // TODO: decrypt
      let userPass = data[0].password
      if(userPass == logpass) {
        ipcRenderer.send('login with Password')
        window.close()
      } else {
        ipcRenderer.send('Login Again')
        window.close()
      }
    }
  })
}

