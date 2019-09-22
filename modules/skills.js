var { Value, Array: MutantArray } = require('mutant')
var u = require('elife-utils')
var fs = require('fs')
var path_ = require('path')

exports.gives = {
    skills: {
        loadMetaInfo: true,
        obsSkillInfo: true,
    }
}

exports.create = function(api) {

    var skillInfo = MutantArray([])

    /*    outcome/
     * We load all the internals skills that are prepackaged with the avatar
     * then load all skills that the user has downloaded. We also mark the
     * internal skills as internal so they are easy to distinguish.
     */
    function loadMetaInfo() {
        let internalSkills = path_.join(__dirname,'../services/elife-skill-mgr/skills')
        let externalSkills = u.skillLoc()

        let allSkills = []

        load_from_dir_1(internalSkills, (err, skills) => {
            if(err) console.error(JSON.stringify(err))
            else {

                for(let i = 0;i < skills.length;i++) skills[i].internal = true
                allSkills = skills

                load_from_dir_1(externalSkills, (err, skills) => {
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
    function load_from_dir_1(loc, cb) {
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

    return {
        skills: {
            loadMetaInfo,
            obsSkillInfo: () => skillInfo,
        }
    }
}

