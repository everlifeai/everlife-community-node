var h = require('mutant/h')
var nest = require('depnest')
var when = require('mutant/when')
const cote = require('cote')({statusLogsEnabled:false})


exports.needs = nest({
  'sheet.display': 'first',
  'message.html.render': 'first',
  'intl.sync.i18n': 'first',
  'intl.sync.i18n_n': 'first',
  'emoji.sync.url': 'first'
})


let stellarClient = new cote.Requester({
  name: `Preview Message -> Stellar`,
  key: 'everlife-stellar-svc',
})

let balance
let minimumBalance = '50'
let costPerMsg = '0.1'

stellarClient.send({type: 'issuer-meta-data'}, (err, data) => {
  if(err) console.error(err)
  else {
    if(data && data.EXPLORER_COST_PER_MESSAGE) costPerMsg = Buffer.from(data.EXPLORER_COST_PER_MESSAGE,'base64').toString()
    if(data && data.EXPLORER_MIN_BALANCE) minimumBalance = Buffer.from(data.EXPLORER_MIN_BALANCE,'base64').toString() 
  }
})

exports.gives = nest('message.sheet.preview')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  const plural = api.intl.sync.i18n_n

  return nest('message.sheet.preview', function (msg, cb) {

    getBalance( function(err, bal){
      if(!err) balance = parseFloat(bal.ever)
      else balance = 0

      api.sheet.display(function (close) {
        var isPrivate = msg.value.private
        var isRoot = !msg.value.content.root
        var exists = !!msg.key
        var recps = (msg.value.content.recps || []).filter(id => id !== msg.value.author)

        // handle too many private recipients
        if (isPrivate && recps.length > 7) {
          return {
            content: [
              h('h2', [i18n('Too many recipients')]),
              h('div.info', [
                h('p', [
                  i18n('Private messages can only be addressed to up to 7 people. '),
                  plural('Your message has %s recipients', recps.length)
                ]),
                h('p', [i18n('Please go back and remove some of the recipients.')])
              ])
            ],
            classList: ['-private'],
            footer: [h('button -cancel', { 'ev-click': cancel }, i18n('Close'))]
          }
        }

        var messageElement = api.message.html.render(msg)

        // allow inspecting of raw message that is about to be sent
        messageElement.msg = msg

        return {
          content: [
            messageElement
          ],
          classList: [
            when(isPrivate, '-private', '-public')
          ],
          footer: [
            when(isPrivate,
              h('img', { src: api.emoji.sync.url('closed_lock_with_key') }),
              h('img', { src: api.emoji.sync.url('globe_with_meridians') })
            ),
            when(isPrivate,
              h('div.info -private', [
                recps.length ? when(!exists && isRoot,
                  plural('Only visible to you and %s people that have been mentioned', recps.length),
                  plural('Only visible to you and %s other thread participants', recps.length)
                ) :
                when(
                  balance > minimumBalance,
                  i18n('This message will only be visible to you'),
                  i18n("You don't have enough balance to publish a message.")

                )
              ]),
              h('div.info -public', [
                when(msg.publiclyEditable,
                  i18n('This message will be public and can be edited by anyone'),
                  when(
                    balance > minimumBalance,
                    i18n('This message will be public and cannot be edited or deleted'),
                    i18n("You don't have enough balance to publish a message")
                  )
                )
              ])
            ),
            when(
              balance > minimumBalance,
              h('button -save', { 'ev-click': publish }, i18n('Confirm')),
            ),
            when(
              balance > minimumBalance,
              h('button -cancel', { 'ev-click': cancel }, i18n('Cancel')),
              h('button -cancel', { 'ev-click': cancel }, i18n('Close'))
            )
          ]
        }

        function publish () {

          close()
          stellarClient.send({type:'pay-ever',amt:costPerMsg},(err) =>{
            if(err) cb(null, false)
            else cb(null, true)
          })
        }

        function cancel () {
          close()
          cb(null, false)
        }
      })
    })
    return true
  })
}


function getBalance(cb){
  stellarClient.send({ type: 'balance' }, cb)
}
