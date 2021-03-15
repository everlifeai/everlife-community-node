const { Cipher } = require("crypto");
const fs = require("fs");
const path = require("path");
const u = require("@elife/utils");
const { ipcRenderer } = require("electron");
const { remote } = require("electron");

const Path = require("path");

var pharseParam = "";
var pharseParam2 = "";
var phraseArry = [];
var selectrdPhraseArr = [];
var pubkey;
var seckey;
var publickey;
var secretkey;
var elifeKeys;
var secureKeys = "";
var passMatch = false;
var mnemonic;
var checkboxValue = false;
var copiedPhrase = "";



//Password Validation goes here
function CheckPassword(inputtxt, passfld) {
  if (!inputtxt.value) {
    document.getElementById("pass1msg").innerText = "Password is required";
    return false;
  }

  if (!inputtxt.value.match("^.{6,20}$")) {
    document.getElementById("pass1msg").innerText = "Min 10 characters";
    return false;
  }

  if (!inputtxt.value.match("(.*[a-z].*)")) {
    document.getElementById("pass1msg").innerText =
      "Atleast one lower character";
    return false;
  }

  if (!inputtxt.value.match("(.*[A-Z].*)")) {
    document.getElementById("pass1msg").innerText =
      "Atleast one upper character";
    return false;
  }

  if (!inputtxt.value.match("(.*[0-9].*)")) {
    document.getElementById("pass1msg").innerText = "Atleast one number";
    return false;
  } else {
    document.getElementById("pass1msg").innerText = "";
  }
  if (passfld == 2) {
    if (
      document.getElementById("newpass").value !=
      document.getElementById("confirmpass").value
    ) {
      document.getElementById("pass2msg").innerText = "Check your password";
    } else {
      document.getElementById("pass2msg").innerText = "";
      passMatch = true;
    }
  }
}

function checkBoxcheck(a) {
  var newVal = a.value == "false" ? true : false;
  if (newVal == true)
    document.getElementById("termsOfUse").style =
      "background: rgb(57, 30, 218)";
  else
    document.getElementById("termsOfUse").style =
      "background: rgba(210, 216, 229, 0.4);";
  document.getElementById("termsOfUse").value = newVal;
}

function savePassword() {
  if (passMatch) {
    var CryptoJS = require("crypto-js");
    const pass = document.getElementById("confirmpass");
    const val = pass.value;

    var ciphertext = CryptoJS.AES.encrypt(val, "secret key 123").toString();
    fs.writeFile(
      path.join(u.dataLoc(), "stellarPassword.txt"),
      JSON.stringify({ spw: ciphertext }),
      function (err) {
        if (err) throw err;
        window.location.href = "./step-3.html";
      }
    );
  } else {
    document.getElementById("pass2msg").innerText = "Check your password";
    return false;
  }
}

function showPhrases() {
  const StellarHDWallet = require("stellar-hd-wallet");
  mnemonic = StellarHDWallet.generateMnemonic();
  const wallet = StellarHDWallet.fromMnemonic(mnemonic);

  publickey = wallet.getPublicKey(0);
  secretkey = wallet.getSecret(0);
  document.getElementById("showbackup").innerHTML = mnemonic;
  copiedPhrase = mnemonic;
  const mnemonics = require("ssb-keys-mnemonic");

  const words = mnemonic;

  elifeKeys = mnemonics.wordsToKeys(words);
  //Create secret file
  const secretFile = Path.join(u.dataLoc(), "__ssb", "secret");
  const keys = { ...elifeKeys };
  secureKeys = keys;
  keys.words = mnemonic;
  keys.secretkey = secretkey;
  keys.publickey = publickey;
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
  ].join("\n");
  fs.writeFile(secretFile, lines, (err) => {
    if (err) {
      console.error(err);
      return;
    }
  });
}

