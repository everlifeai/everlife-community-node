var { h, Array: MutantArray, map, Value, when } = require('mutant')
var nest = require('depnest')
const cote = require('cote')({statusLogsEnabled:false})
var u = require('@elife/utils');
var path = require('path')

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'kb.kbeditor': 'first',
})

const aimlBrainClient = new cote.Requester({
  name: `KBEditor -> AIML Brain`,
  key: `ebrain-aiml`,
})

let isKBDataLoaded = Value(false)

/*
 * Load the KB data path
 */
let cfg = {}
if(process.env.EBRAIN_AIML_KB_DIR) {
  cfg.KBDIR = process.env.EBRAIN_AIML_KB_DIR
} else {
  cfg.KBDIR = path.join(u.dataLoc(), 'kb')
}


exports.gives = nest('page.html.render')

var KBInfo = MutantArray([])

var fs = require('fs')
/**
 *    /outcome
 * Load all the KB information from kb data path .
 *
 */

function loadKB(loc) {

  let kbList = []
  aimlBrainClient.send({type:'kb-loaded-event'}, (err) => {
    exportKB((err) => {
      if(err) u.showErr(err)
      else reloadKB((err) => {
        if(err) u.showErr(err)
        else {
          fs.readdir(loc, { withFileTypes: true }, (err, files) => {
            if(err){
              u.showErr(err)
            }
            else{
              loadKBInfo(loc, files, 0, kbList, () => {
                KBInfo.set(kbList)
                isKBDataLoaded.set(true)
              })
            }
          })
        }
      })
    })
  })


  function loadKBInfo(loc, files, ndx, kbList, cb) {

    if(ndx >= files.length) cb()
    else {
      let f = files[ndx]
      if(f.isDirectory()) loadKBInfo(loc, files, ndx+1, kbList, cb)
      else {
        if( f.name.endsWith('.json')){
          fs.readFile(path.join(loc, f.name),"utf8", (err, data) => {
            if(err) {
              console.error(err)
              loadKBInfo(loc, files, ndx + 1, kbList, cb)
            } else{
              try {
                let kb = JSON.parse(data)

                kb['loc'] = cfg.KBDIR
                kbList.push(kb)
              } catch(e) {
                console.error(e)
              }
              loadKBInfo(loc, files, ndx + 1, kbList, cb)
            }
          })
        }else loadKBInfo(loc, files, ndx + 1, kbList, cb)
      }
    }
  }
}

loadKB(cfg.KBDIR)

exports.create = function (api) {

  const i18n = api.intl.sync.i18n

  return nest('page.html.render', function channel (path) {
    if (path !== '/kb') return
    const i18n = api.intl.sync.i18n

    var prepend = [
      h('PageHeading', [
        h('h1',[
          h('strong', i18n('Knowledge Base'))
        ])
      ])
    ]

    return h('Scroller', { style: { overflow: 'auto' } }, [
      h('div.wrapper', [
        h('section.prepend', prepend),
        h('section.KBs',
          when(isKBDataLoaded
            ,map(KBInfo, to_card_1),
            h('div',{
              style:{
                'text-align':'center'
              }
            },
            h('img',{
              src:"..//..//..//..//assets/img/loading-gif-transparent-25.gif",
              style:{
                  'margin':'25%',
                  'width':'25%'
              }
            }))
          ))
      ])
    ])

    function to_card_1(kb) {
      return h('.card', {
        'style':{
          'cursor':'pointer'
        },
        'ev-click': () =>{
          showEditor(kb)
        }

      },[
        h('h2', kb.name),
        h(".desc", '"' + kb.startPhrase + '"'),
      ])
    }

  })

  /**
   *    /outcome
   *  Load the specific KB data and show the KB Editor pop window
   */

  function showEditor(kb){
    exportKB((err) => {
      if(err) {
        u.showErr(err)
        showErr()
      } else  {
        fs.readFile(path.join(kb.loc,kb.name+'.txt'),(err,data)=>{
          if(err) {
            u.showErr(err)
            showErr()
          }
          else {
            kb.data = data.toString()
            api.kb.kbeditor(kb, () => {} )
          }
        })
      }
    })
  }

  function showErr() {
    var electron = require('electron')
    electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), {
      type: 'error',
      title: 'Error',
      buttons: [i18n('Ok')],
      message: 'Something went wrong. please try after sometimes.',

    })
  }
}
function exportKB(cb){
  aimlBrainClient.send({ type: 'xport-kb' }, cb)
}
function reloadKB(cb){
  aimlBrainClient.send({ type: 'reload-kb' },cb)
}
