function pass(){
var CryptoJS = require("crypto-js");
var u = require('@elife/utils');
const fs =require('fs') 
const logpass = document.querySelector('.pswrd').value;
var lpasencrypt = CryptoJS.AES.encrypt(logpass, 'secret key 123').toString();
fs.readFile(path.join(u.dataLoc(), 'login_password.json'),"utf8", (err, data) => {
  if(err) {
    console.error(err)
    
  }else{
    const userPass = JSON.parse(data);
    var decrypPass=userPass[0].password
    var bytes  = CryptoJS.AES.decrypt(decrypPass, 'secret key 123');
    var originalText = bytes.toString(CryptoJS.enc.Utf8);
    if(originalText == logpass){
      const data ='Logining'
      ipcRenderer.send('login with Password',data)
      var window = remote.getCurrentWindow()
      window.close()

    }else{
      const lgagain='Try again'
      ipcRenderer.send('Login Again',lgagain)
      var window = remote.getCurrentWindow()
      window.close()
    }

  }
})
}

