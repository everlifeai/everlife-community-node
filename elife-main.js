'use strict'
const shell = require('shelljs')
const path = require('path')
const fs = require('fs')
const shortid = require('shortid')

const fixPath = require('fix-path')
const archiver = require('archiver')

const pm2 = require('@elife/pm2')
const pkgmgr = require('@elife/pkg-mgr')
const u = require('@elife/utils')
var psTree = require('ps-tree')
var os = require('os');

const dotenv = require('dotenv').config({ path : path.join(u.dataLoc(),'cfg.env')})

module.exports = {
    showInfo: showInfo,
    serverStart: serverStart,
    embeddedSetup: embeddedSetup,
    adjustSSBConfig: adjustSSBConfig,
    setupEnvironmentVariables: setupEnvironmentVariables,
    startAvatar: startAvatar,
    stopChildProcesses: stopChildProcesses,
    backup: backup,
}

function showInfo() {
    const { version } = require('./package.json')
    console.log(`Avatar node (version ${version})`)
    console.log(`Installed in:`)
    console.log(`    ${shell.pwd()}`)
    console.log(`Data stored in: (BACKUP THIS FOLDER)`)
    console.log(`    ${u.dataLoc()}`)
    console.log(`Microservice Partition Key (for developers)`)
    console.log(`    COTE_ENV=${process.env.COTE_ENV}`)
}

function serverStart(args) {
    serverSetup(args)
    startSSB(startAvatar)
}

function serverSetup(args) {
    setupEnvironmentVariables(args)
    setupNodeModules()
    setupHomeFolders()
    setupWallet()
    checkCoteConnection()
    setupUserConfig()
}

function embeddedSetup(args) {
    fixPath()
    setupEnvironmentVariables(args)
    setupHomeFolders()
    setupUserConfig()
    setupLogFolder()
    setupSkillsFolder()
    showInfo()
}

function setupLogFolder(){
    u.ensureExists(u.logsLoc(), (err) => {
        if(err) u.showErr(err)
    })
}
function setupSkillsFolder(){
    u.ensureExists(u.skillLoc(), (err) =>{
        if(err) u.showErr(err)
    })
}

/*      outcome/
 * Set up the environment variables so all the sub-components can access
 * them (the home location and the node number and setup COTEJS
 * partition environment variable
 */
function setupEnvironmentVariables(args) {
    if(!process.env['ELIFE_INSTALL_FOLDER']) {
        process.env['ELIFE_INSTALL_FOLDER'] = path.resolve(process.cwd())
    }
    if(!process.env['ELIFE_HOME']) {
        process.env['ELIFE_HOME'] = u.homeLoc()
    }
    if(!process.env["ELIFE_NODE_NUM"]) {
        let nn = "0"
        if(args && args['node-num']) nn = args['node-num']
        if(isNaN(parseInt(nn))) {
            process.stdout.write(`node-num ${nn} is not a valid integer\n`)
            process.exit(1)
        }
        process.env["ELIFE_NODE_NUM"] = nn
    }
    if(!process.env['COTE_ENV']) {
        process.env['COTE_ENV'] = partitionParam()
    }

    setup_port_vars_1()

    function setup_port_vars_1() {
        process.env["SSB_PORT"]         = u.adjustPort(8191)
        process.env["SSB_WS_PORT"]      = u.adjustPort(8192)
        process.env["QWERT_PORT"]       = u.adjustPort(8193)
        process.env["EBRAIN_AIML_PORT"] = u.adjustPort(8194)
        process.env["AIARTIST_PORT"]    = u.adjustPort(8195)
    }
}

/*      problem/
 * While most of the modules are shared across our services, certain
 * services and skills need their own, additional, packages. These need
 * to be downloaded and created for each OS and it's hard to remember
 * which ones they are and do it correctly.
 *
 *      way/
 * Every time we start we will look for the node_modules in the required
 * paths. If they are not present, we will create them.
 */
function setupNodeModules() {
    let requiredrepos = [
        "services/elife-ai/brains/ebrain-aiml",
        "services/elife-stellar",
        "services/elife-level-db",
        "services/elife-communication-mgr/channels/elife-telegram",
        "services/elife-skill-mgr/skills/eskill-vanity-address",
        "services/elife-skill-mgr/skills/eskill-worker",
    ]

    for(let i = 0;i < requiredrepos.length;i++) {
        let loc = requiredrepos[i]
        let r = shell.pushd('-q', loc)
        if(r.code) shell.echo(`Failed to change directory to: ${loc}`)
        else {
            if(!shell.test("-d", "node_modules")) {
                shell.echo(`****************************************\nInstalling ${loc}/node_modules`)
                r = shell.exec(`npm install --no-bin-links`)
                if(r.code) shell.echo(`Failed to npm install in: ${loc}`)
            }
            shell.popd('-q')
        }
    }
}

