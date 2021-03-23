'use strict'

const setups = require('./setup.js')
const backup = require('./backup.js')

module.exports = {
    embeddedSetup: setup.embeddedSetup,
    adjustSSBConfig: setup.adjustSSBConfig,
    startAvatar: setup.startAvatar,
    stopChildProcesses: setup.stopChildProcesses,

    backup: backup,
}
