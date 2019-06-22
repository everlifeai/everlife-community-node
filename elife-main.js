'use strict'
const shell = require('shelljs')
const path = require('path')
const fs = require('fs')
const shortid = require('shortid')

const pm2 = require('pm2')
const pkgmgr = require('elife-pkg-mgr')
const u = require('elife-utils')
var psTree = require('ps-tree')


const dotenv = require('dotenv').config({ path : path.join(u.dataLoc(),'cfg.env')})

module.exports = {
    showInfo: showInfo,
    recreateNodeModules: recreateNodeModules,
    removeNodeModules: removeNodeModules,
    removePackageLock: removePackageLock,
    startup: startup,
    embeddedStartup: embeddedStartup,
    adjustSSBConfig: adjustSSBConfig,
    setupEnvironmentVariables: setupEnvironmentVariables,
    startAvatar: startAvatar,
    stopChildProcesses: stopChildProcesses,
}

function showInfo() {
    const { version } = require('./package.json')
    console.log(`Avatar node (version ${version})`)
    console.log(`Installed in:`)
    console.log(`    ${shell.pwd()}`)
    console.log(`Data stored in: (BACKUP THIS FOLDER)`)
    console.log(`    ${u.dataLoc()}`)
}

function startup(args) {
    setup(args)
    showCotePartition()
    startRichGUI(args)
}

function startRichGUI(args) {
    shell.exec(`npm start`)
}

function setup(args) {
    setupAvatarComponents()
    setupEnvironmentVariables(args)
    setupHomeFolders()
    migrateOldData()
    setupWallet()
    checkCoteConnection()
    setupUserConfig()
}

function embeddedStartup(args) {
    setupEnvironmentVariables(args)
    setupHomeFolders()
    setupUserConfig()
    showInfo()
    startAvatar()
}

function recreateNodeModules() {
    let structure = avatarStructure()
    for(let i = 0;i < structure.length;i++) {
        let loc
        if(structure[i].required) loc = structure[i].required
        if(structure[i].optional) loc = structure[i].optional
        if(loc) do_stuff_1(loc)
    }

    function do_stuff_1(loc) {
        let r = shell.pushd('-q', loc)
        if(r.code) {
            shell.echo(`Failed to change directory to: ${loc}`)
            return false
        }
        let nm = 'node_modules'
        if(shell.test("-d", nm)) {
            shell.echo(`Removing ${loc}/${nm}`)
            let r = shell.rm("-rf", nm)
            if(r.code) {
                shell.echo(`Failed to remove ${nm}`)
                shell.popd('-q')
                return false
            }
        }
        shell.echo(`Installing ${loc}/${nm}`)
        r = shell.exec(`npm install --no-bin-links`)
        if(r.code) {
            shell.echo(`Failed to npm install in: ${loc}`)
            shell.popd('-q')
            return false
        }

        shell.popd('-q')
        return true
    }
}

function removeNodeModules() {
    let structure = avatarStructure()
    for(let i = 0;i < structure.length;i++) {
        let loc
        if(structure[i].required) loc = structure[i].required
        if(structure[i].optional) loc = structure[i].optional
        if(loc) {
            let nm = path.join(loc, 'node_modules')
            if(shell.test("-d", nm)) {
                shell.echo(`Removing ${nm}`)
                let r = shell.rm("-rf", nm)
                if(r.code) shell.echo(`Failed to remove ${nm}`)
            }
        }
    }
    shell.echo(`Remember to remove './node_modules' manually (needed for this script to run)`)
}

function removePackageLock() {
    let structure = avatarStructure()
    for(let i = 0;i < structure.length;i++) {
        let loc
        if(structure[i].required) loc = structure[i].required
        if(structure[i].optional) loc = structure[i].optional
        if(loc) {
            let yl = path.join(loc, 'package-lock.json')
            if(shell.test("-f", yl)) {
                shell.echo(`Removing ${yl}`)
                let r = shell.rm(yl)
                if(r.code) shell.echo(`Failed to remove ${yl}`)
            }
        }
    }
    shell.rm('package-lock.json')
}

/*      outcome/
 * The structure of the avatar node - required repos, additional
 * directories, and optional repos.
 */
