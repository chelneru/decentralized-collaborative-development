"use strict";

const IPFS = require('ipfs');
const helpers = require('../misc/helpers');
const fs = require('fs');
const Protector = require('libp2p/src/pnet');
import os from 'os';

const delay = require('delay')
const general_topic = 'peer-general';
let folder_path = '/main_folder';

const app = require('../../app');
const swarmKeyPath = os.homedir() + '/swarm.key';

class IpfsSystem {

    constructor(test) {

    }

    async CreateIPFSNode(options, private_network) {
        if (options === undefined) {
            options = {};
            if (private_network === true) {
                options = {
                    config: {
                        bootstrap: []
                    }
                };
            }
        }
        let swarm_key = fs.readFileSync(swarmKeyPath);
        // options.EXPERIMENTAL = {
        //     ipnsPubsub: true
        // };
        options.libp2p = {
            config: {
                dht: {
                    enabled: true
                }
            }
        };

        if (private_network === true) {
            options.libp2p.modules = {
                connProtector: new Protector(swarm_key)
            };
        }
        this.other_nodes = [];
        let self = this;
        options.silent = true; //disable console cluttering
console.log(options);
        this.node = await IPFS.create(options);
        const receiveMsg = async function (msg) {
            // console.log(this.id, ' received message ', msg);
            let res = JSON.parse(msg.data);
            // console.log(res);
            let index = self.other_nodes.findIndex(i => i.id === res.id);

            switch (res.status) {
                case 'new_node_repo_addr':
                    console.log('received new node ');
                    if (index === -1) {
                        self.other_nodes.push({
                            id: res.id,
                            repo_addr: res.repo_addr
                        });
                    } else {
                        self.other_nodes[index] = {
                            id: res.id,
                            repo_addr: res.repo_addr
                        }
                    }
                    //reply with self info
                    let message = JSON.stringify({
                        id: this.id,
                        status: 'response_new_node_repo_addr',
                        repo_addr: this.main_folder_addr
                    });
                    await self.node.pubsub.publish(general_topic, message);
                    break;
                case 'response_new_node_repo_addr':
                    console.log('received new node ');
                    if (index === -1) {
                        self.other_nodes.push({
                            id: res.id,
                            repo_addr: res.repo_addr
                        });
                    } else {
                        self.other_nodes[index] = {
                            id: res.id,
                            repo_addr: res.repo_addr
                        }
                    }
                    break;
                case 'remove_node_repo_addr':
                    console.log('removed node node ');

                    if (index !== -1) {
                        this.other_nodes.splice(index, 1);
                    }
                    break;
            }


        };

        try {
            let res = await this.node.pubsub.subscribe(general_topic, receiveMsg);
            console.log('subscribe result ', res);

        } catch (e) {
            console.log('Subscribe error : ', e.toString());
        }

    }

    async initialize(options) {


        this.id_json = await this.node.id();
        this.addresses = this.id_json.addresses;
        this.id = this.id_json.id;
        folder_path = '/folder' + this.id;

        //get repo info
        this.repoInfo = await this.node.repo.stat();
        this.repoInfo = this.repoInfo.repoPath;
        //initialize config file
        if (app.locals.config === undefined) {
            helpers.InitializeConfig(this.repoInfo);
        }
        await this.PublishMainFolder();

        this.node.libp2p.on('peer:connect', async peerInfo => {

            let swarm_peers = await this.GetConnectedPeers();


            // console.log('swarm peers ', swarm_peers.length);


            if (swarm_peers.length > 1) {
                let message = JSON.stringify({
                    id: this.id,
                    status: 'new_node_repo_addr',
                    repo_addr: this.main_folder_addr
                });
                await new Promise(resolve => setTimeout(resolve, 3000)); // 3 sec

                let topic_peers = await this.node.pubsub.peers(general_topic);
                console.log('general topic peers ', topic_peers.length);
                await this.node.pubsub.publish(general_topic, message);
                console.log(this.id, ' sent message', message);
            }

        });

        return this;

    }

    static async create(options, private_network) {
        const o = new IpfsSystem();
        await o.CreateIPFSNode(options, private_network);
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
            await peer.files.mkdir(folder_path);
        } catch (e) {
            console.log('Error publishing', e.toString());
        }
        result = await peer.files.stat(folder_path);
        console.log('main folder address', result.cid.toString());
        try {

            let publish_value = result.cid.toString();

            this.main_folder_addr = publish_value;
            app.locals.config.main_folder_addr = publish_value;
        } catch (e) {
            console.log('Error name publishing', e.toString());
        }

        helpers.UpdateConfig(repoPath);

    }

    async GetMainFolderAddr() {
        try {
            return this.node.files.stat(folder_path);
        } catch (e) {
            console.log('main folder not found', e.toString());
            return null;
        }
    }

    async GetAllFiles() {
        let ipfs_path = '/ipfs/' + this.id + '/hello-world.txt';

        for await (const file of await this.node.ls(ipfs_path)) {
            return file;
        }
    }

    async GetSwarmPeers() {
        for await (const file of await this.node.swarm.addrs()) {
            return file;
        }
    }

    async GetConnectedPeers() {
        return await this.node.swarm.peers();
    }

    async GetBootstrapList() {
        return await this.node.bootstrap.list();
    }

    async AddBootstrapPeer(addr) {
        return await this.node.bootstrap.add(addr);
    }

    async PublishFileTest() {
let self = this;
        let filesAdded = this.AddFile('hello2.txt','hello world!').then(function (file) {
            console.log('Added file:', file,)
            try {
                let value = file.cid.toString();
                self.node.name.publish(value);
            }
            catch (e) {
                console.log('name publish error:',e.toString());
            }
        });


    }


}

module.exports = IpfsSystem;