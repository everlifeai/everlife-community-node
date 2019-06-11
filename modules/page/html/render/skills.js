var { h, Array: MutantArray, map, when } = require('mutant')
var nest = require('depnest')
var packageInfo = require('../../../../package.json')

var themeNames = Object.keys(require('../../../../styles'))

exports.needs = nest({
  'intl.sync.i18n': 'first',
})

exports.gives = nest('page.html.render')

var skillInfo = MutantArray([])

var fs = require('fs')
var path_ = require('path')
function loadSkillMeta(loc) {
    let skills = []
    fs.readdir(loc, { withFileTypes: true }, (err, files) => {
        if(err) console.error(err)
        else {
            load_skill_ndx_1(files, 0, skills)
        }
    })

    function load_skill_ndx_1(files, ndx, skills) {
        if(ndx >= files.length) return skillInfo.set(skills)
        let f = files[ndx]
        if(!f.isDirectory()) return load_skill_ndx_1(files, ndx+1, skills)
        load_skill_info_1(files, ndx, skills, path_.join(loc, f.name))
    }

    function load_skill_info_1(files, ndx, skills, curr) {
        let info = {
            location: curr,
        }
        fs.readdir(curr, (err, files2) => {
            if(err) {
                console.error(err)
                load_skill_ndx_1(files, ndx+1, skills)
            } else {
                for(let i = 0;i < files2.length;i++) {
                    if(files2[i].endsWith('.png')) info.pic = path_.join(curr, files2[i])
                }
                fs.readFile(path_.join(curr, "package.json"), "utf8", (err, data) => {
                    if(err) {
                        console.error(err)
                        load_skill_ndx_1(files, ndx+1, skills)
                    } else {
                        try {
                            let d = JSON.parse(data)
                            info.name = d.name
                            info.version = d.version
                            info.desc = d.description
                            skills.push(info)
                            load_skill_ndx_1(files, ndx+1, skills)
                        } catch(e) {
                            console.error(err)
                            load_skill_ndx_1(files, ndx+1, skills)
                        }
                    }
                })
            }
        })
    }
}


loadSkillMeta(path_.join(__dirname, '../../../../services/elife-skill-mgr/skills'))

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/skills') return
    const i18n = api.intl.sync.i18n

    var prepend = [
      h('PageHeading', [
        h('h1', [
          h('strong', i18n('Skills'))
        ])
      ])
    ]

    return h('Scroller', { style: { overflow: 'auto' } }, [
      h('div.wrapper', [
        h('section.prepend', prepend),
        h('section.Skills', map(skillInfo, to_card_1))
      ])
    ])

    function to_card_1(skill) {
      return h('.card', [
        h('h2', [
          when(skill.pic,
            h("img", { src: skill.pic }),
            h("span", "")
          ),
          skill.name
        ]),
        h(".desc", skill.desc),
        h(".version", [
          h("span", "ver: "),
          h("span.number", skill.version),
        ]),
      ])
    }

  })
}
