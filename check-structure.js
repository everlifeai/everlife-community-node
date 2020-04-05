'use strict'
const path = require('path')
const fs = require('fs')
const shell = require('shelljs')
const u = require('@elife/utils')

const core_skills = ['eskill-about',
  'eskill-ai-artist',
  'eskill-coupon',
  'eskill-direct-message',
  'eskill-follower',
  'eskill-intro',
  'eskill-kb-creator',
  'eskill-nw',
  'eskill-vanity-address',
  'eskill-worker'
]

const skill_base_path = path.join(__dirname, 'services/elife-skill-mgr/skills')

if (!shell.which('git')) {
  shell.echo('Sorry, this script requires git')
  shell.exit(1)
}

/**
 * Remove non-core skills
 */

const available_skills = fs.readdirSync(skill_base_path)

for (let i = 0; i < available_skills.length; i++) {
  const skill = available_skills[i]
  if (!core_skills.includes(skill) ) {
    u.rmdir(path.join(skill_base_path, skill), (err) => {
      if (err) console.log(err)
    })
  }
}

/**
 * Clone all the core skills which is not exist 
 */
shell.cd(skill_base_path)
core_skills.forEach((skill)=>{
  if(!available_skills.includes(skill)){
    shell.exec(`git clone https://www.github.com/everlifeai/${skill}.git`)
  }
})
