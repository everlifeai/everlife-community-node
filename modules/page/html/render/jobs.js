var { h , Value, Array: MutantArray, map } = require('mutant')
var nest = require('depnest')
var packageInfo = require('../../../../package.json')

var themeNames = Object.keys(require('../../../../styles'))

const cote = require('cote')({statusLogsEnabled:false})

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

var state = {
    jobsloaded: false,
}

function getLatestJobs() {
    jobsClient.send({ type: 'joblist' }, (err, data) => {
        if(err) console.error(err)
        else {
            if(!state.jobsloaded) {
                state.jobsloaded = true
                if(state.jobsloaded) spinner.set('')
            }
            jobs.set(data.groups)
        }
        setTimeout(getLatestJobs, state.jobsloaded ? 60 * 60 * 1000 : 5000)
    })
}

getLatestJobs()

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/jobs') return
    const i18n = api.intl.sync.i18n

    var head1 = [ h('PageHeading', [ h('h1', [ h('strong', i18n('Jobs')) ])])]
    
    return h('Scroller', { style: { overflow: 'auto' } }, [
      h('div.wrapper', [
        h('div', [ spinner ]),
        h('section.prepend', head1),
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