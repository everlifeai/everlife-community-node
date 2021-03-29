'use strict'
const path = require('path')

const u = require('@elife/utils')

const pm2 = require('@elife/pm2')
const pkgmgr = require('@elife/pkg-mgr')

const setup = require('./setup.js')

/*      outcome/
 * Setup the avatar, and start the core processes from the 
 * configured environment
 */
function startAvatar() {
    setup.avatar()
    startCoreProcesses(loadConfig())
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
        else startProcess(cfg, core_procs[ndx].loc, (err, pi) => {
            if(err) return cb(err)
            u.showMsg(`Started ${pi.name} (pid: ${pi.child.pid})`)
            start_procs_1(ndx+1, cb)
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

function stopChildProcesses() {
    pm2.forEach(pi => {
      if(pi.name) u.showMsg(`Stopping ${pi.name} (pid: ${pi.child.pid})`)
      pm2.stop(pi)
    })
}

module.exports = {
  start: startAvatar,
  stop: stopChildProcesses,
}