function avatarStructure() {
    return [
        //{ required: "qwert" },

        { dir: "services" },

        { required: "services/elife-ai" },
        { dir: "services/elife-ai/brains" },
        { required: "services/elife-ai/brains/ebrain-aiml" },
        { required: "services/elife-ai/brains/ebrain-aiml/aiml" },

        { required: "services/elife-level-db" },

        { required: "services/elife-stellar" },

        //{ required: "services/elife-sbot", postInstall: "node fixAppKey" },

        { required: "services/elife-communication-mgr" },
        { dir: "services/elife-communication-mgr/channels" },
        { required: "services/elife-communication-mgr/channels/elife-telegram" },
        { required: "services/elife-communication-mgr/channels/elife-qwert" },

        { required: "services/elife-skill-mgr" },
        { dir: "services/elife-skill-mgr/skills" },
        { required: "services/elife-skill-mgr/skills/eskill-intro" },
        { required: "services/elife-skill-mgr/skills/eskill-about" },
        { required: "services/elife-skill-mgr/skills/eskill-follower" },
        { required: "services/elife-skill-mgr/skills/eskill-nw" },

        { optional: "services/elife-skill-mgr/skills/eskill-vanity-address" },
        { optional: "services/elife-skill-mgr/skills/eskill-kb-creator" },
        { optional: "services/elife-skill-mgr/skills/eskill-direct-message" },
        { optional: "services/elife-skill-mgr/skills/eskill-ai-artist" },
        { optional: "services/elife-skill-mgr/skills/eskill-coupon" },
        { optional: "services/elife-skill-mgr/skills/eskill-alarm" },
    ]
}

/*      outcome/
 * Set up the various avatar components needed (required and optional)
 * in the correct directory structures.
 */
function setupAvatarComponents() {
    let structure = avatarStructure()
    for(let i = 0;i < structure.length;i++) {
        let s = structure[i]
        if(s.required) if(!install(s)) return false
        if(s.dir) if(!mkdir(s.dir)) return false
        if(s.optional) install(s)
    }

    return true
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
        console.log(e)
        r = false
    }
    try {
        fs.mkdirSync(u.skillLoc(), { recursive: true })
        return r
    } catch(e) {
        console.log(e)
        return false
    }
}

/*      problem/
 * The current data folders are 'better' located but for those that have
 * already installed the avatar's they have their data in different
 * locations and should be able to continue to use them.
 *
 *      way/
 * If the new data folder is empty we look into the old data folder:
 *      ../elife.data
 *      OR
 *      /data
 * and we move all the existing data (__ssb/, kb/, stellar/, level.db/,
 * .luminate-pw, cfg.env) to the new folder.
 */
function migrateOldData() {
    let dl = u.dataLoc()
    let existing = shell.ls(dl)
    if(shell.error()) {
        shell.echo(`Failed checking data directory for migration: ${dl}`)
        shell.exit(1)
    }
    if(existing.length > 0) return

    let old = find_old_data_dir_1()
    if(!old) return


    shell.echo(`\n\nMigrating from: ${old} to: ${dl}`)
    let datalist = [
        '__ssb', 'kb', 'stellar', 'level.db', '.luminate-pw', 'cfg.env',
    ]
    for(let i = 0;i < datalist.length;i++) {
        let from = path.join(old, datalist[i])
        if(shell.test("-e", from)) {
            shell.echo(`Moving: ${from} to: ${dl}`)
            shell.mv(from, dl)
        }
    }
    shell.echo(`Migration of existing data done...\n\n`)


    function find_old_data_dir_1() {
        if(shell.test("-d",'/data')) return '/data'
        let d = path.join(shell.pwd().toString(),'../elife.data')
        if(shell.test("-d",d)) return d
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
    console.log(`
FYI: Microservice Partition Key (for development):
    COTE_ENV=${process.env.COTE_ENV}
`)
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
                    process.exit(2)
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
        pm2.connect(true, (err) => {
            if(err) cb(err)
            else start_procs_1(0, cb)
        })
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
}


/*      problem/
 * We spawn a variety of sub-processes using PM2. When stopping the
 * main process, it turns out that almost all processes stop except
 * for the python AIML server. This prevents future restarts.
 *
 *      way/
 * We ask pm2 to stop all processes then we look for all spawned
 * processes and try to kill them ourselves.
 */
let STOPPED
function stopChildProcesses(cb2) {
    if(STOPPED) return cb2()
    STOPPED = true
    pm2.delete('all', () => {
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
    })
}
