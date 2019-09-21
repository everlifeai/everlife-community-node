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
                reload: true,
            }
        }
    }
}

exports.create = function(api) {
    const STARTVAL = {
        accid: '',
        accbal: -1,
        acctxns: [],
    }

    let RUNNING = {
        ongoing: 0,
        haderr: false,
        timer: null,
        ondone: null,
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
        if(RUNNING.timer) {
            clearTimeout(RUNNING.timer)
            accid.val.set(STARTVAL.accid)
            accid.valid.set(false)
            accbal.val.set(STARTVAL.accbal)
            accbal.valid.set(false)
            acctxns.val.set(STARTVAL.acctxns)
            acctxns.valid.set(false)
            loader()
        } else {
            RUNNING.ondone = reload
        }
    }

    /*      outcome/
     * Load the account parameters and - once all are loaded - refresh
     * periodically.
     */
    function loader() {
        RUNNING.timer = null
        RUNNING.haderr = false

        RUNNING.ongoing++
        get_account_id_1((err, id) => {
            RUNNING.ongoing--

            if(err) {
                console.log(err)
                RUNNING.haderr = true
            } else {
                if(id != accid.val()) accid.val.set(id)
                if(!accid.valid()) accid.valid.set(true)
            }

            refresh_1()
        })

        RUNNING.ongoing++
        get_account_bal_1((err, bal) => {
            RUNNING.ongoing--

            if(err) {
                console.log(err)
                RUNNING.haderr = true
            } else {
                if(bal.ever != accbal.val()) accbal.val.set(bal.ever)
                if(!accbal.valid()) accbal.valid.set(true)
            }

            refresh_1()
        })

        RUNNING.ongoing++
        get_account_txns_1((err, txns) => {
            RUNNING.ongoing--

            if(err) {
                console.log(err)
                RUNNING.haderr = true
            } else {
                if(txns.length != acctxns.val().length) acctxns.val.set(txns.reverse())
                if(!acctxns.valid()) acctxns.valid.set(true)
            }

            refresh_1()
        })

        /*      outcome/
         * If all running processes are done, we set a timeout to
         * refresh the data. If there was an error we try to refresh
         * quicker otherwise we can afford to wait. If there is an
         * 'ondone' function, we call that too - this is to trigger the
         * 'reload' functionality if the wallet changes.
         */
        function refresh_1() {
            if(RUNNING.ongoing) return
            let refreshTime = 20 * 60 * 1000
            if(RUNNING.haderr) refreshTime = 5 * 1000
            RUNNING.timer = setTimeout(loader, refreshTime)
            if(RUNNING.ondone) {
                let ondone = RUNNING.ondone
                RUNNING.ondone = null
                ondone()
            }
        }

        function get_account_id_1(cb) { stellarClient.send({ type: 'account-id' }, cb) }
        function get_account_bal_1(cb) { stellarClient.send({ type: 'balance' }, cb) }
        function get_account_txns_1(cb) { stellarClient.send({ type: 'txns' }, cb) }
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
                    onNoPw: () => accid, // TODO
                    reload: reload,
                }
            }
        }
    }
}
