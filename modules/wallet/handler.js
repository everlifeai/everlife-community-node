var { Value, Array: MutantArray } = require('mutant')

const cote = require('cote')({statusLogsEnabled:false})

/*      problem/
 * We want to manage the wallet across multiple pages.
 *
 *      way/
 * We fetch various account details periodically and provide observables
 * for them. We also allow the wallet to be setup and reloaded.
 *
 * We need to return the account, it's balance, and it's transactions to
 * multiple pages and update them.
 */
exports.gives = {
    wallet: {
        handler: {
            fetch: {
                obsAccId: true,
                obsAccBal: true,
                obsAccTxns: true,
            },
            setup: {
                onNoPw: true,
                onNewPayments: true,
                reload: true,
            }
        }
    }
}

exports.create = function(api) {
    const STARTVAL = {
        accid: '',
        accbal: '(Wallet Not Loaded)',
        acctxns: [],
    }

    let RUNNING = {
        ongoing: 0,
        haderr: false,
        hadNoPwd: false,
        timer: null,
        ondone: null,

        trustline: {
            needed: false,
            ongoing: false,
            failed: false,
        }
    }
    let HANDLER = {
        onNoPw: null,
        onNewPayments: null,
    }

    let accid = {
        val: Value(STARTVAL.accid),
        valid: Value(false),
    }
    let accbal = {
        val: Value(STARTVAL.accbal),
        valid: Value(false),
    }
    let acctxns = {
        val: MutantArray(STARTVAL.acctxns),
        valid: Value(false),
    }

    let stellarClient = new cote.Requester({
        name: `Wallet Fetch -> Stellar`,
        key: 'everlife-stellar-svc',
    })

    loader()

    /*      outcome/
     * Cancel any existing timers, reset the account values to the
     * starting values and and restart the loader. If in the middle of a
     * run ask it to call us back when the run is done.
     */
    function reload() {
        if(RUNNING.ongoing) {
            RUNNING.ondone = reload
        } else {
            if(RUNNING.timer) clearTimeout(RUNNING.timer)
            accid.val.set(STARTVAL.accid)
            accid.valid.set(false)
            accbal.val.set(STARTVAL.accbal)
            accbal.valid.set(false)
            acctxns.val.set(STARTVAL.acctxns)
            acctxns.valid.set(false)
            loader()
        }
    }

    /*      outcome/
     * Load the account parameters, handling each case if needed.  Once
     * all are loaded - refresh periodically.
     */
    function loader() {
        RUNNING.timer = null
        RUNNING.haderr = false
        RUNNING.hadNoPwd = false
        RUNNING.trustline.needed = false

        load_1('account-id', handle_accid_1)
        load_1('balance', handle_accbal_1)
        load_1('txns', handle_acctxns_1)


        /*      outcome/
         * Get the required values, checking the error return for a
         * 'No Password Found' callback. Also keep track of the number
         * of running loads so we can call the completion handler once
         * all the runs are finished.
         */
        function load_1(type_, handler_) {
            RUNNING.ongoing++
            stellarClient.send({ type: type_ }, (err, val) => {
                RUNNING.ongoing--

                if(err) {
                    RUNNING.haderr = true

                    if(err.error) console.error(err.error)
                    else console.error(err)

                    if(err.nopw) RUNNING.hadNoPwd = true

                } else {

                    handler_(val)

                }

                if(!RUNNING.ongoing) runs_completed_1()
            })
        }

        /*      outcome/
         * The run has completed so we do the things that need to be
         * done next - handling errors, events, and refreshing.
         */
        function runs_completed_1() {
            if(RUNNING.hadNoPwd && HANDLER.onNoPw) return HANDLER.onNoPw()
            let refreshTime = 20 * 60 * 1000
            if(RUNNING.haderr) refreshTime = 5 * 1000
            RUNNING.timer = setTimeout(loader, refreshTime)
            if(RUNNING.ondone) {
                let ondone = RUNNING.ondone
                RUNNING.ondone = null
                ondone()
            }
            if(RUNNING.trustline.needed) {
                setup_account_trustline_1()
            }
        }

        function handle_accid_1(id) {
            if(id != accid.val()) accid.val.set(id)
            if(!accid.valid()) accid.valid.set(true)
        }

        /*      outcome/
         * Set the balance to see if we have one, otherwise set the
         * balance text to reflect the error and - if we need a
         * trustline - try to set that up.
         */
        function handle_accbal_1(bal) {
            if(bal.ever || bal.ever === 0) {

                if(bal.ever != accbal.val()) accbal.val.set(bal.ever)
                if(!accbal.valid()) accbal.valid.set(true)

            } else if(bal.xlm === null || bal.xlm === undefined) {

                accbal.val.set('(Account Not Setup)')

            } else {

                RUNNING.trustline.needed = true

                if(RUNNING.trustline.ongoing) {
                    accbal.val.set('(Setting Trustline...)')
                } else {
                    accbal.val.set('(Account Needs Trustline)')
                }
            }
        }

        function handle_acctxns_1(txns) {
            handle_any_new_payments_1(acctxns, txns)
            if(txns.length != acctxns.val().length) acctxns.val.set(txns.reverse())
            if(!acctxns.valid()) acctxns.valid.set(true)
        }

        function handle_any_new_payments_1(acctxns, txns) {
            if(!HANDLER.onNewPayments) return
            if(!acctxns.valid()) return
            if(txns.length <= acctxns.val().length) return
            let r = []
            for(let i = acctxns.val().length;i < txns.length;i++) {
                let txn = txns[i].envelope_xdr.tx
                let memo = txns[i].memo
                for(let i = 0;i < txn.operations.length;i++) {
                    let op = txn.operations[i].body
                    if(op && op.type == 'payment') r.push({
                        memo: memo,
                        payment: op.paymentOp
                    })
                }
            }
            HANDLER.onNewPayments(r)
        }

        /*      outcome/
         * Try to set the account trustline, reloading info if
         * successful.
         */
        function setup_account_trustline_1() {
            RUNNING.trustline.failed = false
            RUNNING.trustline.ongoing = true
            stellarClient.send({ type: 'setup-ever-trustline' }, (err) => {
                RUNNING.trustline.ongoing = false

                if(err) {
                    console.error(err)
                    RUNNING.trustline.failed = true
                } else {
                    reload()
                }

            })
        }

    }


    return {
        wallet: {
            handler: {
                fetch: {
                    obsAccId: () => accid,
                    obsAccBal: () => accbal,
                    obsAccTxns: () => acctxns,
                },
                setup: {
                    onNoPw: (handler) => HANDLER.onNoPw = handler,
                    onNewPayments: (handler) => HANDLER.onNewPayments = handler,
                    reload: reload,
                }
            }
        }
    }
}
