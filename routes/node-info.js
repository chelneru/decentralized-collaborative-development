var express = require('express');
var router = express.Router();
const p2pinterface = require('../app/p2p-system/interface')
const framework = require('../app/misc/framework');
/* GET home page. */
router.post('/info', async (req, res) => {

    let ipfsNode = global.node;
    let node_id = "";
    let swarm_peers = "";
    let localAddrsString = [];
    let projectName = "";
    let swarmKeyContents = p2pinterface.GetSwarmKeyContents(global.projectInfo);
    if (ipfsNode !== undefined && global.projectInfo !== undefined) {
        node_id = ipfsNode.id;
        swarm_peers = await ipfsNode.GetConnectedPeers();
        for (let addrs of ipfsNode.localAddrs) {
            localAddrsString.push(addrs.toString() + '/ipfs/' + ipfsNode.id);
        }
        projectName = global.projectInfo.name;
    }   
    res.json({
        peer_id: node_id,
        swarm_peers: swarm_peers,
        localAddrs: JSON.stringify(JSON.stringify(localAddrsString)),
        project_name: projectName,
        swarmKeyContents:swarmKeyContents
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
        await framework.PublishLocalRepository(projectInfo);

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
        // try {
        await framework.SyncronizeRepository(projectInfo);
        // }
        // catch (e) {
        //     return res.json({status: false, message: "error in publishing the repo:"+e.toString()});
        // }
        return res.json({status: true, message: "success"});

    } else {
        return res.json({status: false, message: "project not found"});

    }

});

module.exports = router;
