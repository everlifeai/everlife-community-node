let { h, send, Value, when, computed, map, onceTrue } = require('mutant')

let cfg = loadConfig()

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
/*      outcome/
 * Send the message to the server and show it in our chat list
 */
function userSays(cfg, msg, addl) {
    if(isEmpty(msg) && isEmpty(addl)) return
    gotMsg(cfg)
    sendUsrMsg(cfg, msg, (err) => {
        if(err) {
            console.error(err)
            showMsg(`Error! Failed to send message to avatar!`, 'err')
        }
    }, addl)
    showMsg(msg, 'usr', addl)
}

/*      outcome/
 * Show the messages in our chat list and perform any additional
 * requests by the bot.
 */
function botSays(cfg, msg, addl) {
    if(isEmpty(msg) && isEmpty(addl)) return
    gotMsg(cfg)
    showMsg(msg, 'bot', addl)
    if(!isEmpty(addl)) doAddl(addl)
}

function showMsg(msg, from, addl) {
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

    rowdiv.appendChild(msgdiv)
    msgs.appendChild(rowdiv)

    msgs.scrollTop = msgs.scrollHeight;
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

exports.getChatWidget = function(){
    let chatWidget = h('div.side.-right',
        [
            h('div',{
                style:{
                    height:'95%'
                }
            },h('div',{id:'chat-output',classList:['chat-output']})),
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
                    'ev-keydown':keyPress

                })
                
            )
        ]
    );
    function keyPress(e){
        if(e.key == 'Enter'){
            let msg = document.getElementById('userinput').value
            //addUserMsg(msg)
            userSays(cfg, msg)
            document.getElementById('userinput').value =''
        }
    }

    return chatWidget
}
