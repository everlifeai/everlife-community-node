'use strict'
const cote = require('cote')({statusLogsEnabled:false})
const pull = require('pull-stream')
const fs = require('fs')
const toPull = require('stream-to-pull-stream')
const ssbkeys = require('ssb-keys')
const ref = require('ssb-ref')
const flat = require('flat')


/*      understand/
 * We hold a reference to the sbot (and our id) so we can access it for
 * various the various services we provide.
 * TODO: Replace this global with a closure
 */
let sbot

module.exports = {
    start: start,
    sendToFeedHandlers: sendToFeedHandlers,
}


function start(sbot_) {
    sbot = sbot_

    /*      understand/
     * The skill microservice (partitioned by key `everlife-ssb-svc` to
     * prevent conflicting with other services.
     */
    const sbotSvc = new cote.Responder({
        name: 'Everlife SSB Service',
        key: 'everlife-ssb-svc',
    })


    sbotSvc.on('new-msg', handleNewMsg)
    sbotSvc.on('new-pvt-msg', handleNewPvtMsg)
    sbotSvc.on('new-pvt-log', handleNewPvtLog)
    sbotSvc.on('dump-msgs', handleDumpMsgs)

    sbotSvc.on('create-user', handleCreateUser)
    sbotSvc.on('secret-key', handleGetSecretKey)

    sbotSvc.on('create-invite', handleCreateInvite)
    sbotSvc.on('accept-invite', handleAcceptInvite)

    sbotSvc.on('register-feed-handler', registerFeedHandler)

    sbotSvc.on('follow-user', handleFollowUser)
    sbotSvc.on('unfollow-user', handleUnFollowUser)

    sbotSvc.on('avatar-id', handleAvatarId)
    sbotSvc.on('msg-by-type', getMessageByType)

    sbotSvc.on('blob-save-file', saveFileAsBlob)
    sbotSvc.on('blob-save-array', saveArrayAsBlob)
    sbotSvc.on('blob-load', loadBlob)
    sbotSvc.on('everlife-service-auth', generateServiceAuth)

    sbotSvc.on('encrypt-text', encryptText)
    sbotSvc.on('decrypt-text', decryptText)

    sbotSvc.on('post-msg', handlePostMsg)
    sbotSvc.on('pvt-post-msg', handlePvtPostMsg)
}

function handleNewMsg(req, cb) {
    let id

    if(req.user) id = req.user
    else id = sbot.id

    if(!req.msg) {
        cb(`No msg found to add`)
        return
    }
    if(!req.msg.type) {
        cb(`Msg must have a type to add ${req.msg}`)
        return
    }

    sbot.identities.publishAs({ id:id, content:req.msg, private:false }, cb)
}
function handleNewPvtMsg(req, cb) {
    let id

    if(req.user) id = req.user
    else id = sbot.id

    if(!req.msg) {
        cb(`No msg found to add`)
        return
    }
    if(!req.msg.type) {
        cb(`Msg must have a type to add ${req.msg}`)
        return
    }
    if(!req.to || req.to == id) {
        cb(`No recipient found to send message to`)
        return
    }

    req.msg.recps = [ req.to, id ]

    sbot.identities.publishAs({ id:id, content:req.msg, private:true }, cb)
}
function handleNewPvtLog(req, cb) {
    let id

    if(req.user) id = req.user
    else id = sbot.id

    if(!req.msg) {
        cb(`No msg found to add`)
        return
    }
    if(!req.msg.type) {
        cb(`Msg must have a type to add ${req.msg}`)
        return
    }

    req.msg.recps = [ id ]

    sbot.identities.publishAs({ id:id, content:req.msg, private:true }, cb)
}
function handleDumpMsgs(req, cb) {
    let id = req.user
    dumpMsgs(id, req.opts, cb)
}

/*      outcome/
 * Dump all the messages in the user's feed. Useful for debugging.
 * Takes the following paramters:
 *  {
 *      showPvt: true,  <-- decrypt private messages
 *      showCnt: true,  <-- filter only the content
 *      showAth: true,  <-- filter only the author/message type
 * If
 * `showPvt` is set will decrypt private messages while dumping. If
 * `showCnt` is set will filter only the content.
 */
function dumpMsgs(id, opts, cb) {
    if(!opts) opts = {};
    let feedOpts = { private : opts.showPvt }
    let cmd = sbot.createLogStream

    if(id) {
        feedOpts.id = id
        cmd = sbot.createUserStream
    }

    if(opts.showCnt) {
        pull(
            cmd(feedOpts),
            pull.map(msg => msg.value.content),
            pull.collect(cb)
        )
    } else if(opts.showAth) {
        pull(
            cmd(feedOpts),
            pull.map(msg => { return { author: msg.value.author, type: msg.value.content.type} }),
            pull.collect(cb)
        )
    } else {
        pull(
            cmd(feedOpts),
            pull.collect(cb)
        )
    }
}

/*      outcome/
 * Create a new user managed by our avatar (acting as a 'host'), and
 * follow it so it replicates across our hubs.
 */
function handleCreateUser(req, cb) {
    sbot.identities.create((err,id) => {
        if(err) cb(err)
        else {
            sbot.publish({
                type: 'contact',
                following: true,
                autofollow: true,
                contact: id,
            }, (err,msg) => {
                cb(err, id);
            })
        }
    })
}

