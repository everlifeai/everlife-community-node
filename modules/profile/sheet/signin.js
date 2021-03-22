var nest = require('depnest')
var extend = require('xtend')
var { Value, h, computed, when } = require('mutant')
var CryptoJS = require("crypto-js");
const fs = require('fs');
var path_ = require('path')
var WebCamera = require("webcamjs");
const u = require('@elife/utils')
const path = require('path');
let profileName =''
let faceImg ='../../../assets/img/face.png'
let passwordlockImg ='../../../assets/img/passwordlock.png'

exports.gives = nest('profile.sheet.signin')

exports.needs = nest({
  'sheet.display': 'first',
  'keys.sync.id': 'first',
  'message.async.publish': 'first',
  'sbot.async.publish': 'first',
  'blob.html.input': 'first',
  'blob.sync.url': 'first',
  'intl.sync.i18n': 'first',
  'suggest.hook': 'first',
  'about.sync.shortFeedId': 'first'
})


exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  
  return nest('profile.sheet.signin', function () {
  
      api.sheet.display(close => {
        return {
          content: [
             
            h("h2", "Manage how you sign in into your device"), 
            h("p", {style:{"margin-left":'20px'}},"Select a sign-in option to add,change,or remove it"),
            h('div .collapsible',{ 
                  style: {
                    'background-color':'#f1f1f1',
                      'cursor':'pointer' ,
                      padding: "8px"  ,
                      width: "100%",
                      'font-family': 'Times New Roman',
                      border:'none',
                      'text-align': 'left',
                      'text-align':'left',
                      'font-color':'Black',
                      'outline':'none',
                      'font-size': '15px',
                      
                  },
              'ev-click': ()=>face() },
              [
                h('div .container', {
                    
                    style: {
                      "display": "flex"
                    }
                },[h('img',{
                  src: path_.join(__dirname, faceImg),
                  style:{
                   "margin": "6px",
                   height: "30px",
                  },
                },),'Everlife Hello Face',h('br'),'Sign in with your face'])
              ]),
              h('div .content',{
                style:{
                  padding: "0 18px",
                  display:"None",
                  overflow: 'hidden',
                  'background-color': '#f1f1f1'
                },
              },[
              h('span',{style:{'font-size': '100%'}},'You can sign in to Everlife by using Everlife Hello to recognize your face'),
              h('div .rec-btn-grp.rec-btn-grp-space ',{
              style:{
                "margin-top": "10px",    
                "margin-right": "10px",

              }},
            [h('button .btn-space',{
              class:'btn',
              id:'start',
              'ev-click':labels,
              
            },
            i18n('Register')),
            h('button .btn-space',{
              class:'btn',
              id:'start',
              style:{
                "margin-left":"5px"
              },
              'ev-click':openWebcam
            },
            i18n('Set up')),
            h('button .btn-space',{
              class:'btn',
              id:'remove',
              'ev-click':removeFacerecognition,
              style:{
                "margin-left":"5px"
              }
            },i18n('Remove'))]),
            h('div #myDiv',{style:{'display':'none'}
            },[h('span',i18n('Name:')),
            h('input',{
              type:'text',
              id:'fname',          
              name:'fname',
                style:{
                  'background':'White',
                  'color':'Black'
                },
                placeholder:'Enter Name'
              
            }),
            h('button .register',{
              type:'button',
              style:{
                "margin-left":"5px"
              },
              'ev-click':register,
            },'Submit')]
            ),
            h('div #camdemo',{
              style:{
                width: "320px",
                height: "240px"
              }
            }),h('input',{
              type:'button',
              id:'btPic',
              value: i18n('Take a snap'),
              'ev-click': takeSnapShot
            }),
            h('input',{
              type:'button',
              id:'start',
              value: i18n('Turn off camera'),
              style:{
                "margin-left":"5px"
              },
              'ev-click': closeCamera
            })],

            ),

            h('div .collapsible',{
              style: {
                'background-color':'#f1f1f1',
                  'cursor':'pointer' ,
                  padding: "8px"  ,
                  width: "100%",
                  'font-family': 'Times New Roman',
                  border:'none',
                  'text-align': 'left',
                  'text-align':'left',
                  'outline':'none',
                  'font-size': '15px'
              },
              'ev-click': ()=>face() 
            },[
              h('div .container', {
                  
                  style: {
                    "display": "flex"
                  }
              },[h('img',{
                src: path_.join(__dirname, passwordlockImg),
                style:{
                 "margin": "6px",
                 height: "30px",
                },
              },),'Everlife Password',h('br'),'Sign in with password'])
            ]),h('div .content',{
            style:{
              id:'pass',
              padding: "0 18px",
              display:"None",
              overflow: 'hidden',
              'background-color': '#f1f1f1'
            },
          },[
          h('div .container',{
            style:{
              "margin-left": "30px",
              "cursor": "pointer"
            }
          },[h('h1',{style:{
            "font-size":"15px"
          }},'Create Password for login'),
          
          h('input.pwd',{
            type:"password",
            name:"password",
            id:'field_pwd1',
            placeholder:'New password',

          }),h('input.pwd',{
            type:"password",
            name:"password",
            id:"field_pwd2",
            placeholder:'Re-enter the password',
            style:{
              "margin-left":"5px"
            },
            
          }),h('button .save',{
            type:'button',
            'ev-click': savePassword,
            style:{
              "margin-left":"5px"
            },
          },i18n('Save')),
        
          [h('h1',{       
            style:{
              "font-size":"15px"
            },
          },i18n('Remove Password for Everlife Login')),
          h('button .removepwd',{
            type:'button',
            'ev-click': removePassword,
            style:{
              "margin-left":"5px"
            },
          },i18n('Remove Password'))],
        ])
         ])
 
          ],
          footer: [
          
            h('button -cancel', {
              'ev-click': close
            }, i18n('Cancel'))
          ]
        }
      })
      function cancel(){
        close()
      }

      function labels(){
        var x = document.getElementById("myDiv");
        if (x.style.display === "none") {
          x.style.display = "block";
        } else {
          x.style.display = "none";
        }
      }
      function register(){
        var x=document.getElementById('fname');
        profileName=x.value
        const dir = u.faceimgLoc()+"/"+profileName;
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, {
            recursive: true
          });
        }
        document.getElementById('fname').value = ""
      }
      function openWebcam(){
        var enabled = false;
        if(!enabled){ // Start the camera !
          enabled = true;
          WebCamera.attach('#camdemo');
          console.log("The camera has been started");
        }else{ // Disable the camera !
          enabled = false;
          WebCamera.reset();
         console.log("The camera has been disabled");
        }
      }
      function takeSnapShot(){
        WebCamera.snap(function (data_uri) {
          //var dirPath ='C:/Users/SF/AppData/Roaming/Local/everlifeai/0/images/' 
        var dirPath =u.faceimgLoc()+"/"+profileName;
        var data = data_uri.replace(/^data:image\/\w+;base64,/, "");
        var buf = new Buffer.from(data, 'base64');
        fs.writeFile(dirPath+'/'+ Math.floor(Math.random() * 10)+'.png', buf, err => {
            if (err) throw err;
            console.log('Saved!');
        })
      })
      }

      function closeCamera() {
        WebCamera.reset();
      }

      function removeFacerecognition(){
        var dirPath =u.faceimgLoc()  
        fs.readdir(dirPath, (err, files) => {
          if (err) throw err;
      
          for (const file of files) {
            fs.unlink(path.join(dirPath, file), err => {    
              if (err) throw err;
            });
          }
        })
        
        showDialog({
          type: 'info',
          title:'Face Recognition',
          message: i18n('Everlife login using Face Recognition has removed'),
          detail: i18n('Everlife Hello Face is no longer available for you.If want to enable login using face, you can set up again by clicking the Set up button ')
        })
      }
      

  
    function removePassword(){
    var pass_loc = path.join(u.dataLoc(), "login_password.txt")
    fs.unlinkSync(pass_loc);


    showDialog({
      type: 'info',
      title:'Everlife Password',
      message: i18n('Password Removed Successfully'),
      //detail: i18n('Everlife Hello Face is no longer available for you.If want to enable login using face, you can set up again by clicking the Set up button ')
    })
    }
    
    function savePassword(){
    
      function checkPassword(str){
        var re = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}$/;
        return re.test(str);
      }
 
      var pwd1=document.getElementById('field_pwd1');
      var pwd2 =document.getElementById('field_pwd2');
    if(!pwd1.value) return showErr(i18n('Need Password'), i18n('Please enter new password'))
    if(!pwd2.value) return showErr(i18n('Need Password'), i18n('Please enter confirm password'))
    else if (pwd1.value != pwd2.value) {  
      return showErr(i18n('Password'), i18n('Password didnot match')); 
    }
    else{
        const newpass = pwd1.value;
          // Encrypt
            var ciphertext = CryptoJS.AES.encrypt(newpass, 'secret key 123').toString();
            var obj = [{
                      password : ciphertext
                    }]
           
              fs.writeFile(path.join(u.dataLoc(), "login_password.json"), JSON.stringify(obj), 'utf8', function (err) {
              if (err) {
                return console.log(err);
              }
              })
             
              showDialog({
                type: 'info',
                title:'Everlife Password',
                message: i18n('Password Saved Successfully'),
              })

              pwd1.value="";
              pwd2.value="";
              
            }
            
              

              
  }


  function showErr(msg, detail) {
    var electron = require('electron')
    electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), {
      type: 'error',
      title: 'Cannot save Password',
      buttons: [i18n('Ok')],
      message:msg,
      detail: detail,
    })
  }

      
  })
 

}

function face() {
var coll = document.getElementsByClassName("collapsible");
var i;

for (i = 0; i < coll.length; i++) {
coll[i].addEventListener("click", function() {
  this.classList.toggle("active");
  var content = this.nextElementSibling;
  if (content.style.display === "block") {
    content.style.display = "none";
  } else {
    content.style.display = "block";
  }
});
}

}
function showDialog (opts) {
  var electron = require('electron')
  electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), opts)
}




