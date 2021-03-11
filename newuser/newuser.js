const { Cipher } = require('crypto');
const fs = require('fs')
const path = require('path')
const u = require('@elife/utils')
const { ipcRenderer } = require('electron');
const {remote} = require('electron');

const Path = require('path')

var pharseParam ='';
var pharseParam2=''
var phrase='';
var selectrdPhraseArr=[];
var pubkey;
var seckey;
var publickey;
var secretkey;
var elifeKeys;
var secureKeys = '';
var passMatch= false;
if (document.URL.split('?')[0].includes('4.html')){
    const params = new URLSearchParams(window.location.search)
    for (const param of params) {
        pharseParam=param[1].split('^^')[0];
        pharseParam2 = param[1].split('^^')[1];
        
    }
    
    document.getElementById('generate').innerHTML = pharseParam;
     phrase=pharseParam.split(" ")
   
    var text = "";
      for (var i = 0; i < phrase.length; i++) {
        text += "<div  onclick=selectedPhrase('"+phrase[i]+"') class='phrase' id=phrase"+ i +">"+phrase[i] + "</div>";
      }
    document.getElementById("generate").innerHTML = text;

}

function selectedPhrase(inp){
    if(!selectrdPhraseArr.includes(inp)){
        selectrdPhraseArr.push(inp)

    for(var i=0;i<selectedPhrase.length;i++){
        generate(inp)
    }
    var imgs = document.createElement("img");
    imgs.setAttribute("class","phraseimg")
    imgs.setAttribute('width','15px')
    imgs.setAttribute('src','data:image/png;base64,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')
    imgs.setAttribute('onclick',"imgClose('"+inp+"')")
    document.getElementById(inp).appendChild(imgs)
    }


}

function imgClose(inp){
    var removeEle= document.getElementById(inp);
    var value= removeEle.getAttribute('id');
    selectrdPhraseArr = selectrdPhraseArr.filter(function(item) {
      return item !== value
    })
    removeEle.parentNode.removeChild(removeEle);
    
}


function generate(inp){
    var objTo = document.getElementById('pharsetext')
    var divtest = document.createElement("div");
    divtest.setAttribute("class","phrasetag")
    divtest.setAttribute("id",inp)
    divtest.innerHTML = inp
    objTo.appendChild(divtest)
}

var checkboxValue = false;
var copiedPhrase='';

function goBack() {
  window.history.back();
}

//Password Validation goes here
function CheckPassword(inputtxt,passfld) { 
  if(!inputtxt.value) {
  document.getElementById('pass1msg').innerText= "Password is required"
  return false;
  }

  if(!inputtxt.value.match("^.{6,20}$")) {
  document.getElementById('pass1msg').innerText= "Min 10 characters"
  return false;
  } 

  if(!inputtxt.value.match("(.*[a-z].*)")) {
  document.getElementById('pass1msg').innerText= "Atleast one lower character"
  return false;
  } 

  if(!inputtxt.value.match("(.*[A-Z].*)")) {
  document.getElementById('pass1msg').innerText= "Atleast one upper character"
  return false;
  } 

  if(!inputtxt.value.match("(.*[0-9].*)")) {
  document.getElementById('pass1msg').innerText= "Atleast one number"
  return false;
  } 

  else{
  document.getElementById('pass1msg').innerText= ""
  }
  if(passfld==2){
  if(document.getElementById('newpass').value!=document.getElementById("confirmpass").value){
    document.getElementById('pass2msg').innerText= "Check your password"

  } 
  else{
      document.getElementById('pass2msg').innerText= "" 
      passMatch = true;

  }
  }

}

function checkBoxcheck(a){
    var newVal = a.value=='false' ? true : false   
    if(newVal==true) document.getElementById('termsOfUse').style='background: rgb(57, 30, 218)';
    else document.getElementById('termsOfUse').style='background: rgba(210, 216, 229, 0.4);'
    document.getElementById('termsOfUse').value = newVal;

}


function savePassword(){
  if(passMatch){
    var CryptoJS = require("crypto-js");
    const pass = document.getElementById('confirmpass');
    const val = pass.value;
    
    var ciphertext = CryptoJS.AES.encrypt(val, 'secret key 123').toString();
    fs.writeFile(path.join(u.dataLoc(),'stellarPassword.txt'), JSON.stringify({'spw':ciphertext}), function (err) {
      if (err) throw err;
      window.location.href='./3.html'
    });
  }else {
    document.getElementById('pass2msg').innerText= "Check your password"
    return false;
    
  }
  }


