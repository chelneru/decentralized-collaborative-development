"use strict";

const IPFS = require('ipfs');
const helpers = require('../misc/helpers');
const fs = require('fs');

import os from 'os';

const Protector = require('libp2p-pnet');
const app = require('../../app');
const swarmKeyPath = os.homedir() + '/.ipfs/swarm.key';

class IpfsSystem {

    constructor(test) {

    }

    async initialize(options) {
        if (options === undefined) {
            options = {
                config: {
                    bootstrap: []
                }
            };
        }
        let swarm_key = fs.readFileSync(swarmKeyPath);
        options.libp2p = {
            modules: {
                connProtector: new Protector(swarm_key)
            }
        };
        this.node = await IPFS.create(options);
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
        this.id = await this.node.id();
        console.log('node info', this.id);
        this.addresses = this.id.addresses;
        this.id = this.id.id;
        console.log('Node id is ', this.id);
        return this;
    }

    static async create(options) {
        const o = new IpfsSystem();
        await o.initialize(options);
        return o;
    }

    async GetRepoInfo() {
        return await this.node.repo.stat();
    }

    async AddFile(path, file_contents) {

        for await (const file of await this.node.add({
            path: path,
            content: file_contents
        })) {
            return file;
        }

    }

    async GetFileInfo(path) {

        for await (const file of await this.node.get(path)) {
            return file;
        }
    }

    async PublishMainFolder() {
        let peer = this.node;
        let repoPath = this.repoInfo;
        let result = null;
        try {
            await this.node.files.rm('/main_folder', {recursive: true});
        } catch (e) {
            console.log('Error removing', e.toString());
        }
        try {
            await this.node.files.mkdir('/main_folder');
        } catch (e) {
            console.log('Error publishing', e.toString());
        }
        result = await peer.files.stat('/main_folder');
        let name_result = await peer.name.publish(result.cid.toString());
        console.log(JSON.stringify(name_result));
        app.locals.config.main_folder_addr = name_result.name;
        helpers.UpdateConfig(repoPath);
    }

    async GetMainFolderAddr() {
        for await (const file of await this.node.name.resolve(app.locals.config.main_folder_addr)) {
            return file;
        }
    }

    async GetAllFiles() {
        let ipfs_path = '/ipfs/' + this.id + '/hello-world.txt';

        for await (const file of await this.node.ls(ipfs_path)) {
            return file;
        }
    }

    async GetPeers() {
        for await (const file of await this.node.swarm.addrs()) {
            return file;
        }
    }

    async GetConnectedPeers() {
        for await (const file of await this.node.swarm.peers()) {
            return file;
        }
    }

    async GetBootstrapList() {
        return await this.node.bootstrap.list();
    }

    async AddBootstrapPeer(addr) {
        return await this.node.bootstrap.add(addr);
    }

}

module.exports = IpfsSystem;