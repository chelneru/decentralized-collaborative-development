const express = require('express');
let router = express.Router();
const framework = require('../app/misc/framework');
const p2pinterface = require('../app/p2p-system/interface')

/* GET home page. */

router.post('/identity', async (req, res) => {
    let identity = global.identity;
    let index = global.projectInfo.modules.findIndex(i => i.name === req.body.name);
    let config = global.projectInfo.modules[index];
    identity.projectPath = global.projectInfo.localPath;
    identity.name = global.appConfig.user.name;
    identity.is_author = framework.IsAuthor(global.projectInfo);
    return res.json({status: true, identity: identity, config: config});

});

router.post('/update-config', async (req, res) => {
    let moduleIndex = global.projectInfo.modules.findIndex(i => i.name === req.body.config.name);
    let projectIndex = global.appConfig.projects.findIndex(i => i.id === global.projectInfo.id);

    global.appConfig.projects[projectIndex].modules[moduleIndex] = req.body.config;
    framework.SaveAppConfig();
    return res.json({status: true});

});

router.post('/publish-shared-data', async (req, res) => {
    let extensionName = req.body.name;
    let extensionData = req.body.data;
    let result = p2pinterface.PublishSharedData(global.projectInfo, extensionName, extensionData);
    return res.json(result);
});

router.post('/retrieve-shared-data', async (req, res) => {

    return res.json(await p2pinterface.RetrieveSharedData(global.projectInfo));
});

router.post('/publish-data', async (req, res) => {
    let extensionName = req.body.name;
    let data = null;
    let module = global.projectInfo.modules.find(i => i.name === extensionName);
    if (module !== undefined) {
        if (module.dbContent === "ipfsHashes") {
            data = {};
            data.extensionPath = req.body.path;
            data.folderName = req.body.folder;
        } else if (module.dbContent === "customData") {
            data = req.body.data;

        }
        try {
            let result = await framework.PublishExtensionData(global.projectInfo, extensionName, data);
            return res.json(result);

        } catch (e) {
            console.log('Error publishing data for extension ' + extensionName + ' :' + e.toString());
        }
        return res.json(result);
    } else {
        return res.json({status: false, message: "Module not found"});
    }
});

router.post('/update-data', async (req, res) => {
    let extensionName = req.body.name;
    let data = null;
    let module = global.projectInfo.modules.find(i => i.name === extensionName);
    if (module !== undefined) {
        if (module.dbContent === "ipfsHashes") {
            data = {};
            data.extensionPath = req.body.path;
            data.folderName = req.body.folder;
        } else if (module.dbContent === "customData") {
            data = req.body.data;
        }
        try {
            let result = await framework.RetrieveExtensionData(global.projectInfo, extensionName, data);
            return res.json(result);

        } catch (e) {
            console.log('Error retrieving data for extension ' + extensionName + ': ' + e.toString())
        }
        return res.json(result);
    } else {
        return res.json({status: false, message: "Module not found"});
    }
});
module.exports = router;