/*      understand/
 * Cote.js has a automated discovery service that allows it to find
 * matching microservices anywhere on the network that share the same
 * 'environment' parameter.
 *
 *      problem/
 * We do not want nodes that are near each other (on the same machine or
 * on the same network) to start responding to each other's microservice
 * requests.
 *
 *      way/
 * We returns reasonably-unique identifier that we can use to partition
 * cote.js microservice environments and prevent nodes from interfering
 * with each other.
 */
function partitionParam() {
    return shortid.generate()
}

/*      outcome/
 * Create the data and skill folders
 */
function setupHomeFolders() {
    let r = true
    try {
        fs.mkdirSync(u.dataLoc(), { recursive: true })
    } catch(e) {
        if(e.code != 'EEXIST') {
            console.log(e)
            r = false
        }
    }
    try {
        fs.mkdirSync(u.skillLoc(), { recursive: true })
        return r
    } catch(e) {
        if(e.code != 'EEXIST') {
            console.log(e)
            return false
        }
    }
}

/*      outcome/
 * If we don't have a luminate password saved, get the user to add one
 * now.
 */
function setupWallet() {
    let p = path.join(u.dataLoc(), ".luminate-pw")
    if(shell.test("-f", p)) return

    let stellardir = "services/elife-stellar"
    let walletmsg = get_wallet_msg_1()
    shell.echo(walletmsg)
    shell.exit(1)

    function get_wallet_msg_1() {
        if(!process.env.ELIFE_NODE_ORG) {
            return `
===========================================================
Setting up your avatar's wallet password
Please go to "${stellardir}" and run
    node pw
to set up your avatar's wallet password before you continue
===========================================================
`
        }
        if(process.platform == 'win32') {
            return `
===========================================================
Setting up your avatar's wallet password
Please go to "${stellardir}" and run
    set ELIFE_NODE_ORG=${process.env.ELIFE_NODE_ORG}
    node pw
to set up your avatar's wallet password before you continue
===========================================================
`
        } else {
            return `
===========================================================
Setting up your avatar's wallet password
Please go to "${stellardir}" and run
    ELIFE_NODE_ORG=${process.env.ELIFE_NODE_ORG} node pw
to set up your avatar's wallet password before you continue
===========================================================
`
        }
    }
}

/*      outcome/
 * Run the cote connection checker
 */
function checkCoteConnection() {
    let ccc = path.join(__dirname, 'ccc')
    shell.exec(`node ${ccc}`)
}

/*      outcome/
 * Show the CoteJS partition parameter
 */
function showCotePartition() {
}

/*      outcome/
 * If the user configuration file does not exist, create a template that
 * they can fill in.
 */
function setupUserConfig() {
    let cfg = path.join(u.dataLoc(), 'cfg.env')
    fs.access(cfg, (err) => {
        if(!err) return
        console.log(`\n\nCreating configuration file...`)
        fs.writeFile(cfg, `#       understand/
# We use environment variables to configure various skills and services.
# In order to pass the information to the required components we need to
# set them in this file.

# For Telegram Channel
TELEGRAM_TOKEN=

# For Facebook messenger Channel
FACEBOOK_PAGE_ACCESS_TOKEN=

# For what-wine skill
MASHAPE_KEY=

# for AI Artist Skill
AIARTIST_HOST=
AIARTIST_PORT=
`, (err) => {
    if(err) console.error(err)
})
        console.log(`Please edit this file: ${cfg}`)
        console.log(`To add your own TELEGRAM_TOKEN, etc...\n\n`)
    })
}

function mkdir(d) {
    let r = shell.mkdir('-p', d)
    if(r.code) {
        shell.echo(`Failed to create directory: ${d}`)
        return false
    }
    return true
}

function install(what) {
    if(!what.required && !what.optional) return false
    let repo = what.required ? what.required : what.optional

    let type_ = what.required ? 'required' : 'optional'
    shell.echo(`Checking ${type_}: ${repo}`)

    if(!createRepo(repo)) return false
    if(!setupRepo(repo, what.postInstall)) return false

    return true
}

