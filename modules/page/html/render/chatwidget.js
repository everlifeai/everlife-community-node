let store = require('store')
let { h } = require('mutant')
let path = require('path')
let fs = require('fs')
let cfg = loadConfig()
let msgs = []


function setMsgs(){
    let msgList = getMsgs();
    if(!msgList || msgList.length < 1){
        onboardUser()
        return;
    }
    if(msgList.length > 0) msgs = msgList

    for(let i=0; i < msgs.length; i++){
        let msg = msgs[i]
        showMsg(msg.msg, msg.from, msg.addl, false)
    }
}

function onboardUser() {
    userSays(cfg, '/start')
}

function pollForMsgs(cfg) {
    getBotMsg(cfg, (err, msg, addl) => {
        if(err) console.error(err)
        else botSays(cfg, msg, addl)
        pollAgain(cfg)
    })
}

let TIMER
function pollAgain(cfg) {
    if(TIMER) clearTimeout(TIMER)
    TIMER = setTimeout(() => {
            pollForMsgs(cfg)
    }, currentTimeOut())
}

let POLLING_INTERVAL=10
let NUM_TRIES=0
function currentTimeOut() {
    if(POLLING_INTERVAL < 10) {
        NUM_TRIES++
        if(NUM_TRIES > 30) {
            POLLING_INTERVAL = 10
            NUM_TRIES = 0
        }
    }
    return POLLING_INTERVAL*1000
}

function loadConfig() {
    let cfg = {}

    if(process.env.QWERT_PORT) {
        cfg.PORT = process.env.QWERT_PORT
    } else {
        cfg.PORT = 7766
    }

    if(process.env.QWERT_DATA_DIR) {
        cfg.DATA_DIR = process.env.QWERT_DATA_DIR
    } else {
        cfg.DATA_DIR = './'
    }

    return cfg
}
/*      understand/
 * Call this whenever we send or receive a message
 */
function gotMsg(cfg) {
    POLLING_INTERVAL = 1
    pollAgain(cfg)
}

function writeMsg(msg){
    if(msg) {
        msgs.push(msg)
        store.set('msgs', msgs)
    }
}
function getMsgs(){
    let msgs = store.get('msgs')
    return msgs;
}

let USERMSGHANDLERS = []
exports.addUserMsgHandler = (handler) => {
  USERMSGHANDLERS.push(handler)
}

/*      outcome/
 * Send the message to the server and show it in our chat list and
 * trigger any handlers that want to know what the user said.
 */
function userSays(cfg, msg, addl) {
    if(isEmpty(msg) && isEmpty(addl)) return
    gotMsg(cfg)
    sendUsrMsg(cfg, msg, (err) => {
        if(err) {
            console.error(err)
            showMsg(`Error! Failed to send message to avatar!`, 'err', null, true)
        }
    }, addl)
    showMsg(msg, 'usr', addl, true)
    for(let i = 0;i < USERMSGHANDLERS.length;i++) USERMSGHANDLERS[i](msg)
}

/*      outcome/
 * Show the messages in our chat list and perform any additional
 * requests by the bot.
 */
function botSays(cfg, msg, addl) {
    if(isEmpty(msg) && isEmpty(addl)) return
    gotMsg(cfg)
    showMsg(msg, 'bot', addl, true)
    if(!isEmpty(addl)) doAddl(addl)
}

function showMsg(msg, from, addl, isLocalStoreMsg) {
    if(!msg && (!addl || addl.type != 'say')) return

    let msgs = document.getElementById("chat-output");

    let rowdiv = document.createElement("div")
    rowdiv.classList = `${from}msgrow`

    let msgdiv = document.createElement("div")
    msgdiv.classList = `${from}msg`

    if(msg) {
        let txtdiv = document.createElement("div")
        txtdiv.classList = "msgtxt"
        txtdiv.innerHTML = toMsgHml(msg)
        msgdiv.appendChild(txtdiv)
    }
    if(addl && addl.type == 'say') {
        let u_ = getDataURL(addl)
        if(u_) {
            let sounddiv = document.createElement("audio")
            sounddiv.setAttribute('controls', '')
            sounddiv.classList = "msgaudio"
            sounddiv.src = u_
            msgdiv.appendChild(sounddiv)
        }
    }
    if(from=='bot'){
        setAvatarIcon(rowdiv,from)
        rowdiv.appendChild(msgdiv)
        msgs.appendChild(rowdiv)
    }else if(from=='usr'){
        rowdiv.appendChild(msgdiv)
        msgs.appendChild(rowdiv)
        setAvatarIcon(rowdiv,from)
    }

    if(isLocalStoreMsg)
        writeMsg({from:from,msg:msg,addl:addl})
    msgs.scrollTop = msgs.scrollHeight;
}

