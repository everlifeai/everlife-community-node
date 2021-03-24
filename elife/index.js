'use strict'

const setup = require('./setup.js')
const backup = require('./backup.js')
const keymgt = require('./key-management.js')

module.exports = {
    embeddedSetup: setup.embeddedSetup,
    adjustSSBConfig: setup.adjustSSBConfig,
    startAvatar: setup.startAvatar,
    stopChildProcesses: setup.stopChildProcesses,

    backup: backup,

    checkAndCreateMnemonicKeys : keymgt.checkAndCreateMnemonicKeys,
}