/*      outcome/
 * Checks if the repo exists otherwise goes to the directory path and
 * downloads it
 */
function createRepo(rp) {
    if(shell.test("-d", rp)) return true
    shell.echo(`Creating: ${rp}`)

    let dir = path.dirname(rp)
    let repo = path.basename(rp)

    let r

    r = shell.pushd('-q', dir)
    if(r.code) {
        shell.echo(`Failed to change directory to: ${dir}`)
        shell.popd('-q')
        return false
    }

    r = shell.exec(`git clone git@github.com:everlifeai/${repo}.git`)
    if(r.code) {
        shell.echo(`Failed to download git repo: ${repo}`)
        shell.popd('-q')
        return false
    }

    r = shell.popd('-q')
    if(r.code) {
        shell.echo(`Failed to return to base directory from creating repo: ${repo}`)
        return false
    }

    return true
}

/*      outcome/
 * Set up the node_modules and run any post install scripts
 */
function setupRepo(rp, postInstall) {
    if(shell.test("-d", path.join(rp,'node_modules'))) return true
    if(!shell.test("-f", path.join(rp,'package.json'))) return true
    shell.echo(`Setting up: ${rp}`)

    let r

    r = shell.pushd('-q', rp)
    if(r.code) {
        shell.echo(`Failed to change directory to: ${rp}`)
        return false
    }

    shell.echo(`Running npm install...(please wait)`)
    r = shell.exec(`npm install --no-bin-links`)
    if(r.code) {
        shell.echo(`Failed to npm install in: ${rp}`)
        shell.popd('-q')
        return false
    }
    shell.echo(`...done`)

    if(postInstall) {
        shell.echo(`Running post-install: ${postInstall}`)
        r = shell.exec(postInstall)
        if(r.code) {
            shell.echo(`Failed to run post-install: ${postInstall}`)
            shell.popd('-q')
            return false
        }
    }

    r = shell.popd('-q')
    if(r.code) {
        shell.echo(`Failed to return to base directory after setting up: ${rp}`)
        return false
    }

    return true
}

/*      outcome/
 * Start the SSB server and keep it as similar to the SSB process in the
 * Avatar as possible so we don't have a problem with different
 * configurations producing different results.
 *  (Refer: index.js/setupContext(), server-process.js)
 */
