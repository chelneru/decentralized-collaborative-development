"use strict";

const IPFS = require('ipfs');
const fs = require('fs');
const Protector = require('libp2p/src/pnet');
const ipfsClient = require('ipfs-http-client');
const generator = require('js-ipfs-swarm-key-gen');
const path = require('path');
const helpers = require('../misc/helpers');
const framework = require('../misc/framework');
const general_topic = 'peer-general';
const p2pinterface = require('../p2p-system/interface');
const pull = require('pull-stream');

class IpfsSystem {

    constructor(test) {

    }

    createHttpClient() {
        return ipfsClient('/ip4/127.0.0.1/tcp/5001');
    }

    async createJsClient(options, private_network) {

        if (private_network === true) {
            console.log('\x1b[36m%s\x1b[0m', 'Node initialized in private network.');
        } else {
            console.log('\x1b[36m%s\x1b[0m', 'Node initialized in public network.');
        }
        if (options === undefined) {
            options = {};

        }
        if (private_network === true) {
            options.config = {
                bootstrap: []
            };

        }
        if (options.bootstrap !== undefined) {
            options.config.bootstrap = options.bootstrap;
        }
        // options.API = '/ip4/127.0.0.1/tcp/5012';
        // options.Gateway = '/ip4/127.0.0.1/tcp/9191';
        if (!fs.existsSync(path.join(options.repo, 'swarm.key'))) {
            generator(path.join(options.repo, 'swarm.key')).then(() => console.log('swarm key generated'));
            await helpers.sleep(1000);
        }
        let swarm_key = fs.readFileSync(path.join(options.repo, 'swarm.key'));
        options.EXPERIMENTAL = {
            pubsub: true
        };
        options.silent = true; //disable console cluttering
        options.libp2p = {};
        options.libp2p = {
            config: {
                pubsub: {                     // The pubsub options (and defaults) can be found in the pubsub router documentation
                    enabled: true,
                    signMessages: true,         // if messages should be signed
                    strictSigning: true         // if message signing should be required
                }
            }
        };
        if (private_network === true) {
            options.libp2p.modules = {
                connProtector: new Protector(swarm_key)
            };
        }
        return await IPFS.create(options);


    }


    async CreateIPFSNode(options, private_network) {
        this.other_nodes = [];
        this.node = await this.createJsClient(options, private_network);

    }

    async initialize(options) {

        this.id_json = await this.node.id();
        this.addresses = this.id_json.addresses;
        this.id = this.id_json.id;

//subscribe to pubsub
        let self = this;

        const receiveMsg = async function (msg) {
            let res = JSON.parse(msg.data.toString());
            //ignore message from self
            if (msg.from !== self.id) {
                console.log('received message: ', res);
                switch (res.status) {
                    case 'project_info':
                        console.log('received project info');
                        framework.AddProjectIPFS(res.name, res.databases, res.modules);
                        //respond with orbit db info to become collaborator
                        let message = JSON.stringify({
                            status: 'project_info_response',
                            publicKey: global.orbit.identity.publicKey
                        });
                        await selfNode.node.pubsub.publish(general_topic, Buffer.from(message), (err) => {
                            if (err) {
                                console.error('error responding with database identity: ', err)
                            } else {
                                console.log('Responded with database identity.')
                            }
                        });
                        break;
                    case 'project_info_response':
                        await p2pinterface.AddDatabaseCollaborator(global.projectInfo.id, res.publicKey);

                }
            } else {
                // log self messages
                let res = JSON.parse(msg.data);
                console.log('self: ', res.status);
            }

        };
        try {
            await this.node.pubsub.subscribe(general_topic, receiveMsg);
            console.log("\x1b[33m", ' subscribed to ', general_topic, "\x1b[0m")
        } catch (e) {
            console.log('Subscribe error : ', e.toString());
        }
        //display swarm addresses
        this.localAddrs = await this.node.swarm.localAddrs();
        //get repo info
        this.repoInfo = await this.node.repo.stat();
        this.repoInfo = this.repoInfo.repoPath;

        let selfNode = this;
        this.node.libp2p.on('peer:connect', async (peer) => {
            // await selfNode.node.swarm.connect(peer.multiaddrs._multiaddrs[0]+'/ipfs/'+peer.id.id);
            let swarm_peers = await selfNode.GetConnectedPeers();
            console.log('swarm peers ', JSON.stringify(swarm_peers));
            if (swarm_peers.length > 0) {

                let message = JSON.stringify({
                    name: global.projectInfo.name,
                    modules: global.projectInfo.modules,
                    status: 'project_info',
                    databases: p2pinterface.GetCurrentProjectDatabases()
                });
                setTimeout(async function () {
                    let topic_peers = await selfNode.node.pubsub.peers(general_topic);
                    // console.log('general topic peers ', JSON.stringify(topic_peers));
                    if (topic_peers.length > 0) {
                        await selfNode.node.pubsub.publish(general_topic, Buffer.from(message), (err) => {
                            if (err) {
                                console.error('error sending project info: ', err)
                            } else {
                                console.log('Sent project info.')
                            }
                        });
                        console.log(selfNode.id, ' sent message', message);
                    }


                }, 3000)

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

        for await (const file of await this.node.files.write(
            path,
            file_contents, {create: true})) {
            console.log('added file ', JSON.stringify(file));
            return file;
        }

    }

    async GetFileInfo(path) {

        for await (const file of await this.node.get(path)) {
            return file;
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

    InitiateFolderWatchers() {
        let self = this;
        for (let folderIter = 0; folderIter < this.config.folders.length; folderIter++) {
            let watcher = fs.watch(this.config.folders[folderIter].localPath);
            let folderName = this.config.folders[folderIter].folderName;
            // track changes
            let localPath = this.config.folders[folderIter].localPath;
            watcher.on('change', function name(event, filename) {

                //..
            });
        }
    }

    async GetLatestRepoVersion(database, byAuthor) {
        const db = await this.db.eventlog(database);
        const repoHash = db.iterator({limit: 1})
            .collect()
            .map((e) => e.payload.value);
        await db.load();
    }
}

module.exports = IpfsSystem;
