const { Cipher } = require("crypto")
const fs = require("fs")
const path = require("path")
const u = require("@elife/utils")
const { ipcRenderer } = require("electron")

const StellarHDWallet = require("stellar-hd-wallet")
const SSBMnemonics = require("ssb-keys-mnemonic")
const ethers = require("ethers")
const StellarSdk = require('stellar-sdk')

var selectedPhrase = ""
var passMatch = false
var mnemonic

//Password Validation goes here
function CheckPassword(inputtxt, passfld) {
  if (!inputtxt.value) {
    document.getElementById("pass1msg").innerText = "Password is required"
    return false
  }

  if (!inputtxt.value.match("^.{6,20}$")) {
    document.getElementById("pass1msg").innerText = "Min 10 characters"
    return false
  }

  if (!inputtxt.value.match("(.*[a-z].*)")) {
    document.getElementById("pass1msg").innerText =
      "Atleast one lower character"
    return false
  }

  if (!inputtxt.value.match("(.*[A-Z].*)")) {
    document.getElementById("pass1msg").innerText =
      "Atleast one upper character"
    return false
  }

  if (!inputtxt.value.match("(.*[0-9].*)")) {
    document.getElementById("pass1msg").innerText = "Atleast one number"
    return false
  } else {
    document.getElementById("pass1msg").innerText = ""
  }
  if (passfld == 2) {
    if (document.getElementById("newpass").value != document.getElementById("confirmpass").value) {
      document.getElementById("pass2msg").innerText = "Check your password"
      passMatch = false
    } else {
      document.getElementById("pass2msg").innerText = ""
      passMatch = true
    }
  }
}

function checkBoxcheck(a) {
  var newVal = a.value == "false" ? true : false
  if (newVal == true)
    document.getElementById("termsOfUse").style =
      "background: rgb(57, 30, 218)"
  else
    document.getElementById("termsOfUse").style =
      "background: rgba(210, 216, 229, 0.4);"
  document.getElementById("termsOfUse").value = newVal
}

function savePassword() {
  if (passMatch) {
    var CryptoJS = require("crypto-js")
    const pass = document.getElementById("confirmpass")
    const val = pass.value

    var ciphertext = CryptoJS.AES.encrypt(val, "secret key 123").toString()
    fs.writeFile(
      path.join(u.dataLoc(), "stellarPassword.txt"),
      JSON.stringify({ spw: ciphertext }),
      function (err) {
        if (err) throw err
        window.location.href = "./step-3.html"
      }
    )
  } else {
    document.getElementById("pass2msg").innerText = "Check your password"
    return false
  }
}

function showPhrases() {
  mnemonic = StellarHDWallet.generateMnemonic()
  document.getElementById("showbackup").innerHTML = mnemonic
}

function saveSecret(cb) {
  const swallet = StellarHDWallet.fromMnemonic(mnemonic)
  const stellar = {
    publicKey: swallet.getPublicKey(0),
    secretKey: swallet.getSecret(0),
  }
  const ewallet = ethers.Wallet.fromMnemonic(mnemonic)
  const eth = {
    address: ewallet.address,
    publicKey: ewallet.publicKey,
    privateKey: ewallet.privateKey,
  }
  const keys = SSBMnemonics.wordsToKeys(mnemonic)
  keys.mnemonic = mnemonic
  keys.stellar = stellar
  keys.eth = eth
  const lines = [
    "# this is your SECRET name.",
    "# this name gives you magical powers.",
    "# with it you can mark your messages so that your friends can verify",
    "# that they really did come from you.",
    "#",
    "# if any one learns this name, they can use it to destroy your identity",
    "# NEVER show this to anyone!!!",
    "",
    JSON.stringify(keys, null, 2),
    "",
    "# WARNING! It's vital that you DO NOT edit OR share your secret name",
    "# instead, share your public name",
    "# your public name: " + keys.id,
  ].join("\n")
  fs.writeFile(u.secretFile(), lines,{ mode: 0x100, flag: "wx" } ,cb)
}

//Downloading the mnemonic phrase into a textfile
function download() {
  if (document.getElementById("showphrases")) {
    if (
      document.getElementById("showphrases").innerText == "Show backup phrase"
    ) {
      return false
    }
  }
  if (document.getElementById("showbackup").innerText.length > 0) {
    var a = document.body.appendChild(document.createElement("a"))
    a.download = "Backup_Phrase.txt"
    a.href =
      "data:text/html," + document.getElementById("showbackup").innerHTML
    a.click()
  }
}

//Copy to clipboard
function copytoClipBroad() {
  if (document.getElementById("showphrases")) {
    if (
      document.getElementById("showphrases").innerText == "Show backup phrase"
    ) {
      return false
    }
  }
  if (document.getElementById("showbackup").innerText.length > 0) {
    var range = document.createRange()
    range.selectNode(document.getElementById("showbackup"))
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)
    document.execCommand("copy")
    window.getSelection().removeAllRanges()
  }
}

//on submit parse keys from step-3.html to step-4.html
function submitBtn(){
  if(mnemonic.length>0){
    window.location.href='step-4.html?phrase='+ mnemonic
  }else{
    alert('Click showbackup phrase button to proceed')
  }
}

function getMnemonic() {
  const params = new URLSearchParams(window.location.search)
  return params.get('phrase')
}