var mnemonic;
function showPhrases(){
    const StellarHDWallet = require('stellar-hd-wallet') 
    mnemonic= StellarHDWallet.generateMnemonic()
    const wallet = StellarHDWallet.fromMnemonic(mnemonic)
    
    publickey=wallet.getPublicKey(0)
    secretkey=wallet.getSecret(0) 
    document.getElementById("showbackup").innerHTML = mnemonic;
    copiedPhrase = mnemonic;
    const mnemonics = require('ssb-keys-mnemonic')

    const words = mnemonic

    elifeKeys = mnemonics.wordsToKeys(words)
    
    const secretFile = Path.join(u.dataLoc(), '__ssb','secret');
    const keys = {...elifeKeys}
    secureKeys = keys;
    keys.words =mnemonic;
    keys.secretkey=secretkey;
    keys.publickey=publickey;
      const lines = [
      '# this is your SECRET name.',
      '# this name gives you magical powers.',
      '# with it you can mark your messages so that your friends can verify',
      '# that they really did come from you.',
      '#',
      '# if any one learns this name, they can use it to destroy your identity',
      '# NEVER show this to anyone!!!',
      '',
      JSON.stringify(keys, null, 2),
      '',
      '# WARNING! It\'s vital that you DO NOT edit OR share your secret name',
      '# instead, share your public name',
      '# your public name: ' + keys.id
      ].join('\n')
      fs.writeFile(secretFile,lines ,err => {
        
                if (err) {
                  console.error(err)
                  return
                }

            })

}


function submitBtn(){
  if(copiedPhrase.length>0){
    window.location.href='4.html?phrase='+ copiedPhrase +'^^'+ publickey +'~~'+ secretkey+'~~'+secureKeys;
  }else{
    alert('Click showbackup phrase button to proceed')
  }
    
}


function copyPhrases(){
    copytoClipBroad()
}

function submitPhrases(inp){
    console.log(selectrdPhraseArr)
    if(phrase[2] == selectrdPhraseArr ){
        window.location.href='5.html?phrase='+ pharseParam2 + '~~'+secureKeys;
    }
    
    else{
        document.getElementById('pharsetext').innerHTML=''
    }
}

function copytoClipBroad() {
  if(document.getElementById('showphrases')){

    if(document.getElementById('showphrases').innerText == 'Show backup phrase'){
      return false
    }
  }if(document.getElementById('showbackup').innerText.length > 0){
        var range = document.createRange();
        range.selectNode(document.getElementById("showbackup"));
        window.getSelection().removeAllRanges(); 
        window.getSelection().addRange(range); 
        document.execCommand("copy");
        window.getSelection().removeAllRanges();
  }
}

//Downloading the mnemonic phrase into a textfile
function download() {
  if(document.getElementById('showphrases')){

    if(document.getElementById('showphrases').innerText == 'Show backup phrase'){
      return false
    }
  }if(document.getElementById('showbackup').innerText.length > 0){
    var a = document.body.appendChild(
      document.createElement("a")
   );
  a.download = "Backup_Phrase.txt";
  a.href = "data:text/html," + document.getElementById("showbackup").innerHTML;
  a.click(); 
  }
}

if (document.URL.split('?')[0].includes('5.html')){
  
   fs.readFile(path.join(u.dataLoc(), "__ssb/secret"), 'utf8' , (err, data) => {
    if (err) {
      console.error(err)
      return
    }
    secureKeys = JSON.parse('{' + data.split('{')[1].split('}')[0]+ '}') 
    document.getElementById('everlifekeys').innerHTML = secureKeys.id;

  })

    const keys = new URLSearchParams(window.location.search)
    for (const key of keys) {
        pubkey=key[1].split('~~')[0]
        seckey=key[1].split('~~')[1]
        elifeKeys =key[1].split('~~')[2]
      }    

    document.getElementById('pubkey').innerHTML = pubkey;
    document.getElementById('seckey').innerHTML = seckey;
}
function openElifeDashboard(){
  let winData = 'Go to main Window'
       ipcRenderer.send('main-window', winData )
        var window = remote.getCurrentWindow()
        window.close()
  
}