function startSSB(cb) {
  const extend = require('xtend')
  const ssbKeys = require('ssb-keys')
  const Path = require('path')
  const spawn = require('child_process').spawn

  let appName = process.env.ssb_appname || 'ssb'
  let opts = {}

  adjustSSBConfig(opts)

  let ssbConfig = require('ssb-config/inject')(appName, extend({
    port: 8008,
    blobsPort: 8989, // matches ssb-ws
    friends: { // not using ssb-friends (sbot/contacts fixes hops at 2, so this setting won't do anything)
      dunbar: 150,
      hops: 2 // down from 3
    }
    // connections: { // to support DHT invites
    //   incoming: {
    //     dht: [{ scope: 'public', transform: 'shs', port: 8423 }]
    //   },
    //   outgoing: {
    //     dht: [{ transform: 'shs' }]
    //   }
    // }
  }, opts))

  // disable gossip auto-population from {type: 'pub'} messages as we handle this manually in sbot/index.js
  if (!ssbConfig.gossip) ssbConfig.gossip = {}
  ssbConfig.gossip.autoPopulate = false

  ssbConfig.keys = ssbKeys.loadOrCreateSync(Path.join(ssbConfig.path, 'secret'))

  const keys = ssbConfig.keys
  const pubkey = keys.id.slice(1).replace(`.${keys.curve}`, '')

  if (process.platform === 'win32') {
    // fix offline on windows by specifying 127.0.0.1 instead of localhost (default)
    ssbConfig.remote = `net:127.0.0.1:${ssbConfig.port}~shs:${pubkey}`
  } else {
    const socketPath = Path.join(ssbConfig.path, 'socket')
    ssbConfig.connections.incoming.unix = [{ 'scope': 'device', 'transform': 'noauth' }]
    ssbConfig.remote = `unix:${socketPath}:~noauth:${pubkey}`
  }

  const redactedConfig = JSON.parse(JSON.stringify(ssbConfig))
  redactedConfig.keys.private = null
  console.dir(redactedConfig, { depth: null })

  let msSbot = require('./elife-ms')

  let createSbot = require('secret-stack')()
  .use(require('ssb-db'))
  .use(require('ssb-master'))
  .use(require('ssb-gossip'))
  .use(require('ssb-replicate'))
  .use(require('ssb-no-auth'))
  .use(require('ssb-unix-socket'))
  .use(require('ssb-friends'))
  .use(require('ssb-blobs'))
  .use(require('ssb-backlinks'))
  .use(require('ssb-about'))
  .use(require('ssb-private'))
  // .use(require('ssb-dht-invite')) // this one must come before dhtTransport
  // .use(dhtTransport)
  .use(require('ssb-invite'))
  .use(require('ssb-local'))
  .use(require('ssb-logging'))
  .use(require('ssb-query'))
  .use(require('ssb-search'))
  .use(require('ssb-ws'))
  .use(require('ssb-tags'))
  .use(require('ssb-identities'))
  // .use(require('ssb-ebt')) // enable at your own risk!
  // .use(require('./sbot'))  // for patchwork instead of the 'friends' plugin

  var context = {
    sbot: createSbot(ssbConfig),
    config: ssbConfig
  }
  ssbConfig.manifest = context.sbot.getManifest()
  fs.writeFileSync(Path.join(ssbConfig.path, 'manifest.json'), JSON.stringify(ssbConfig.manifest))

  msSbot.start(context.sbot)

  // start dht invite support
  // context.sbot.dhtInvite.start()

  // check if we are using a custom ssb path (which would break git-ssb-web)
  if (!ssbConfig.customPath) {
    // attempt to run git-ssb if it is installed and in path
    var gitSsb = spawn('git-ssb', [ 'web' ], {
      stdio: 'inherit'
    })
    gitSsb.on('error', () => {
      console.log('git-ssb is not installed, or not available in path')
    })
    process.on('exit', () => {
      gitSsb.kill()
    })
  }

  cb && cb()
}

/*      outcome/
 * Load any configuration information and start the core processes
 */
function startAvatar() {
    let conf = loadConfig()
    startCoreProcesses(conf)
}

/*      outcome/
 * Load the configuration (from environment variables) or defaults
 */
function loadConfig() {
    let cfg = {};
    if(process.env.SVC_FOLDER) {
        cfg.SVC_FOLDER = process.env.SVC_FOLDER;
    } else {
        cfg.SVC_FOLDER = "./services";
    }
    return cfg;
}

/*      outcome/
 * The main responsibility of the avatar is to stay running and stable
 * (after all it has to *live forever*). For this to work, it delegates
 * all other work to different processes (a.l.a Erlang's supervisor
 * trees).
 *
 * These core processes include:
 * 1. The Scuttlebot Immortal Feed and Replication
 *    (embedded in the patchwork client and so started separately)
 * 2. A Database for storing working data
 * 3. A Skill Manager for installing, running, and managing skills
 *      - Infrastructure Skills (as hub/as host/...)
 *      - Worker skills (twitter svc, vanity address, ...)
 * 4. A Communication Manager for installing, running, and managing
 * communication channels
      - Telegram channel
      - Messenger channel
      - Alexa channel
      - Web channel
      - ...
 * 5. An AI for understanding and managing user interaction and
 * strategies for earning
 *    - Cakechat (python with microservices relay...)
 *    - ...
 * 6. The stellar blockchain interface for payments, receipts, and smart
 * contracts.
 *
 * The avatar downloads, installs, and starts the core processes.
 *
 * TODO: Monitoring and regulating component CPU/Memory/Disk usage
 */
