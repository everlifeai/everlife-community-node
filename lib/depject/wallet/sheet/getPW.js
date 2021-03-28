var nest = require('depnest')
var extend = require('xtend')
var { Value, h, computed, when } = require('mutant')
const cote = require('cote')({statusLogsEnabled:false})

exports.gives = nest('wallet.sheet.getPW')

exports.needs = nest({
  'sheet.display': 'first',
  'intl.sync.i18n': 'first'
})

let stellarClient = new cote.Requester({
  name: `Get Password Dialog -> Stellar`,
  key: 'everlife-stellar-svc',
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('wallet.sheet.getPW', function (ondone) {
    var pw1 = Value('')
    var pw2 = Value('')
    var saving = Value(false)
    var disablepwbtn = computed([saving,pw1,pw2], () => {
      return saving() || !(pw1() && pw2() == pw1())
    })

    api.sheet.display(close => {
      return {
        content: h('div', {
            classList: 'WalletPw',
            style: {
                padding: '20px',
            }
        }, [
            h('h2', i18n('Enter Your Wallet Password')),
            h('div.main', [
                h('div.info', [
                  h('p', 'Please pick a good strong password you can remember.'),
                  h('p', 'This password will be used to encrypt your stellar wallet.'),
                  h('p', 'It will be stored in your data directory (PLEASE BACK UP YOUR DATA DIRECTORY)'),
                ]),
                h('input.pw', {
                  id: 'pw1',
                  type: 'password',
                  placeholder: 'Password',
                  hooks: [ ValueHook(pw1), FocusHook() ],
                }),
              h('input.pw', {
                id: 'pw2',
                type: 'password',
                placeholder: 'Password',
                hooks: [ ValueHook(pw2) ],
              }),
            ])
        ]),
        footer: [
          h('button -save', {
            'ev-click': save,
            disabled: disablepwbtn,
          }, i18n('Save')),
          h('button -cancel', {
            'ev-click': close
          }, i18n('Cancel'))
        ],
      }


      function save() {
        if(saving()) return
        saving.set(true)

        if(!pw1() && !pw2()) return showErr(i18n('Need Password'), i18n('Please enter the wallet password'))
        if(pw1() != pw2()) return showErr(i18n('Passwords do not match'), i18n('Password and confirm password do not match'))

        stellarClient.send({ type: 'set-new-pw', pw: pw1() }, (err) => {
          saving.set(false)

          if(err) showErr(i18n('Failed saving Wallet Password!', err))
          else {
            if(ondone) ondone()
            close()
          }
        })
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

