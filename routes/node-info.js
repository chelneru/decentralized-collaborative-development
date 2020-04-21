var express = require('express');
var router = express.Router();
var app = express();
var cors = require('cors');

/* GET home page. */
router.post('/info', async (req, res) => {

    let ipfsNode = global.node;
    let folders = ipfsNode.config.folders;
    console.log('current folders',JSON.stringify(folders));
    let node_id = ipfsNode.id;
    let swarm_peers = await ipfsNode.GetConnectedPeers();
    let localAddrsString = "";
    for (let addrs of ipfsNode.localAddrs) {
        localAddrsString += "\"" + addrs.toString() + '/ipfs/' + ipfsNode.id + "\",\n";
    }
    localAddrsString = localAddrsString.substring(0, localAddrsString.length - 2);

    res.json({peer_id: node_id, swarm_peers: swarm_peers, localAddrs: localAddrsString, folders: folders});

});
//TODO make it work for multiple folders at once
router.post('/folder-announce', async (req, res) => {

    let ipfsNode = global.node;
    let index = this.config.folders.findIndex(i => i.folderName === res.folderName && i.ipnsName === res.ipnsName);

    if (index !== -1) {
        let folderLocalPath = ipfsNode.config.folders[index].localPath;
        try {
            let newIpns = ipfsNode.UpdateFolder(folderLocalPath);
            await ipfsNode.AnnounceFolder(newIpns, res.folderName);
            res.json({
                status: true
            });
        } catch (e) {
            res.json({
                status: false,
                message: 'error updating/announcing the folder:' + e.toString() + ' ' + e.stack.toString()
            });
        }


    } else {
        res.json({
            status: false,
            message: 'folder not found'
        });
    }


});



module.exports = router;
