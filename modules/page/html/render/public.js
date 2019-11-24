var nest = require('depnest')
var { h, send, Value, when, computed, map, onceTrue } = require('mutant')
var {clipboard} = require('electron')
var chatwidget = require('./chatwidget')
var path_ = require('path')

const cote = require('cote')({statusLogsEnabled:false})

const commMgrClient = new cote.Requester({
  name: 'Public Page -> CommMgr',
  key: 'everlife-communication-svc',
})

function sendNotification(msg) {
  new Notification('Everlife Explorer', {
    body: msg,
    icon: path_.join(__dirname, "notif-icon.png"),
  })
  let req = {
    type: 'reply',
    msg: msg,
    USELASTCHAN: true,
  }
  commMgrClient.send(req, (err) => {
    if(err){
      console.error('Public Page')
      console.error(err)
    }
  })
}

exports.needs = nest({
  sbot: {
    obs: {
      connectedPeers: 'first',
      localPeers: 'first',
      connection: 'first'
    }
  },
  'sbot.pull.stream': 'first',
  'sbot.pull.resumeStream': 'first',
  'about.html.image': 'first',
  'about.obs.name': 'first',
  'invite.sheet': 'first',
  'dhtInvite.accept.sheet': 'first',
  'dhtInvite.create.sheet': 'first',

  'message.html.compose': 'first',
  'message.async.publish': 'first',
  'message.sync.root': 'first',
  'progress.html.peer': 'first',

  'wallet.sheet.getPW': 'first',
  'wallet.handler.fetch.obsAccId': 'first',
  'wallet.handler.fetch.obsAccBal': 'first',
  'wallet.handler.setup.onNoPw': 'first',
  'wallet.handler.setup.onNewPayments': 'first',
  'wallet.handler.setup.reload': 'first',

  'skills.loadMetaInfo': 'first',

  'feed.html.followWarning': 'first',
  'feed.html.followerWarning': 'first',
  'feed.html.rollup': 'first',
  'profile.obs.recentlyUpdated': 'first',
  'profile.obs.contact': 'first',
  'contact.obs.following': 'first',
  'contact.obs.followers': 'first',
  'contact.obs.blocking': 'first',
  'channel.obs': {
    subscribed: 'first',
    recent: 'first'
  },
  'channel.sync.normalize': 'first',
  'keys.sync.id': 'first',
  'settings.obs.get': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest({
  'page.html.render': true
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('page.html.render', page)

  function page (path) {
    if (path !== '/public') return // "/" is a sigil for "page"

    var id = api.keys.sync.id()
    var following = api.contact.obs.following(id)
    var blocking = api.contact.obs.blocking(id)
    var subscribedChannels = api.channel.obs.subscribed(id)
    var recentChannels = api.channel.obs.recent(8)
    var channelsLoading = computed([subscribedChannels.sync, recentChannels.sync], (...args) => !args.every(Boolean))
    var connectedPeers = api.sbot.obs.connectedPeers()
    var localPeers = api.sbot.obs.localPeers()
    var connectedPubs = computed([connectedPeers, localPeers], (c, l) => c.filter(x => !l.includes(x)))
    var contact = api.profile.obs.contact(id)
    let accid = api.wallet.handler.fetch.obsAccId()
    let accbal = api.wallet.handler.fetch.obsAccBal()
    api.wallet.handler.setup.onNoPw(() => {
      api.wallet.sheet.getPW(api.wallet.handler.setup.reload)
    })
    api.wallet.handler.setup.onNewPayments((payments) => {
      for(let i = 0;i < payments.length;i++) {
        let p = payments[i].payment
        let memo = payments[i].memo
        if(!memo || memo == 'memoNone') memo = ''
        if(p.asset && p.asset.alphaNum4 && p.asset.alphaNum4.assetCode == 'EVER') {
          if(p.destination === accid.val()) sendNotification(`Yipee! We got paid ${p.amount.value} EVER ${memo}`)
        }
      }
    })

    /*    problem/
     * If the user has asked us to install a skill, we need to refresh
     * the skill pane.
     *
     *    way/
     * We give the skill a couple of seconds to download then ask the
     * pane to refresh the skill meta info. This should hopefully cause
     * it to reload. (TODO: Is there a better way to do this?)
     */
    chatwidget.addUserMsgHandler((msg) => {
      if(msg.startsWith('/install')){
        setTimeout(api.skills.loadMetaInfo, 10 * 1000)
      }
    })

    var prepend = [
      api.message.html.compose({ meta: { type: 'post' }, draftKey: 'public', placeholder: i18n('Write a public message') }),
      noVisibleNewPostsWarning(),
      noFollowersWarning()
    ]

    var getStream = api.sbot.pull.resumeStream((sbot, opts) => {
      return sbot.patchwork.publicFeed.roots(opts)
    }, { limit: 40, reverse: true })

    var filters = api.settings.obs.get('filters')
    var feedView = api.feed.html.rollup(getStream, {
      prepend,
      updateStream: api.sbot.pull.stream(sbot => sbot.patchwork.publicFeed.latest()),
      compactFilter: function (msg, root) {
        if (!root && api.message.sync.root(msg)) {
          // msg has a root, but is being displayed as root (fork)
          return true
        }
      }
    })

    // call reload whenever filters changes (equivalent to the refresh from inside rollup)
    filters(feedView.reload)

    var result = h('div.SplitView', [
      h('div.side', [
        getSidebar()
      ]),
      h('div.main', feedView),
      chatwidget.getChatWidget(i18n)
    ])

    result.pendingUpdates = feedView.pendingUpdates
    result.reload = function () {
      feedView.reload()
    }

    return result

    function getSidebar () {
      var whoToFollow = computed([api.profile.obs.recentlyUpdated(), following, blocking, localPeers], (recent, ...ignoreFeeds) => {
        return recent.filter(x => x !== id && !ignoreFeeds.some(f => f.includes(x))).slice(0, 10)
      })
      return [

          h('h2', i18n('EVER Balance')),
          h('div', {
              classList: 'Wallet',
          }, [
              h('.balance', h('a',{href:'/wallet','style':{'color':'#008000'}}, accbal.val)),
              h('.wallet-link',
                  h('a',{ href:'/wallet',
                    style: {
                      display: 'inline-block',
                      'line-height': '40px',
                      'user-select': 'none',
                    }
                  },
                    [
                      h('img', {
                          src: path_.join(__dirname, 'wallet-icon.png'),
                          style: {
                              height: "40px",
                              padding: "0 4px",
                              'vertical-align': "middle",
                          }
                      }),
                      h('span', {
                          style: {
                              "font-size": "10px",
                              "font-weight": "bold",
                              "color": "#5d5d5d",
                          }
                      }, "EVER Wallet")
                  ])
              ),
          ]),

        h('button -pub -full', {
          'ev-click': api.invite.sheet
        }, i18n('+ Join Hub')),

        // disabling DHT invites until they work in sbot@13
        //
        // h('SplitButton', [
        //   h('button -createInvite', {
        //     'ev-click': api.dhtInvite.create.sheet
        //   }, i18n('Create Invite')),
        //   h('button -acceptInvite', {
        //     'ev-click': api.dhtInvite.accept.sheet
        //   }, i18n('Accept Invite'))
        // ]),

        when(channelsLoading, [ h('Loading') ], [
          when(computed(recentChannels, x => x.length), [
            h('h2', i18n('Active Channels')),
            h('div', {
              classList: 'ChannelList',
              hidden: channelsLoading
            }, [
              map(recentChannels, (channel) => {
                var subscribed = subscribedChannels.has(channel)
                return h('a.channel', {
                  href: `#${channel}`,
                  classList: [
                    when(subscribed, '-subscribed')
                  ]
                }, [
                  h('span.name', '#' + channel)
                ])
              }, { maxTime: 5 }),
              h('a.channel -more', { href: '/channels' }, i18n('More Channels...'))
            ])
          ])
        ]),

        PeerList(localPeers, i18n('Local')),
        PeerList(connectedPubs, i18n('Connected Hubs')),

        when(computed(whoToFollow, x => x.length), h('h2', i18n('Who to follow'))),
        when(following.sync,
          h('div', {
            classList: 'ProfileList'
          }, [
            map(whoToFollow, (id) => {
              return h('a.profile', {
                href: id
              }, [
                h('div.avatar', [api.about.html.image(id)]),
                h('div.main', [
                  h('div.name', [ api.about.obs.name(id) ])
                ])
              ])
            })
          ])
        )
      ]
    }

    function PeerList (ids, title) {
      return [
        when(computed(ids, x => x.length), h('h2', title)),
        h('div', {
          classList: 'ProfileList'
        }, [
          map(ids, (id) => {
            var connected = computed([connectedPeers, id], (peers, id) => peers.includes(id))
            return h('a.profile', {
              classList: [
                when(connected, '-connected')
              ],
              href: id
            }, [
              h('div.avatar', [api.about.html.image(id)]),
              h('div.main', [
                h('div.name', [ api.about.obs.name(id) ])
              ]),
              h('div.progress', [
                api.progress.html.peer(id)
              ]),
              h('div.controls', [
                h('a.disconnect', { href: '#', 'ev-click': send(disconnect, id), title: i18n('Force Disconnect') }, ['x'])
              ])
            ])
          })
        ])
      ]
    }

    function noVisibleNewPostsWarning () {
      const explanation = i18n('You may not be able to see new content until you follow some users or hubs.')

      const shownWhen = computed([contact.sync, contact.isNotFollowingAnybody],
        (contactSync, isNotFollowingAnybody) => contactSync && isNotFollowingAnybody
      )

      return api.feed.html.followWarning(shownWhen, explanation)
    }

    function noFollowersWarning () {
      const explanation = i18n(
        'Nobody will be able to see your posts until you have a follower. The easiest way to get a follower is to use a hub invite as the hub will follow you back. If you have already redeemed a hub invite and you see it has not followed you back on your profile, try another hub.'
      )

      // We only show this if the user has followed someone as the first warning ('You are not following anyone')
      // should be sufficient to get the user to join a hub. However, hubs have been buggy and not followed back on occasion.
      // Additionally, someone on-boarded on a local network might follow someone on the network, but not be followed back by
      // them, so we begin to show this warning if the user has followed someone, but has no followers.
      const shownWhen = computed([contact.sync, contact.hasNoFollowers, contact.isNotFollowingAnybody],
        (contactSync, hasNoFollowers, isNotFollowingAnybody) =>
          contactSync && (hasNoFollowers && !isNotFollowingAnybody)
      )

      return api.feed.html.followerWarning(shownWhen, explanation)
    }

    function disconnect (id) {
      onceTrue(api.sbot.obs.connection, (sbot) => {
        sbot.patchwork.disconnect(id)
      })
    }
  }
}
