"use strict";

const IPFS = require('ipfs');
const helpers = require('../misc/helpers');
const fs = require('fs');
const path = require('path');
const Protector = require('libp2p/src/pnet');
const ipfsClient = require('ipfs-http-client');
import os from 'os';

const delay = require('delay');
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
        options.API= '/ip4/127.0.0.1/tcp/5012';
        options.Gateway= '/ip4/127.0.0.1/tcp/9191';
        let swarm_key= fs.readFileSync(swarmKeyPath);
        options.EXPERIMENTAL = {
            ipnsPubsub: true
        };


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
        this.other_nodes = [];
        let self = this;
        // options.silent = true; //disable console cluttering
        // console.log(options);
        this.node = ipfsClient('/ip4/127.0.0.1/tcp/5001');
        // this.node = await IPFS.create(options);




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


        //display swarm addresses
        let localAddrs = await this.node.swarm.localAddrs();
        console.log('local addresses');
        let localAddrsString = "";
        for(let addrs of localAddrs) {
            localAddrsString +="\""+addrs.toString()+'/ipfs/'+this.id+"\",\n";
        }
        localAddrsString = localAddrsString.substring(0, localAddrsString.length - 2);
        console.log(localAddrsString);
        //get repo info
        this.repoInfo = await this.node.repo.stat();
        this.repoInfo = this.repoInfo.repoPath;
        //initialize config file
        if (app.locals.config === undefined) {
            helpers.InitializeConfig(this.repoInfo);
        }
        // await this.PublishMainFolder();
        //
        // this.node.libp2p.on('peer:connect', async peerInfo => {
        //
        //     let swarm_peers = await this.GetConnectedPeers();
        //
        //
        //     // console.log('swarm peers ', swarm_peers.length);
        //
        //
        //     if (swarm_peers.length > 1) {
        //         let message = JSON.stringify({
        //             id: this.id,
        //             status: 'new_node_repo_addr',
        //             repo_addr: this.main_folder_addr
        //         });
        //         await new Promise(resolve => setTimeout(resolve, 3000)); // 3 sec
        //
        //         let topic_peers = await this.node.pubsub.peers(general_topic);
        //         console.log('general topic peers ', topic_peers.length);
        //         await this.node.pubsub.publish(general_topic, message);
        //         console.log(this.id, ' sent message', message);
        //     }
        //
        // });

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
           file_contents,{create:true})) {
            console.log('added file ',JSON.stringify(file));
            return file;
        }

    }

    async AddFolder(pathString, parentString) {
        let self = this;
        let folderStat = fs.lstatSync(pathString);
        let folderName = path.basename(pathString);
        console.log('creating folder ', folderName);
        if (folderStat.isFile()) {
            throw new Error('path leads to a file and not a folder');
        }
        //create folder
        try {
            if (parentString === '') {
                await this.node.files.mkdir('/' + folderName, {parents:true});
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
            files.forEach( async function (file) {
                // Do whatever you want to do with the file
                let fileStat = fs.lstatSync(pathString + '/' + file);
                if (fileStat.isFile()) {
                    console.log(file, ' is a file');
                    fs.readFileSync(pathString + '/' + file, async(err, data) => {
                        if (err) {
                            console.error(err);
                            return
                        }
                        await self.AddFile( parentString+'/'+folderName+ '/' + file, data);
                        // console.log('contents for file ',file,' is ',data);
                    })
                } else {
                    console.log(file, ' is a folder');
                    await self.AddFolder(pathString + '/' + file, '/' + folderName + '/');
                }
            });
        });
        if(parentString === '') {
            //this is the initial call
            let res = await this.node.files.stat('/' + folderName);
            let pub_res = await this.node.name.publish(res.cid.toString());
            console.log('folder ',folderName,' published at ',pub_res.name);
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


            let pub_result = await this.node.name.publish(result.cid.toString())
            this.main_folder_addr = pub_result.name;
            app.locals.config.main_folder_addr = pub_result.name;
        } catch (e) {
            console.log('Error name publishing', e.toString());
        }

        helpers.UpdateConfig(repoPath);

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
                let value = '/ipfs/'+file.cid.toString();
                // await this.node.publish(value);
                console.log(value);
                let pub_res = await self.node.name.publish(value);
                console.log(' result for publishing',pub_res);
            } catch (e) {
                console.log('name publish error:', e.toString());
            }
        } catch (e) {
            console.log('name publish error:', e.toString());
        }
    }
}

module.exports = IpfsSystem;