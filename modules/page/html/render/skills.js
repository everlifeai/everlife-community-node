var { h, Array: MutantArray, map, when } = require('mutant')
var nest = require('depnest')
var packageInfo = require('../../../../package.json')
const cote = require('cote')({statusLogsEnabled:false})
var u = require('elife-utils');

var themeNames = Object.keys(require('../../../../styles'))

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'pwd.savepwd': 'first',
  'skills.obsSkillInfo': 'first',
  'skills.loadMetaInfo': 'first',
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/skills') return
    const i18n = api.intl.sync.i18n
    var skillInfo = api.skills.obsSkillInfo()
    api.skills.loadMetaInfo()

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