function generatekeys(){
  mnemonic = getMnemonic()

  const shuffle = arr =>
    [...arr].reduceRight((res,_,__,s) =>
      (res.push(s.splice(0|Math.random()*s.length,1)[0]), res),[])

  const phraseArry = shuffle(mnemonic.split(" "))

  const g = document.getElementById("generate")
  g.innerHTML = ""

  for(let i = 0;i < phraseArry.length;i++) {
    const curr = phraseArry[i]
    const e_ = document.createElement("div")
    e_.classList.add("phrase")
    e_.innerText = curr
    e_.onclick = () => {
      selectedPhrase = curr

      const sarea = document.getElementById("pharsetext")
      sarea.innerHTML = ""
      const divtest = document.createElement("div")
      divtest.setAttribute("class", "phrasetag")
      divtest.innerText = curr

      const close = document.createElement("img")
      close.setAttribute("class", "phraseimg")
      close.setAttribute("width", "15px")
      close.setAttribute("src", "../../assets/img/close_icon.png")
      close.onclick = () => {
        sarea.innerHTML = ""
        selectedPhrase = ""
      }

      divtest.appendChild(close)
      sarea.appendChild(divtest)

    }

    g.appendChild(e_)
  }
}


//check selected phrase is 3rd index on submit
function submitPhrases() {
  if(mnemonic.split(' ')[2] == selectedPhrase) {
    saveSecret(err => {
      if(err) alert(err)
      else window.location.href='step-5.html'
    })
  }
  else{// clearing from the selected array and making the text red on wrong selection
    selectedPhrase = ""
    document.getElementById('err-txt').classList.add("highlight")
    document.getElementById('pharsetext').innerHTML=""
    let errSelection = document.getElementById('err-selection');
    errSelection.innerHTML=`Incorrect Selection.Please select your third word`;
    errSelection.style.color ='#f0932b';
    errSelection.style.padding = '5px'

  }
}

function goBack() {
  window.history.back()
}

function copyPhrases(){
  copytoClipBroad()
}


function openElifeDashboard(){
  ipcRenderer.send('mnemonic-keys-done')
  setTimeout(() => window.close(), 1000)
}

function termsAndConditions(){
  require("electron").shell.openExternal('https://stellar.org/terms-of-service');
}
function privacyPolicyStellar(){
  require("electron").shell.openExternal('https://stellar.org/privacy-policy');
}

function importBackup(){
  var userinputedMnemonic = document.getElementById('importphrase').value;
  if(userinputedMnemonic){
    const swallet = StellarHDWallet.fromMnemonic(userinputedMnemonic)
    const stellar = {
      publicKey: swallet.getPublicKey(0),
      secretKey: swallet.getSecret(0),
    }
    const ewallet = ethers.Wallet.fromMnemonic(userinputedMnemonic)
    const eth = {
      address: ewallet.address,
      publicKey: ewallet.publicKey,
      privateKey: ewallet.privateKey,
    }
    const keys = SSBMnemonics.wordsToKeys(userinputedMnemonic)
    keys.mnemonic = userinputedMnemonic
    keys.stellar = stellar
    keys.eth = eth
    const lines = [
      "# this is your SECRET name.",
      "# this name gives you magical powers.",
      "# with it you can mark your messages so that your friends can verify",
      "# that they really did come from you.",
      "#",
      "# if any one learns this name, they can use it to destroy your identity",
      "# NEVER show this to anyone!!!",
      "",
      JSON.stringify(keys, null, 2),
      "",
      "# WARNING! It's vital that you DO NOT edit OR share your secret name",
      "# instead, share your public name",
      "# your public name: " + keys.id,
    ].join("\n")
    fs.writeFile(u.secretFile(), lines,{ mode: 0x100, flag: "wx" }, (err) => {
      if (err) {
        console.error(err);
        return;
      }
    });
    openElifeDashboard()
  }else{
    const keys={}
    const sourceSecretKey = document.getElementById('stellarID').value
    const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);
    const sourcePublicKey = sourceKeypair.publicKey();
    const stellar = {
        publicKey: sourcePublicKey,
        secretKey: sourceSecretKey
    }
    const eth={
      address: document.getElementById('EthereumAddress').value,
      publicKey: document.getElementById('EthereumPublickey').value,
      privateKey: document.getElementById('EthereumPrivateKey').value,
    }
    keys.public = document.getElementById('avatarID').value,
    keys.private = document.getElementById('privateID').value,
    keys.id = '@'+document.getElementById('avatarID').value,
    keys.stellar = stellar;
    keys.eth =eth;
    const lines = [
      "# this is your SECRET name.",
      "# this name gives you magical powers.",
      "# with it you can mark your messages so that your friends can verify",
      "# that they really did come from you.",
      "#",
      "# if any one learns this name, they can use it to destroy your identity",
      "# NEVER show this to anyone!!!",
      "",
      JSON.stringify(keys, null, 2),
      "",
      "# WARNING! It's vital that you DO NOT edit OR share your secret name",
      "# instead, share your public name",
      "# your public name: " + keys.id,
    ].join("\n")
    fs.writeFile(u.secretFile(), lines,{ mode: 0x100, flag: "wx" }, (err) => {
      if (err) {
        console.error(err);
        return;
      }
  });
  openElifeDashboard()
  
}
  

}