//Downloading the mnemonic phrase into a textfile
function download() {
  if (document.getElementById("showphrases")) {
    if (
      document.getElementById("showphrases").innerText == "Show backup phrase"
    ) {
      return false;
    }
  }
  if (document.getElementById("showbackup").innerText.length > 0) {
    var a = document.body.appendChild(document.createElement("a"));
    a.download = "Backup_Phrase.txt";
    a.href =
      "data:text/html," + document.getElementById("showbackup").innerHTML;
    a.click();
  }
}

//Copy to clipboard
function copytoClipBroad() {
  if (document.getElementById("showphrases")) {
    if (
      document.getElementById("showphrases").innerText == "Show backup phrase"
    ) {
      return false;
    }
  }
  if (document.getElementById("showbackup").innerText.length > 0) {
    var range = document.createRange();
    range.selectNode(document.getElementById("showbackup"));
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand("copy");
    window.getSelection().removeAllRanges();
  }
}

//on submit parse keys from step-3.html to step-4.html
function submitBtn(){
  if(copiedPhrase.length>0){
    window.location.href='step-4.html?phrase='+ copiedPhrase +'^^'+ publickey +'~~'+ secretkey+'~~'+secureKeys ;
  }else{
    alert('Click showbackup phrase button to proceed')
  }    
}

function generatekeys(){
  const params = new URLSearchParams(window.location.search);
  for (const param of params) {
    mnemonic = param[1].split("^^")[0];
    pharseParam2 = param[1].split("^^")[1];
  }
  
  //To shuffle the array
  const shuffle = arr =>   [...arr].reduceRight((res,_,__,s) => 
  (res.push(s.splice(0|Math.random()*s.length,1)[0]), res),[]);

  phraseArry = shuffle(mnemonic.split(" "));

  //construct mnemonic word selection  and write to DOM
  var mnemonicHTML = "";
  for (var i = 0; i < phraseArry.length; i++) {
    mnemonicHTML +=
      "<div onclick=selectedPhrase('" + phraseArry[i] +  "') class='phrase' id=phrase" + i + ">" +
      phraseArry[i] +
      "</div>";
  }

  document.getElementById("generate").innerHTML = mnemonicHTML;
}


function selectedPhrase(inp) {
  if(selectrdPhraseArr.length==0){
    if (!selectrdPhraseArr.includes(inp)) {
      selectrdPhraseArr.push(inp);
  
        generate(inp);
      var imgs = document.createElement("img");
      imgs.setAttribute("class", "phraseimg");
      imgs.setAttribute("width", "15px");
      imgs.setAttribute("src", "./images/close_icon.png");
      imgs.setAttribute("onclick", "imgClose('" + inp + "')");
      document.getElementById(inp).appendChild(imgs);
    }
  }
}

function imgClose(inp) {
  var removeEle = document.getElementById(inp);
  var value = removeEle.getAttribute("id");
  selectrdPhraseArr = selectrdPhraseArr.filter(function (item) {
    return item !== value;
  });
  removeEle.parentNode.removeChild(removeEle);
}

function generate(inp) {
  var objTo = document.getElementById("pharsetext");
  var divtest = document.createElement("div");
  divtest.setAttribute("class", "phrasetag");
  divtest.setAttribute("id", inp);
  divtest.innerHTML = inp;
  objTo.appendChild(divtest);
}

//check selected phrase is 3rd index on submit
function submitPhrases(inp){
  if(mnemonic.split(' ')[2] == selectrdPhraseArr ){
      window.location.href='step-5.html?phrase='+ pharseParam2 + '~~'+secureKeys;
  }  
  else{// clearing from the selected array and making the text red on wrong selection
    selectrdPhraseArr.pop();      
    document.getElementById('err-txt').style.color='red'
    document.getElementById('pharsetext').innerHTML=''
  }
}

function goBack() {
  window.history.back();
}


function copyPhrases(){
    copytoClipBroad()
}


function openElifeDashboard(){
  let winData = 'Go to main Window'
       ipcRenderer.send('main-window', winData )
        var window = remote.getCurrentWindow()
        window.close()
  
}

function displayKeys(){
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
