'use strict'
const shell = require('shelljs')
const path = require('path')
const fs = require('fs')
const shortid = require('shortid')

const fixPath = require('fix-path')

const u = require('@elife/utils')
const os = require('os');

const dotenv = require('dotenv').config({ path : path.join(u.dataLoc(),'cfg.env')})

function avatarSetup(args) {
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
 * Create the data, skill, and face folders
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
    try {
        fs.mkdirSync(u.faceImgLoc(), { recursive: true })
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

function showInfo() {
    const { version } = require('../package.json')
    console.log(`Avatar node (version ${version})`)
    console.log(`Installed in:`)
    console.log(`    ${shell.pwd()}`)
    console.log(`Data stored in: (BACKUP THIS FOLDER)`)
    console.log(`    ${u.dataLoc()}`)
    console.log(`Microservice Partition Key (for developers)`)
    console.log(`    COTE_ENV=${process.env.COTE_ENV}`)
}



module.exports = {
    avatar: avatarSetup,
    adjustSSBConfig,
    showInfo,
}
