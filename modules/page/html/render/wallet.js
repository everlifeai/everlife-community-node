var { h , Value, Array: MutantArray, map, when } = require('mutant')
var nest = require('depnest')
var packageInfo = require('../../../../package.json')

var themeNames = Object.keys(require('../../../../styles'))

const cote = require('cote')({statusLogsEnabled:false})

let balance = Value(0)
let stellarClient = new cote.Requester({
    name: `Job Page -> Stellar`,
    key: 'everlife-stellar-svc',
})

function getAccountBalance() {
  stellarClient.send({ type: 'balance' }, (err,bal)=>{
    if(err) console.log(err)
    else balance.set(bal.ever)
  })
}
getAccountBalance()

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'wallet.sheet.getSecret': 'first',
})

exports.gives = nest('page.html.render')

var spinner = Value('(...fetching...)')
var txns = MutantArray([])
var txns_arr = []
var acc

var state = {
    txnsloaded: false,
}

function getAccountId(cb) {
  stellarClient.send({ type: 'account-id' }, cb)
}

function getLatestTxns() {
  stellarClient.send({ type: 'txns' }, (err, resp, acc_) => {
    if(err) {
      console.error(err)
      txns_arr = []
      txns.set(txns_arr.reverse())
    } else {
      acc = acc_
      state.txnsloaded = true
      spinner.set('')
      if(resp) {
        txns_arr = resp
        txns.set(txns_arr.reverse())
      }
    }
    setTimeout(getLatestTxns, state.txnsloaded ? 20 * 60 * 1000 : 5000)
  })
}

getLatestTxns()

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/wallet') return
    const i18n = api.intl.sync.i18n


    return h('Scroller', {
        style: { overflow: 'auto' } }, [
      h('div.wrapper',{
        style:{
        }
      },h('div', [
        h('br'),
        h('div',{
          style:{
            'width':'100%'
          }
        },[
          h('section',{
            style:{
              'width': '50%',
              'display': 'inline-block',
              'height': '15%',
              'display': 'inline-table',
              'vertical-align': 'middle',
            }
          },[
            h('a', {
              'href': 'https://stellarport.io/exchange/alphanum4/EVER/GDRCJ5OJTTIL4VUQZ52PCZYAUINEH2CUSP5NC2R6D6WQ47JBLG6DF5TE/native/XLM/Stellar',
              style:{
                'background-color': '#959ea9',
                'text-size':'20px!important',
                'color': 'white',
                'padding': '14px 25px',
                'text-align': 'center',
                'text-decoration': 'none',
                'display': 'inline-block',
                'width':'80%'
              }

          }, h('span',{style:{'font-weight': 'bold','font-size':'18px'}},i18n('+ Buy EVER'))),h('br'),
          h('a', {
            style:{
              'background-color': '#959ea9',
              'text-size':'20px!important',
              'color': 'white',
              'padding': '14px 25px',
              'text-align': 'center',
              'text-decoration': 'none',
              'display': 'inline-block',
              'margin-top':'5px',
              'cursor':'pointer',
              'width':'80%'
            },
            'ev-click': importNewWallet,
          }, h('span',{style:{'font-weight': 'bold','font-size':'18px'}},i18n('Import Wallet'))),
          ]),
          h('section',{
            style:{
              'text-align':'center',
              'box-shadow': 'rgba(0, 0, 0, 0.2) 0px 4px 8px 0px',
              'transition': 'all 0.3s ease 0s',
              'width': '50%',
              'display': 'inline-block',
              'background-color': 'white',
              'text-align': 'center',
              'height': '15%',
              'display': 'inline-table',
              'vertical-align': 'middle',
              'padding':'10px',
            }
          },
          [
            h('span',{
              style:{
                'display':'inline-block',
                'text-align':'center',
                'font-weight': '600',
                'font-size': '41px',
                'color': '#707584',
                'font': '24px/24px "Open Sans", sans-serif',
                'vertical-align':'middle'
              }
            },i18n('Current Ever Balance')),
            h('br'),
            h('span',{
              style:{
                'display':'inline-block',
                'text-align':'center',
                'font-weight': '800',
                'font-size': '41px',
                'color': '#444750'
              }
            },balance)
          ]),
        ]),
        h('br'),

        h('section', [
          h('table',{
            style:{
              'font-family': 'arial, sans-serif',
              'width': '100%',
              'border-collapse': 'collapse',
              'background-color':'white',
              'box-shadow': 'rgba(0, 0, 0, 0.2) 0px 4px 8px 0px',
              'transition': 'all 0.3s ease 0s',
              'margin-top':'2%'
            }

          },[
            h('tr',
              [
                h('th',{
                  style:{
                    'border': '1px solid #dddddd',
                    'text-align': 'left',
                    'padding': '8px'
                  }
                },i18n('Date')),
                h('th',{
                  style:{
                    'border': '1px solid #dddddd',
                    'text-align': 'left',
                    'padding': '8px'
                  }
                },i18n('Details'))
              ]),
            map(txns,to_list_1)
          ])
        ]),
      ]))
    ])

    function importNewWallet() {
      api.wallet.sheet.getSecret(() => {
        getAccountBalance()
        getLatestTxns()
      })
    }
    function to_list_1(txn) {
      txn = simplifyTxn(txn)
      let details = getTransctionDetails(txn)
      return [
        h('tr',[
          h('td',{
            style:{
              'text-align':'left',
              'border': '1px solid #dddddd',
              'padding': '8px'
            }
          },new Date(txn.on).toLocaleString()),
          h('td',{
            style:{
              'text-align':'left',
              'border': '1px solid #dddddd',
              'padding': '8px'
            }
          }, details),
        ])

      ]
    }
  })
}

