var express = require('express');
var router = express.Router();
const p2pinterface = require('../app/p2p-system/interface')
const framework = require('../app/misc/framework');
const helpers = require('../app/misc/helpers');
/* GET home page. */
router.post('/initial-info', async (req, res) => {

    let ipfsNode = global.node;
    let node_id = "";
    let projectName = "";
    let localAddrsString = [];
    let swarmKeyContents = p2pinterface.GetSwarmKeyContents(global.projectInfo);
    if (ipfsNode !== undefined && global.projectInfo !== undefined) {
        localAddrsString = await helpers.PrepareMultiAddresses(ipfsNode.node);
        node_id = ipfsNode.id;
        projectName = global.projectInfo.name;
    }
    res.json({
        peer_id: node_id,
        localAddrs: JSON.stringify(JSON.stringify(localAddrsString)),
        project_name: projectName,
        swarmKeyContents: swarmKeyContents
    });

});

router.post('/info', async (req, res) => {
    let swarm_peers = "";
    let ipfsNode = global.node;
    if(ipfsNode !== undefined ) {
    swarm_peers = await ipfsNode.GetConnectedPeers();
    }
    else {
        swarm_peers = 0;
    }
    res.json({
        swarm_peers: swarm_peers
    });

});
router.post('/get-swarm-key', async (req, res) => {
    let projectId = req.body.project_id;
    let projectIndex = global.appConfig.projects.findIndex(i => i.id == projectId);
    if (projectIndex >= 0) {
        let projectInfo = global.appConfig.projects[projectIndex];
        let swarmKeyContents = p2pinterface.GetSwarmKeyContents(projectInfo);
        return res.json({status: true, content: swarmKeyContents});

    } else {
        return res.json({status: false, content: null});

    }
});

router.post('/publish-repo', async (req, res) => {
    let projectId = req.body.project_id;
    let projectIndex = global.appConfig.projects.findIndex(i => i.id == projectId);
    if (projectIndex >= 0) {
        let projectInfo = global.appConfig.projects[projectIndex];
        await framework.PublishLocalRepository(global.projectInfo);

        return res.json({status: true, message: "success"});

    } else {
        return res.json({status: false, message: "project not found"});

    }

});

router.post('/update-repo', async (req, res) => {
    let projectId = req.body.project_id;
    let projectIndex = global.appConfig.projects.findIndex(i => i.id == projectId);
    if (projectIndex >= 0) {
        let projectInfo = global.appConfig.projects[projectIndex];

        await framework.SyncronizeRepository(global.ProjectInfo);

        return res.json({status: true, message: "success"});

    } else {
        return res.json({status: false, message: "project not found"});

    }

});

module.exports = router;
