const express = require('express');
let router = express.Router();
const framework = require('../app/misc/framework');
const path = require('path');

/* GET home page. */

router.post('/identity', async (req, res) => {
    let identity = global.identity;
    let index = global.projectInfo.modules.findIndex(i => i.name === req.body.name);
    let config = global.projectInfo.modules[index];
    identity.projectPath = global.projectInfo.localPath;
    identity.name = global.appConfig.user.name;
    return res.json({status:true,identity: identity, config: config});

});

router.post('/update-config', async (req, res) => {
    let moduleIndex = global.projectInfo.modules.findIndex(i => i.name === req.body.config.name);
    let projectIndex = global.appConfig.projects.findIndex(i => i.id === global.projectInfo.id);

    global.appConfig.projects[projectIndex].modules[moduleIndex] = req.body.config;
    framework.SaveAppConfig();
    return res.json({status:true});

});

module.exports = router;
