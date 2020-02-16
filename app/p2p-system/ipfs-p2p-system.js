const ipfsClient = require("ipfs-http-client");
const helpers = require('../misc/helpers');
var app = require('../../app');
class IpfsSystem {

    async Init(test) {
        this.node = ipfsClient('http://localhost:5012');
        //subscribe to the pubsub
        const topic = 'peer-general';
        const receiveMsg = (msg) => console.log(msg.data.toString());
        await this.node.pubsub.subscribe(topic, receiveMsg);
        //get repo info
        this.repoInfo = await this.node.repo.stat();
        this.repoInfo = this.repoInfo.repoPath;
        //initialize config file
        if (app.locals.config === undefined) {
            helpers.InitializeConfig(this.repoInfo);
        }

        return this;
    }

    async GetRepoInfo() {
        return await this.node.repo.stat();
    }

    AddFile(path, file) {
        try {
            return this.node.files.write(path, file, {create: true, parents: true});
        } catch (e) {
            console.log('Error occurred while writing a file', e)
        }
    }

    async GetFileInfo(path) {
        return this.node.files.stat(path);
    }

    async PublishMainFolder() {
        let peer = this.node;
        let repoPath = this.repoInfo;
        let  result = null;
        try {
        await this.node.files.rm('/main_folder', { recursive: true });
        result = await this.node.files.mkdir('/main_folder');
        }catch (e) {
            console.log('Error publishing', e.toString());
        }
        result = await peer.files.stat('/main_folder');
        let name_result = await peer.name.publish(result.cid.toString());
        app.locals.config.main_folder_addr = name_result.name;
        helpers.UpdateConfig(repoPath);
    }

    async GetAllFiles() {
        return await this.node.ls();
    }

    GetPeers() {
        return this.node.swarm.addrs();
    }

    GetConnectedPeers() {
        return this.node.swarm.peers();
    }

}

module.exports = IpfsSystem;