/*      outcome/
 * Simplify the Transaction data so that it's easier to read and process
 * by people - getting rid of most of the data and making the types
 * easier to read
 */
function simplifyTxn(txn) {
    let r = {}
    r.id = txn.id
    r.on = txn.created_at

    let data = txn.envelope_xdr.tx

    if(data.sourceAccount) {
      let sa = squash(data.sourceAccount)
      if(sa != acc) r.sourceAccount = sa
    }

    if(data.memo != 'memoNone') r.memo = data.memo

    r.operations = []
    for(let i = 0;i < data.operations.length;i++) {
        let operation = data.operations[i]
        let op = xtract_body_1(operation.body)
        r.operations.push(op)
    }

    return r

    /*      outcome/
     * Return a simplified version of the operation body:
     *  type: "payment"
     *  paymentOp: {...}
     */
    function xtract_body_1(body) {
        let r = {
            type: body.type
        }

        let opdata = body[`${r.type}Op`]

        for(let k in opdata) r[k] = squash(opdata[k])

        return r
    }

    /*      outcome/
     * Handle some recognized types, otherwise ignore type and recurse
     * and try again (gives reasonably readable results)
     */
    function squash(v) {
        if(typeof v == "string") return v
        if(v.type == "amount") return v.value
        if(v.type == "publicKeyTypeEd25519") return v.ed25519.value
        if(v.type == "assetTypeCreditAlphanum4" && v.alphaNum4) return squash(v.alphaNum4)
        let r = {}
        for(let k in v) {
            if(k == "type") continue
            r[k] = squash(v[k])
        }
        return r
    }
}

function getTransctionDetails(txn){
  let operations = txn.operations
  let details = ''
  let isCredited = false
  for(let i=0; i < operations.length; i++){
    let data = operations[i];
    if(data.type === 'payment'){
      if(data.destination === acc){
        isCredited = true
        details = `Credited with ${data.amount} ${data.asset.assetCode ? data.asset.assetCode : 'XLM'}`
                  +` Received from ${txn.sourceAccount} ${data.memo?'('+data.memo+')':''}`
      } else
        details = `Debited with ${data.amount} ${data.asset.assetCode ? data.asset.assetCode : 'XLM'}`
                  +` Sent to ${data.destination} ${data.memo?'('+data.memo+')':''}`
    } else if(data.type === 'changeTrust'){
      details = `New trustline limit of ${data.limit} for asset ${data.line.assetCode} issued by ${data.line.issuer} `
    } else if(data.type === 'createAccount'){
      details = `Wallet created with initial balance of ${data.startingBalance} XLM`
    } else {
      details = JSON.stringify(operations)
    }


  }
  return when(isCredited,
    h('span',{
      style:{
        'color':'green'
      }
    },details),
    h('span',details) )
}
