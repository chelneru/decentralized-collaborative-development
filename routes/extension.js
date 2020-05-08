const express = require('express');
let router = express.Router();
const framework = require('../app/misc/framework');
const path = require('path');
const p2pinterface = require('../app/p2p-system/interface')

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

router.post('/publish-shared-data', async (req, res) => {
    let extensionName = req.body.name;
    let extensionData = req.body.data;
    let result = p2pinterface.PublishSharedData(global.projectInfo,extensionName,extensionData);
    return res.json(result);
});

router.post('/retrieve-shared-data', async (req, res) => {

    let result = p2pinterface.RetrieveSharedData(global.projectInfo);
    return res.json(result);
});

router.post('/publish-data', async (req, res) => {
    let extensionName = req.body.name;
    let extensionDataPath = req.body.path;
    let result = await framework.PublishExtensionData(global.projectInfo,extensionName,extensionDataPath);
    return res.json(result);
});

router.post('/update-data', async (req, res) => {
    let extensionName = req.body.name;
    let extensionDataPath = req.body.path;
    let result = await  framework.RetrieveExtensionData(global.projectInfo,extensionName,extensionDataPath);
    return res.json(result);
});
module.exports = router;
