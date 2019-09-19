var { h, Array: MutantArray, map, when } = require('mutant')
var nest = require('depnest')
var packageInfo = require('../../../../package.json')
const cote = require('cote')({statusLogsEnabled:false})
var u = require('elife-utils');

var themeNames = Object.keys(require('../../../../styles'))

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'pwd.savepwd': 'first',
})

exports.gives = nest('page.html.render')

var skillInfo = MutantArray([])

var fs = require('fs')
var path_ = require('path')

/*    outcome/
 * We load all the internals skills that are prepackaged with the avatar
 * then load all skills that the user has downloaded. We also mark the
 * internal skills as internal so they are easy to distinguish.
 */
function loadAllSkillsMeta() {
  let internalSkills = path_.join(__dirname,'../../../../services/elife-skill-mgr/skills')
  let externalSkills = u.skillLoc()

  let allSkills = []

  loadSkillMeta(internalSkills, (err, skills) => {
    if(err) console.error(err)
    else {

      for(let i = 0;i < skills.length;i++) skills[i].internal = true
      allSkills = skills

      loadSkillMeta(externalSkills, (err, skills) => {
        if(err) console.error(err)
        else {
          allSkills = allSkills.concat(skills)
          skillInfo.set(allSkills)
        }
      })
    }
  })
}

/*    outcome/
 * Load skill meta data from all the skills directories in the given
 * location (if there are any errors during reading we assume there's a
 * bad directory and just continue)
 */
function loadSkillMeta(loc, cb) {
  let skills = []
  fs.readdir(loc, { withFileTypes: true }, (err, files) => {
    if(err) cb(err)
    else load_skill_ndx_1(loc, files, 0)
  })

  function load_skill_ndx_1(loc, files, ndx) {
    if(ndx >= files.length) return cb(null, skills)

    let f = files[ndx]
    if(!f.isDirectory()) return load_skill_ndx_1(loc, files, ndx+1)
    else load_skill_info_1(path_.join(loc, f.name), (err) => {
      if(err) console.error(err)
      load_skill_ndx_1(loc, files, ndx+1)
    })
  }

  /*    outcome/
   * Load the skill information from the given location by picking up
   * any image files and picking data from the 'package.json'.
   */
  function load_skill_info_1(curr, cb) {
    let info = {
      location: curr,
    }
    fs.readdir(curr, (err, files) => {
      if(err) cb(err)
      else {
        for(let i = 0;i < files.length;i++) {
          if(files[i].endsWith('.png')) info.pic = path_.join(curr, files[i])
        }
        fs.readFile(path_.join(curr, "package.json"), "utf8", (err, data) => {
          if(err) cb(err)
          else {
            try {
              let d = JSON.parse(data)
              info.name = d.name
              info.version = d.version
              info.desc = d.description
              info.metaData = d.metaData
              skills.push(info)
              cb()
            } catch(e) {
              cb(e)
            }
          }
        })
      }
    })
  }
}

loadAllSkillsMeta()

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/skills') return
    const i18n = api.intl.sync.i18n

    var prepend = h('div.PageHeading', [ h('h1', i18n('Skills')) ])

    return h('Scroller', { style: { overflow: 'auto' } }, [
      h('div.wrapper', [
        h('section.prepend', prepend),
        h('section.Skills', map(skillInfo, to_card_1)),
      ])
    ])

    function to_card_1(skill) {
      let card = [
        h('h2',[
          when(skill.pic,
            h("img", { src: skill.pic }),
            h("span", "")
          ),
          h('a',{
            'href':`https://github.com/everlifeai/${skill.name}`
          },skill.name)
        ]),
        h(".desc", skill.desc),
        h(".version", [
          h("span", "ver: "),
          h("span.number", skill.version),
        ]),
      ]
      let clickToSet = h('div', {
        style: {
          "position": "absolute",
          "right": "10px",
          "bottom": "10px",
          "font-size": "2em",
          "color": "#286bc3",
          "border": "2px solid #ffffff",
          "border-radius": "1em",
          "width": "1em",
          "height": "1em",
          "text-align": "center",
          "box-shadow": "inset 0px 0px 1px black",
        }
      }, '*')
      if(skill.metaData && skill.metaData.authRequired){
        return h('.card', {
          'style':{
            'cursor':'pointer',
            'position': 'relative',
          },
          'ev-click': ()=> showModal(skill)}, card.concat(clickToSet))
      } else {
        return h('.card', card)
      }
    }

    function showModal(skill ){
      api.pwd.savepwd(skill,()=>{})
    }
  })
}