function startCoreProcesses(cfg) {
    const core_procs = [
        { pkg: "everlifeai/elife-ai" },
        { pkg: "everlifeai/elife-level-db" },
        { pkg: "everlifeai/elife-skill-mgr" },
        { pkg: "everlifeai/elife-communication-mgr" },
        { pkg: "everlifeai/elife-stellar" },
    ];

    u.showMsg(`Installing core packages...`)
    load_pkgs_1(0, (err) => {
        if(err) {
            u.showErr(err)
            process.exit(1)
        } else {
            u.showMsg(`Starting core functionality...`)
            start_processes_1((err) => {
                if(err) {
                    u.showErr(err)
                    pm2.stopAll((err) => {
                        process.exit(2)
                    })
                }
            })
        }
    })

    function load_pkgs_1(ndx, cb) {
        let svcfolder = path.join(__dirname, cfg.SVC_FOLDER)
        if(core_procs.length <= ndx) cb()
        else pkgmgr.load(core_procs[ndx].pkg, svcfolder, (err, loc) => {
            if(err) cb(err)
            else {
                core_procs[ndx].loc = loc
                load_pkgs_1(ndx+1, cb)
            }
        })
    }

    function start_processes_1(cb) {
        start_procs_1(0, cb)
    }

    function start_procs_1(ndx, cb) {
        if(core_procs.length <= ndx) cb()
        else startProcess(cfg, core_procs[ndx].loc, (err) => {
            if(err) cb(err)
            else start_procs_1(ndx+1, cb)
        })
    }
}

function startProcess(cfg, cwd, cb) {
    let name = path.basename(cwd)
    let lg = path.join(u.logsLoc(), `${name}.log`)
    let opts = {
        name: name,
        script: "index.js",
        cwd: cwd,
        log: lg,
        stripANSI: true,
    }
    pm2.start(opts, cb)
}

/*      outcome/
 * Adjust the SSB configuration to suite us.
 */
function adjustSSBConfig(opts) {
    if(process.env.SSB_PORT) {
        opts.port = process.env.SSB_PORT
    } else {
        opts.port = u.adjustPort(8997)
    }

    let wsport = process.env.SSB_WS_PORT
    if(!wsport) {
        wsport = u.adjustPort(8996)
    }
    if(opts.ws) os.ws.port = wsport
    else opts.ws = { port: wsport }
    opts.blobsPort = wsport

    if(process.env.SSB_FOLDER) {
        opts.path = process.env.SSB_FOLDER
    } else {
        opts.path = path.join(u.dataLoc(), "__ssb")
    }

    if(process.env.SSB_HOST){
        opts.SSB_HOST = process.env.SSB_HOST
    }
    opts.allowPrivate = true

    opts.blobs = {
        sympathy: 1
    }
}


/*      problem/
 * We spawn a variety of sub-processes using PM2. When stopping the
 * main process, it turns out that almost all processes stop except
 * for the python AIML server. This prevents future restarts.
 *
 *      way/
 * We look for all spawned processes and try to kill them ourselves.
 */
let STOPPED
function stopChildProcesses(cb2) {
    if(STOPPED) return cb2()
    STOPPED = true
    psTree(process.pid, (err, children) => {
        if(err) cb2(err)
        else {
            children.map(c => {
                process.kill(c.PID)
            })
            setTimeout(() => {
                cb2()
            }, 1000)
        }
    })
}

/*    outcome/
 * Backup the data directory to the desktop
 */
function backup(loc, cb) {
    let n = path.join(loc, `Everlife-Backup-${date_now_1()}.zip`)

    let o = fs.createWriteStream(n)
    let bk = archiver('zip')
    let has_err = false

    o.on('close', () => {
        if(!has_err) cb(null, n)
    })
    o.on('warning', (err) => {
        u.showErr(err)
    })
    o.on('error', (err) => {
        has_err = true
        cb(err)
    })

    bk.pipe(o)
    if(os.platform()=='win32') backupForWindows(bk)
    else bk.directory(u.dataLoc(), false)
    bk.finalize()

    function date_now_1() {
        let dt = new Date()
        return dt.getFullYear() +
            '-' +
            pad2(dt.getMonth() + 1) +
            '-' +
            pad2(dt.getDate()) +
            'T' +
            pad2(dt.getHours()) +
            '-' +
            pad2(dt.getMinutes()) +
            '-' +
            pad2(dt.getSeconds()) +
            '.' +
            dt.getMilliseconds()
    }

    /*      understand/
     * Windows is locking some directories so we are going to backup
     * only the wallet and the ssb
     */
    function backupForWindows(bk){
        const secretFilePath = path.join(u.dataLoc() , "__ssb/secret")
        const luminatepw = path.join(u.dataLoc(), ".luminate-pw")
        bk.append(fs.createReadStream(secretFilePath), { name: 'secret' })
        bk.append(fs.createReadStream(luminatepw), { name: '.luminate-pw' })
        bk.directory(path.join(u.dataLoc(), 'stellar'), false)
    }

    function pad2(n) {
        if(n < 10) return '0' + n
        else return '' + n
    }

}
