var { h , Value, Array: MutantArray, map } = require('mutant')
var nest = require('depnest')
var packageInfo = require('../../../../package.json')

var themeNames = Object.keys(require('../../../../styles'))

const cote = require('cote')({statusLogsEnabled:false})

let stellarClient = new cote.Requester({
    name: `Job Page -> Stellar`,
    key: 'everlife-stellar-svc',
})

let jobsClient = new cote.Requester({
    name: `Job Page -> Worker`,
    key: 'everlife-work',
})

exports.needs = nest({
  'intl.sync.i18n': 'first',
})

exports.gives = nest('page.html.render')

var jobs = MutantArray([])
var spinner = Value('(...fetching...)')
var txns = MutantArray([])
var txns_arr = []
var acc

var state = {
    jobsloaded: false,
    txnsloaded: false,
}
function getLatestJobs() {
    jobsClient.send({ type: 'joblist' }, (err, data) => {
        if(err) console.error(err)
        else {
            if(!state.jobsloaded) {
                state.jobsloaded = true
                if(state.jobsloaded && state.txnsloaded) spinner.set('')
            }
            jobs.set(data.groups)
        }
        setTimeout(getLatestJobs, state.jobsloaded ? 60 * 60 * 1000 : 5000)
    })
}

function getLatestTxns() {
    stellarClient.send({ type: 'txns', from: txns_arr.length }, (err, resp, acc_) => {
        if(err) {
          console.error(err)
          txns_arr = []
          txns.set(txns_arr)
        } else {
          acc = acc_
          if(resp && resp.length) {
            txns_arr = txns_arr.concat(resp)
            txns.set(txns_arr)
          } else {
            if(!state.txnsloaded) {
              state.txnsloaded = true
              if(state.jobsloaded && state.txnsloaded) spinner.set('')
            }
          }
        }
      setTimeout(getLatestTxns, state.txnsloaded ? 20 * 60 * 1000 : 5000)
    })
}

getLatestJobs()
getLatestTxns()

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/jobs') return
    const i18n = api.intl.sync.i18n

    var head1 = [ h('PageHeading', [ h('h1', [ h('strong', i18n('Jobs')) ])])]
    var head2 = [ h('PageHeading', [ h('h1', [ h('strong', i18n('Payment History'))])])]

    return h('Scroller', { style: { overflow: 'auto' } }, [
      h('div.wrapper', [
        h('div', [ spinner ]),
        h('section.prepend', head1),
        h('section.Jobs', map(jobs, to_card_1)),
        h('section.prepend', head2),
        h('section.Txns', [ h('div.list', map(txns, to_list_1)) ]),
      ])
    ])


    function to_list_1(txn) {
      txn = simplifyTxn(txn)
      let optype = ''
      let first_op = txn.operations[0]
      if(first_op && first_op.type && first_op.type == 'payment') {
        if(txn.sourceAccount) optype = '.gotpaid'
        else optype = '.payingout'
      }

      let inf = [
        h('.on', txn.on),
        h('.txnid', txn.id),
      ]

      if(txn.sourceAccount) {
        inf.push(h(`.sourceacc${optype}`, [
          h('span', { style: {
            'font-weight': 'bold',
            'margin-top': '4px'
          }}, 'Source Account:'),
          h('span.txnid', txn.sourceAccount),
        ]))
      }
      inf.push(h(`.op${optype}`, JSON.stringify(txn.operations, null, 2)))

      return h('.item', inf)
    }

    function to_card_1(job) {
      let inst = job.enrolled ? "Already Enrolled" : `Enroll ${job.id}`
      return h('.card', [
        h('h2', job.name),
        h('.inst', inst),
      ])
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

