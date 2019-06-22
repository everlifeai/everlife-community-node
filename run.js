'use strict'
const cla = require('command-line-args')

const elife = require('./elife-main')

/*      understand/
 * Main entry point for our program
 */
function main() {
    let args = getArgs()
    if(args.help) showHelp()
    else if(args['info']) elife.showInfo()
    else if(args['rebuild-node-modules']) elife.recreateNodeModules()
    else if(args['rm-node-modules']) elife.removeNodeModules()
    else if(args['rm-package-locks']) elife.removePackageLock()
    else elife.startup(args)
}

function getArgs() {
    const ops = [
        { name: 'help', alias: 'h', type: Boolean },
        { name: 'info', alias: 'i', type: Boolean },
        { name: 'rebuild-node-modules', type: Boolean },
        { name: 'rm-node-modules', type: Boolean },
        { name: 'rm-package-locks', type: Boolean },
        { name: 'node-num', alias: 'n' },
    ]

    return cla(ops)
}

function showHelp() {
    console.log(`Start the avatar node

Other functionality:
    --info,i    : Show information about the installed avatar
    --help, -h  : show this help

   (rarely required)
    --rebuild-node-modules   : Remove all node modules
    --rm-node-modules   : Remove all node modules
    --rm-package-locks  : Remove all package-lock.json files

    --node-num=x, -n x  : Start as node number 'x'
`)
}

main()
