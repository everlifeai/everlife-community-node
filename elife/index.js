'use strict'

const setup = require('./setup.js')
const services = require('./services.js')
const backup = require('./backup.js')
const keymgt = require('./key-management.js')
const face = require('./setup-face-recognition.js')
const bew = require('./buy-ever-widget.js')

module.exports = {
    adjustSSBConfig: setup.adjustSSBConfig,
    setupAvatar: setup.avatar,

    startAvatar: services.start,
    stopAvatar: services.stop,

    backup: backup,

    checkAndCreateMnemonicKeys : keymgt.checkAndCreateMnemonicKeys,

    openLoginWindow: face.openLoginWindow,

    openBuyEverWindow: bew.openBuyEverWindow,
}
