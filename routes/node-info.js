var express = require('express');
var router = express.Router();
var app = express();
var cors = require('cors');

/* GET home page. */
router.post('/info', async (req, res) => {

    let ipfsNode = global.node;
    let folders = ipfsNode.config.folders;
    let main_folder = ipfsNode.config.main_folder_addr;
    console.log('current folders',JSON.stringify(folders));
    let node_id = ipfsNode.id;
    let swarm_peers = await ipfsNode.GetConnectedPeers();
    let localAddrsString = "";
    for (let addrs of ipfsNode.localAddrs) {
        localAddrsString += "\"" + addrs.toString() + '/ipfs/' + ipfsNode.id + "\",\n";
    }
    localAddrsString = localAddrsString.substring(0, localAddrsString.length - 2);
    let mounted_folders = ipfsNode.folders;

    res.json({peer_id: node_id, swarm_peers: swarm_peers, localAddrs: localAddrsString, folders: mounted_folders,main_folder:main_folder});

});


module.exports = router;
