"use strict";

const IPFS = require('ipfs');
const helpers = require('../misc/helpers');
const fs = require('fs');
const path = require('path');
const Protector = require('libp2p/src/pnet');
const ipfsClient = require('ipfs-http-client');
const os = require('os');
const moment = require('moment');
const OrbitDB = require('orbit-db');
const delay = require('delay');
const general_topic = 'peer-general';
let folder_path = '/main_folder';

const app = require('../../app');
const swarmKeyPath = os.homedir() + '/swarm.key';

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
            if (private_network === true) {
                options = {
                    config: {
                        bootstrap: []
                    }
                };
            }
        }
        // options.API = '/ip4/127.0.0.1/tcp/5012';
        // options.Gateway = '/ip4/127.0.0.1/tcp/9191';
        let swarm_key = fs.readFileSync(swarmKeyPath);
        options.EXPERIMENTAL = {
            pubsub: true
        };
        options.silent = true; //disable console cluttering

        options.libp2p = {};
        // options.libp2p = {
        //     config: {
        //         dht: {
        //             enabled: true
        //         }
        //     }
        // };


        if (private_network === true) {
            options.libp2p.modules = {
                connProtector: new Protector(swarm_key)
            };
        }
        let ipfsInstance = await IPFS.create(options);

            const orbitdb = await OrbitDB.createInstance(ipfsInstance, {path: os.homedir() + '/.jsipfs'});

            return {ipfsInstance: ipfsInstance, dbInstance: orbitdb};

    }


    async CreateIPFSNode(options, private_network) {
        this.other_nodes = [];
        let result = await this.createJsClient(options, private_network);
        this.node = result.ipfsInstance;
        this.db = result.dbInstance;

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
                    case 'new_node_repo_addr':
                        console.log('received new node ', res.id, ' need to respond.');
                        self.other_nodes = await helpers.UpdateOtherNodeInfo({
                            id: res.id,
                            name: res.name,
                            email: res.email,
                            folders: res.folders
                        }, self.repoInfo, self);
                        //reply with self info

                        let sendObject = {
                            id: self.id,
                            name: self.config.name,
                            email: self.config.email,
                            status: 'response_new_node_repo_addr',
                            folders: self.config.folders.map(f => {
                                return {
                                    folderName: f.folderName,
                                    ipnsName: f.ipnsName,
                                    mDate: f.mDate
                                };
                            })
                        };
                        let message = JSON.stringify(sendObject);
                        await self.node.pubsub.publish(general_topic, Buffer.from(message), (err) => {
                            if (err) {
                                console.error('error publishing: ', err)
                            } else {
                                console.log('successfully published message')
                            }
                        });
                        break;
                    case 'response_new_node_repo_addr':
                        console.log('received new node ', res.id, ', no need to respond.');
                        self.other_nodes = await helpers.UpdateOtherNodeInfo({
                            id: res.id,
                            name: res.name,
                            email: res.email,
                            folders: res.folders
                        }, self.repoInfo, self);
                        break;
                    case 'remove_node_repo_addr':
                        console.log('removed node node ');
                        //TODO
                        break;
                    case 'announce_folder':
                        console.log('received folder announce');
                        let nodeIndex = self.other_nodes.findIndex(i => i.id === res.id);
                        let folderIndex = self.other_nodes[nodeIndex].folders.findIndex(i => i.folderName === res.folderName);
                        self.other_nodes[nodeIndex].folders[folderIndex].ipnsName = res.newIpns;
                        helpers.UpdateNodeInfoFile(self.repoInfo, self);
                        break;
                }
            } else {
                // log self messages
                let res = JSON.parse(msg.data);
                console.log('self: ', res.status);
            }

        };
        try {
            await this.node.pubsub.subscribe(general_topic, receiveMsg);
            console.log("\x1b[33m", self.id, ' subscribed to ', general_topic, "\x1b[0m")
        } catch (e) {
            console.log('Subscribe error : ', e.toString());
        }
        //display swarm addresses
        this.localAddrs = await this.node.swarm.localAddrs();
        //get repo info
        this.repoInfo = await this.node.repo.stat();
        this.repoInfo = this.repoInfo.repoPath;
        //initialize config file
        if (this.config === undefined) {
            this.config = await helpers.InitializeConfig(this.repoInfo, this);
        }
        this.other_nodes = await helpers.InitializeNodeInfo(this.repoInfo, this);
        this.config.folders = await this.node.files.ls('/');
        if (helpers.isEmptyObject(this.config.folders)) {
            this.config.folders = [];
        }
        await this.CreateMainFolder();
        let selfNode = this;
        this.node.libp2p.on('peer:connect', async (peer) => {
            // await selfNode.node.swarm.connect(peer.multiaddrs._multiaddrs[0]+'/ipfs/'+peer.id.id);
            let swarm_peers = await selfNode.GetConnectedPeers();
            console.log('swarm peers ', JSON.stringify(swarm_peers));
            if (swarm_peers.length > 0) {
                let message = JSON.stringify({
                    id: selfNode.id,
                    name: selfNode.config.name,
                    email: selfNode.config.email,
                    status: 'new_node_repo_addr',
                    folders: selfNode.config.folders
                });
                setTimeout(async function () {
                    let topic_peers = await selfNode.node.pubsub.peers(general_topic);
                    console.log('general topic peers ', JSON.stringify(topic_peers));
                    if (topic_peers.length > 0) {
                        await selfNode.node.pubsub.publish(general_topic, Buffer.from(message), (err) => {
                            if (err) {
                                console.error('error publishing: ', err)
                            } else {
                                console.log('successfully published message')
                            }
                        });
                        console.log(selfNode.id, ' sent message', message);
                    }


                }, 3000)

            }
        });
        return this;
    }

    static
    async create(options, private_network) {
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

    async AddFolder(pathString, parentString) {
        let self = this;
        let watcher = fs.watch(pathString);
        // track changes
        watcher.on('change', function name(event, filename) {
            self.UpdateFolder(pathString);
        });

        let folderStat = fs.lstatSync(pathString);
        let folderName = path.basename(pathString);
        console.log('creating folder ', folderName);
        if (folderStat.isFile()) {
            throw new Error('path leads to a file and not a folder');
        }
        //create folder
        try {
            if (parentString === '') {
                await this.node.files.mkdir('/' + folderName, {parents: true});
            } else {
                await this.node.files.mkdir(parentString + '/' + folderName);
            }
        } catch (e) {
            console.log('Error creating folder on IPFS: ', e.toString());
        }
        //add all contents
        fs.readdirSync(pathString, function (err, files) {
            //handling error
            if (err) {
                return console.log('Unable to scan directory: ' + err);
            }
            //listing all files using forEach
            // console.log('listing all files from folder ',folderName);
            files.forEach(async function (file) {
                // Do whatever you want to do with the file
                let fileStat = fs.lstatSync(pathString + '/' + file);
                if (fileStat.isFile()) {
                    console.log(file, ' is a file');
                    fs.readFileSync(pathString + '/' + file, async (err, data) => {
                        if (err) {
                            console.error(err);
                            return
                        }
                        await self.AddFile(parentString + '/' + folderName + '/' + file, data);
                        // console.log('contents for file ',file,' is ',data);
                    })
                } else {
                    console.log(file, ' is a folder');
                    await self.AddFolder(pathString + '/' + file, '/' + folderName + '/');
                }
            });
        });
        if (parentString === '') {
            //this is the initial call
            let res = await this.node.files.stat('/' + folderName);
            let pub_res = await this.node.name.publish(res.cid.toString());
            console.log('folder ', folderName, ' published at ', pub_res.name);
        }
    }

    async GetFileInfo(path) {

        for await (const file of await this.node.get(path)) {
            return file;
        }
    }

    async GetFolderInfo(path) {

        for await (const file of await this.node.get(path)) {
            return file;
        }
    }

    async CreateMainFolder() {
        let repoPath = this.repoInfo;
        let self = this;
        try {
            //first we check locally
            if (fs.existsSync(repoPath + '/MainFolder')) {
                //now we check if we have it on IPFS
                let index = this.config.folders.findIndex(i => i.folderName === 'MainFolder');
                if (index === -1) {
                    //folder exists locally but its not in the node config
                    for await (const ipfs_add_res of await self.node.add(repoPath + '/MainFolder', {recursive: true})) {
                        let publish_res = await self.node.name.publish(ipfs_add_res.cid.toString());
                        self.config.main_folder_addr = publish_res.name;
                        await self.StoreFolderName(self.config.main_folder_addr, 'MainFolder', false, repoPath + '/MainFolder');
                        await helpers.UpdateConfig(repoPath, self);
                    }

                }
            } else {
                try {
                    fs.mkdir(repoPath + '/MainFolder', async function (err) {
                        if (err) {
                            console.log('Error creating ', repoPath + '/MainFolder :', err);
                        } else {
                            console.log('folder created.');

                            // folder has been created. We can publish it.
                            console.log('publishing folder....');

                            for await (const ipfs_add_res of await self.node.add(repoPath + '/MainFolder', {recursive: true})) {
                                let publish_res = await self.node.name.publish(ipfs_add_res.cid.toString());
                                self.config.main_folder_addr = publish_res.name;
                                await self.StoreFolderName(self.config.main_folder_addr, 'MainFolder', false, repoPath + '/MainFolder');
                                await helpers.UpdateConfig(repoPath, self);
                            }
                        }
                    });
                } catch (err) {
                    console.log('Error adding/publishing main folder: ', err.toString());
                }
            }
        } catch (err) {
            console.log('Error checking main folder: ', err.toString(), err.stack.toString);
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
        try {

            let file = await this.AddFile('hello2.txt', 'hello world!');
            console.log('Added file:', file);

            try {
                let value = '/ipfs/' + file.cid.toString();
                // await this.node.publish(value);
                console.log(value);
                let pub_res = await self.node.name.publish(value);
                console.log(' result for publishing', pub_res);
            } catch (e) {
                console.log('name publish error:', e.toString());
            }
        } catch (e) {
            console.log('name publish error:', e.toString());
        }
    }

    async PublishFile(cidHash) {

        let value = '/ipfs/' + cidHash.toString();
        try {
            let pub_res = await this.node.name.publish(value);
            console.log(pub_res.name);
            return pub_res.name;
        } catch (e) {
            console.log('name publish error:', e.toString());
            return null;
        }

    }

    async AnnounceFolder(nodeId, newIpns, folderName) {
        let message = JSON.stringify({
            id: nodeId,
            folderName: folderName,
            newIpns: newIpns,
            status: 'announce_folder',
        });
        await this.node.pubsub.publish(general_topic, Buffer.from(message), (err) => {
            if (err) {
                throw err;
            }

        });
    }

    /*this function will store a registry consisting of a folder name and an ipns name*/
    async StoreFolderName(ipnsName, folderName, isChanged, localPath) {
        this.config.folders.push({
            folderName: folderName,
            ipnsName: ipnsName,
            localPath: localPath,
            isChanged: isChanged,
            mDate: moment.now()
        });
        await helpers.UpdateConfig(this.repoInfo, this);
    }

    async UpdateFolder(folderPath) {
        let folderName = path.basename(folderPath);

        for await (const ipfs_add_res of await this.node.add(folderPath, {recursive: true})) {
            if (ipfs_add_res.hasOwnProperty('cid')) {
                try {
                    let pub_result = await this.node.name.publish(ipfs_add_res.cid.toString());
                    let index = this.config.folders.findIndex(i => i.folderName === folderName);
                    if (index !== -1) {
                        this.config.folders[index].ipnsName = pub_result.name;
                        this.config.folders[index].isChanged = true;
                        this.config.folders[index].mDate = moment.now();
                        return pub_result.name;
                    }
                } catch (err) {
                    console.log('Error publishing ', err.toString());
                    return null;
                }
            } else {
                console.log('Error adding folder ', JSON.stringify(ipfs_add_res));

            }
        }

    }


    InitiateFolderWatchers() {
        let self = this;
        for (let folderIter = 0; folderIter < this.config.folders.length; folderIter++) {
            let watcher = fs.watch(this.config.folders[folderIter].localPath);
            let folderName = this.config.folders[folderIter].folderName;
            // track changes
            let localPath = this.config.folders[folderIter].localPath;
            watcher.on('change', function name(event, filename) {
                self.UpdateFolder(localPath);
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

    StorePeerInfo(info) {
        this.config.peerInfo.push(info);
        helpers.UpdateConfig(this.repoInfo, this);
    }

    GeneratePeerInfo() {
        this.config = helpers.ReadConfigFile(this.repoInfo);

        let peer_info = {};
        peer_info.id = this.id;
        peer_info.folders = this.config.folders;

    }
}

module.exports = IpfsSystem;