function setAvatarIcon(msgDiv, from){
    if(!from || from =='err') return
    let user_icon = '..//..//..//../assets/user.jpg'
    let avatar_icon = '..//..//..//../assets/icon.png'

    let avatarImg = document.createElement('img')
    if(from=='bot') avatarImg.src = avatar_icon
    else avatarImg.src = user_icon
    avatarImg.style.backgroundRepeat='no-repeat'
    avatarImg.style.width='12%'
    avatarImg.style.height='11%'
    avatarImg.style.borderRadius='57%';
    msgDiv.appendChild(avatarImg)
}

function sendUsrMsg(cfg, msg, cb, addl) {
    if(!msg && !addl) return cb(`No message to send!`)
    let url_ = `http://localhost:${cfg.PORT}/msg`
    let xhr = new XMLHttpRequest()
    xhr.onreadystatechange = function() {
        if(xhr.readyState !== XMLHttpRequest.DONE) return
        if(xhr.status !== 200) cb(xhr)
        else cb()
    }
    xhr.open('POST', url_)
    xhr.send(JSON.stringify({msg:msg,addl:addl}))
}

/*      outcome/
 * Get the latest bot message from the server
 */
function getBotMsg(cfg, cb) {
    let url_ = `http://localhost:${cfg.PORT}/bot`
    let xhr = new XMLHttpRequest()
    xhr.onreadystatechange = function() {
        if(xhr.readyState !== XMLHttpRequest.DONE) return
        if(xhr.status !== 200) cb(xhr)
        else {
            if(xhr.response){
                try {
                    let m = JSON.parse(xhr.response)
                    cb(null, m.msg, m.addl)
                } catch(e) {
                    cb(e)
                }
            } else {
                cb()
            }
        }
    }
    xhr.open('GET', url_)
    xhr.send()
}

function isEmpty(e) {
    return (!e  && e !== 0) || (e.trim && e.trim() == "") || e["length"] === 0
}
function toMsgHml(msg) {
    return String(msg).replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/((?:^|\s))(\/[A-Z_a-z0-9]*)/g, '$1<a href="#" onclick=usrCmd("$2")>$2</a>')
                .replace(/[\r\n]/g, '<p class=br>&nbsp;</p>')
}

exports.getChatWidget = function(i18n) {

    let chatWidget = h('div.side.-right',
        [h('div',{style:{
                    height:'100%'
                },
                id:'loader',
                classList:"animate-bottom"
            },[h('div', {
                style: {
                    color: 'grey'
                }
                }, 'Connecting to avatar...'),
                h('img',{
                src:"..//..//..//../assets/loading-gif-transparent-25.gif",
                style:{
                    'margin-top':'70%',
                    'width':'100%'
                }
            })]),
            h('div',{id:'chatwidget',
                style:{
                    height:"98%",
                    display:"None"
                }
            },[
            h('div',{
                style:{
                    height:'95%'
                }
            },[
                h('h2',{
                    style:{
                        'text-align': 'center',
                        color: '#ff00a1'
                    }

                },i18n('Everlife Avatar Chat')),
                h('hr'),
                h('div',{id:'chat-output',classList:['chat-output']})]),
            h('div',{
                style:{
                    height:'5%'
                }
            },
                h('input',{
                    placeholder: 'Say something..',
                    id: 'userinput',
                    style:{
                        width: '100%',
                        padding: '12px 20px',
                        margin: '8px 0',
                        display: 'inline-block',
                        border: '1px solid #ccc',
                        'font-size': '120%',
                        'padding-right': '20%'
                    },
                    'ev-keydown':keyPress,
                })

            )]
            )
        ]
    );

    function keyPress(e){
        if(e.key == 'Enter'){
            let msg = document.getElementById('userinput').value
            userSays(cfg, msg)
            document.getElementById('userinput').value =''
        }
    }

function enable_when_ready() {
    check_connection_1((err) => {
        if(err) {
            setTimeout(() => {
                enable_when_ready()
            }, 3000)
        } else {
            setTimeout(()=>{
                showPage()
                setMsgs()
                gotMsg(cfg)
            },3000)
        }
    })
}

function check_connection_1(cb) {
    let xhr = new XMLHttpRequest()
    xhr.onreadystatechange = function() {
        if(xhr.readyState !== XMLHttpRequest.DONE) return
        if(xhr.status !== 200) cb(xhr)
        else cb(null)
    }
    xhr.open('GET', `http://localhost:${cfg.PORT}/ping`)
    xhr.send()
}

function showPage() {
  document.getElementById("loader").style.display = "none";
  document.getElementById("chatwidget").style.display = "block";
}
    setTimeout(()=>{
        enable_when_ready()

    },2000)
    return chatWidget

}
