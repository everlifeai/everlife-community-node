var { h , Value, Array: MutantArray, map } = require('mutant')
var nest = require('depnest')
var packageInfo = require('../../../../package.json')

var themeNames = Object.keys(require('../../../../styles'))

const cote = require('cote')({statusLogsEnabled:false})

let stellarClient = new cote.Requester({
    name: `Job Page -> Stellar`,
    key: 'everlife-stellar-svc',
})

let jobsClient = new cote.Requester({
    name: `Job Page -> Worker`,
    key: 'everlife-work',
})

exports.needs = nest({
  'intl.sync.i18n': 'first',
})

exports.gives = nest('page.html.render')

var jobs = MutantArray([])
var spinner = Value('(...fetching...)')

var fs = require('fs')
var path_ = require('path')

function getLatestJobs() {
    jobsClient.send({ type: 'joblist' }, (err, data) => {
        if(err) {
            setTimeout(getLatestJobs, 5000)
        }
        else {
            spinner.set('')
            jobs.set(data.groups)
            setTimeout(getLatestJobs, 60 * 60 * 1000)
        }
    })
}

getLatestJobs()

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/jobs') return
    const i18n = api.intl.sync.i18n

    var prepend = [
      h('PageHeading', [
        h('div', [ spinner ]),
        h('h1', [
          h('strong', i18n('Jobs'))
        ]),
      ])
    ]

    return h('Scroller', { style: { overflow: 'auto' } }, [
      h('div.wrapper', [
        h('section.prepend', prepend),
        h('section.Jobs', map(jobs, to_card_1))
      ])
    ])


    function to_card_1(job) {
      let inst = job.enrolled ? "Already Enrolled" : `Enroll ${job.id}`
      return h('.card', [
        h('h2', job.name),
        h('.inst', inst),
      ])
    }

  })
}
