var { h , Array: MutantArray, map } = require('mutant')
var nest = require('depnest')
var packageInfo = require('../../../../package.json')

var themeNames = Object.keys(require('../../../../styles'))

exports.needs = nest({
  'intl.sync.i18n': 'first',
})

exports.gives = nest('page.html.render')

var jobs = MutantArray([])

var fs = require('fs')
var path_ = require('path')

function getLatestJobs() {
    // TODO: read from marketplace
    let fname = path_.join(__dirname, '../../../../services/elife-job-mgr/jobs.json')
    fs.readFile(fname, "utf8", (err, data) => {
        if(err) console.error(err)
        else {
            try {
                jobs.set(JSON.parse(data))
            } catch(e) {
                console.error("Failed to load jobs...")
                console.error(err)
            }
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
        h('h1', [
          h('strong', i18n('Jobs'))
        ])
      ])
    ]

    return h('Scroller', { style: { overflow: 'auto' } }, [
      h('div.wrapper', [
        h('section.prepend', prepend),
        h('section.Jobs', map(jobs, to_card_1))
      ])
    ])


    function to_card_1(job) {
      return h('.card', [
        h('h2', job.title),
        h('.desc', job.desc),
        h('.ever', job.ever),
        h('.depo', job.depo),
        h('a.down', job.down),
        h('.inst', job.inst),
        h('.requ', job.requ)
      ])
    }

  })
}
