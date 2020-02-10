var fs = require('fs')
var Path = require('path')
var electron = require('electron')
var spawn = require('child_process').spawn
var fixPath = require('fix-path')
// var DHT = require('multiserver-dht')

// removing DHT invites until they work in sbot@13
//
// function dhtTransport (sbot) {
//   sbot.multiserver.transport({
//     name: 'dht',
//     create: dhtConfig => {
//       return DHT({
//         keys: sbot.dhtInvite.channels(),
//         port: dhtConfig.por t
//       })
//     }
//   })
// }

var msSbot = require('./elife-ms')

var createSbot = require('secret-stack')()
  .use(require('ssb-db'))
  .use(require('ssb-master'))
  .use(require('ssb-gossip'))
  .use(require('ssb-replicate'))
  .use(require('ssb-no-auth'))
  .use(require('ssb-unix-socket'))
  // .use(require('ssb-friends')) // woah! (being handled in sbot/index.js and sbot/contacts.js)
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
  .use(require('./sbot'))

fixPath()

module.exports = function (ssbConfig) {
  var context = {
    sbot: createSbot(ssbConfig),
    config: ssbConfig
  }
  ssbConfig.manifest = context.sbot.getManifest()
  fs.writeFileSync(Path.join(ssbConfig.path, 'manifest.json'), JSON.stringify(ssbConfig.manifest))
  electron.ipcRenderer.send('server-started', ssbConfig)

  msSbot.start(context.sbot)
  msSbot.pollForFeedUpdates()
  
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
}
