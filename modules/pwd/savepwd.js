var nest = require('depnest')
var extend = require('xtend')
const cote = require('cote') ({statusLogsEnabled:false})
var { Value, h, computed, when } = require('mutant')

exports.gives = nest('pwd.savepwd')

exports.needs = nest({
  'sheet.display': 'first',
  'intl.sync.i18n': 'first'
})

const ssbClient = new cote.Requester({
  name: 'Save Password Dialog -> SSB Client',
  key: 'everlife-ssb-svc',
})

const levelClient = new cote.Requester({
  name: 'SavePasswd -> level DB Client',
  key: 'everlife-db-svc',
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('pwd.savepwd', function (opts) {
    loadAuthCredentials(opts, (err, creds) => {
      var username = Value('')
      var pwd = Value('')
      var saving = Value(false)
      var disablepwbtn = computed([saving,username,pwd], () => {
        return saving() || !(username() && pwd())
      })
      if(err) console.error(err)
      else username.set(creds.username)

      api.sheet.display(close => {
        return {
          content: h('div', {
            style: {
              padding: '20px',
            }
          }, [
            h('h2',{style:{'margin-left':'20px'}}, i18n(opts.metaData.msg)),
            h('div.main', [
              h('input', {
                type: 'text',
                style:{
                  "background-color":"#fff",
                  'font-size': '100%',
                  'width':'70%',
                  'color':'#333',
                  'margin-top':'20px',
                  'margin-left':'20px',
                  'height':'30px'
                },
                placeholder: 'Username',
                hooks: [ ValueHook(username), FocusHook() ],
              }),h('br'),
              h('input', {
                style:{
                  "background-color":"#fff",
                  'font-size': '100%',
                  'width':'70%',
                  'color':'#333',
                  'margin-top':'20px',
                  'margin-left':'20px',
                  'height':'30px'
                },
                type: 'password',
                placeholder: 'Password',
                hooks: [ ValueHook(pwd) ],
              }),
            ])
          ]),
          footer: [
            h('button -save', {
              'ev-click': save
            }, i18n('Save')),
            h('button -cancel', {
              'ev-click': cancel
            }, i18n('Cancel'))
          ],
        }

        function cancel(){
          close()
        }

        function save() {
          if(saving()) return
          saving.set(true)
          opts.auth = {username:username(),password:pwd()}
          saveAuthCrediential(opts)
          close()
        }

        function showErr(msg, detail) {
          var electron = require('electron')
          electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), {
            type: 'error',
            title: 'Cannot save Password',
            buttons: [i18n('Ok')],
            message: msg,
            detail: detail,
          })
        }

      })

    })
  })
}

function FocusHook () {
  return function (element) {
    setTimeout(() => {
      element.focus()
      element.select()
    }, 5)
  }
}

function ValueHook (obs) {
  return function (element) {
    element.value = obs()
    element.oninput = function () {
      obs.set(element.value)
    }
  }
}

function saveAuthCrediential(opts){
  getEncryptText(JSON.stringify(opts.auth), (err, encryptedText) => {
    levelClient.send({ type: 'put', key: opts.name, val: encryptedText }, (err) => {
      if(err) console.log(err)
    })
  })
}

function getEncryptText(text, cb){
  ssbClient.send({ type: 'encrypt-text', text: text }, (err, encryptedText) => {
    if(err) u.showErr(err)
    else cb(null, encryptedText)
  })
}

function loadAuthCredentials(opts, cb) {
  levelClient.send({type:'get',  key: opts.name},(err, data) => {
    if(err) cb(err)
    else {
      ssbClient.send({type: 'decrypt-text', text: data },(err, data) => {
        if(err) cb(err)
        else {
          try {
            cb(null, JSON.parse(data))
          } catch (e) {
            cb(e)
          }
        }
      })
    }
  })
}
