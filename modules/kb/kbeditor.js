var nest = require('depnest')
var extend = require('xtend')
const cote = require('cote') ({statusLogsEnabled:false})
var { Value, h, computed, when } = require('mutant')
const path = require('path')
const fs = require('fs')
const u = require('@elife/utils')
exports.gives = nest('kb.kbeditor')

exports.needs = nest({
  'sheet.display': 'first',
  'intl.sync.i18n': 'first'
})


const aimlBrainClient = new cote.Requester({
  name: `KBEditor -> AIML Brain`,
  key: `ebrain-aiml`,
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n

  return nest('kb.kbeditor', function (opts) {
    var kbdata = Value(opts.data)
    var saving = Value(false)
    var disablepwbtn = computed([saving,kbdata], () => {
      return saving() || !(kbdata())
    })

    api.sheet.display(close => {
      return {
        content: h('div', {
            style: {
                padding: '20px',
            }
        }, [

            h('div.main', [
                h('textarea', {
                  type: 'textarea',
                  rows:"10",
                  style:{
                    "background-color":"#fff",
                    'font-size': '100%',
                    'width':'90%',
                    'color':'#333',
                    'margin-top':'20px',
                    'margin-left':'20px',
                    "white-space": "pre-line",
                  },

                  hooks: [ ValueHook(kbdata), FocusHook() ],
                }),h('br')

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
        saveKB(kbdata(), opts)
        close()
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

function saveKB(kbdata, opts){

  let kbPath = path.join(opts.loc, opts.name + ".txt")
  fs.writeFile(kbPath, kbdata, function(err) {
    if(err) console.log(err)
    else reloadKB()
});
}

function reloadKB(){
  aimlBrainClient.send({ type: 'reload-kb' }, (err) => {
    if(err) u.showErr(err)
    exportKB(()=>{})
  })
}

function exportKB(cb){
  aimlBrainClient.send({ type: 'xport-kb' }, cb)
}