// TODO: WARNING: This is very insecure! :WARNING
// We need to think this use case out carefully
function handleGetSecretKey(req, cb) {
    if(!req.user) {
        cb(`No user provided`)
        return
    }

    sbot.identities.secret(req.user, (err,ids) => {
        if(err) cb(err)
        else cb(null,ids)
    })
}

function handleCreateInvite(req, cb) {
    // TODO: unlimited invite?
    sbot.invite.create(Number.MAX_VALUE, (err, inv) => {
        if(err) cb(err)
        else cb(null,inv)
    })
}

function handleAcceptInvite(req, cb) {
    if(!req.invite) {
        cb(`No invite found`)
        return
    }
    try {
        sbot.invite.accept(req.invite, cb);
    } catch(e) {
        console.error(e)
        cb(`Unexpected error joining pub!`)
    }
}

let feedHandlerRegistry = []
function registerFeedHandler(req, cb) {
    if(!req.mskey || !req.mstype) cb(`mskey & mstype needed to register feed handler`)
    else {
        let client = new cote.Requester({
            name: `SSB Feed -> ${req.mskey}`,
            key: req.mskey,
        })
        feedHandlerRegistry.push({client: client, mstype: req.mstype})
        cb(null)
    }
}

function sendToFeedHandlers(msg) {
    send_to_handler_1(0)

    function send_to_handler_1(ndx) {
        if(ndx >= feedHandlerRegistry.length) return
        let fh = feedHandlerRegistry[ndx]
        fh.client.send({
            type: fh.mstype,
            msg: msg,
        })
    }
}

function handleFollowUser(req,cb){
    if(!req.userid) cb('No user id found')

    sbot.publish({
        type: 'contact',
        contact: req.userid,
        following: true 
      }, cb)
}

function handleUnFollowUser(req,cb){
    if(!req.userid) cb('No user id found')

    sbot.publish({
        type: 'contact',
        contact: req.userid,
        following: false 
      }, cb)
}

function handleAvatarId(req, cb) {
    cb(null, sbot.id)
}

function getMessageByType(req,cb){

    pull(
        sbot.messagesByType({ id: sbot.id,type:req.msgtype, private: true }),
        pull.collect(function (err, msgs) {
            if(err) cb(err)
            else cb(null, msgs)
        })
    )
}

/**
 *      /outcome
 * Save the file from the given path as a blob on SSB and return it's
 * hash (which must be stored somewhere as it's reference).
 */
function saveFileAsBlob(req, cb){

    if(!req.filePath) {
        return cb('No file path found to save blob')
    }

    try {
        pull(
            toPull.source(fs.createReadStream(req.filePath)),
            sbot.blobs.add(cb)
        )
    } catch(e) {
        cb(e)
    }
}

/**
 *      /outcome
 * Write the given array of bytes as a blob and return it's hash
 */
function saveArrayAsBlob(req, cb){
    if(!req.bytes || !req.bytes.length) {
        return cb(`No bytes found to save as blob`)
    }

    try {
        pull(
            pull.once(Buffer.from(req.bytes)),
            sbot.blobs.add(cb)
        )
    } catch(e) {
        cb(e)
    }
}

/**
 *      /outcome
 * Get the content(Buffer) from blob for a given hash value
 */
function loadBlob(req, cb){

    if(!req.hash) {
        return cb('Cannot load blob with empty hash value')
    }

    try {
        pull(
            sbot.blobs.get(req.hash),
            pull.collect(cb)
        )
    } catch(e) {
        cb(e)
    }
}

function generateServiceAuth(req, cb){
    let challenge = process.env.EVERLIFE_SERVICE_CHALLENGE
    if(!challenge) challenge = "O3parF2LRWVcfVvmrLZHZ7Qg4D7WnZOkjVD1QNdAYbM"
    if(challenge){
        const signedChallenge = ssbkeys.signObj(sbot.keys,{challenge:challenge})
        cb(null,{key:sbot.keys.public,signed:signedChallenge.signature} )
    }else 
        cb('Everlife service challenge is not configured.')
}

/**
 *      /outcome
 * Get the encrypted text based on given text using avatar key
 * If encryption failed return same text
 * @param {*} msg - plain text
 * @param {*} cb
 */
function encryptText(req, cb){
    if(!req.text) return cb('Plain text is missing')
    let encryptMsg = ssbkeys.box(req.text, [sbot.keys.public])
    if(encryptMsg) cb(null, encryptMsg)
    else cb(null, req.text)
}

/**
 *      /outcome
 * Get the decrypted text based on given encrypted text using avatar key
 * If decryption failed return same text
 * @param {*} msg - encrypted text based on avatar key
 * @param {*} cb
 */

function decryptText(req, cb) {
    if(!req.text) return cb('Encrypted text is missing')
    let decryptMsg = ssbkeys.unbox(req.text, sbot.keys)
    if(decryptMsg) cb(null, decryptMsg)
    else cb(null, req.text)
}

function handlePostMsg(req, cb) {
    let content = req.msg
    let flatContent = flat(content)
    Object.keys(flatContent).forEach(key => {
        var val = flatContent[key]
        if (ref.isBlob(val)) {
            sbot.blobs.push(val, err => {
                if (err) console.error(err)
            })
        }
    })
    sbot.publish(content, cb)
}

function handlePvtPostMsg(req, cb) {
    let content = req.msg
    if(!content.recps) return cb(`Message recipients (.recps) not set!`)
    content = ssbkeys.box(content, content.recps.map(e => {
        return ref.isFeed(e) ? e : e.link
    }))
    sbot.publish(content, cb)
}
