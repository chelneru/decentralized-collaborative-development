const readline = require('readline-sync');
const moment = require('moment');
const fs = require('fs');
const {generateKeyPairSync, publicEncrypt, privateDecrypt} = require('crypto');
const path = require("path");
const NodeRSA = require('node-rsa');
exports.GetInput = (message) => {
    return readline.question(message);
};

exports.InitializeConfig =  (repoPath, node, name, email) => {

    try {
        if (fs.existsSync(repoPath + '/config.json')) {
            //file exists
            return JSON.parse(fs.readFileSync(repoPath + '/config.json'));
        }
    } catch (err) {
        console.log('config file does not exist. Will create a new one.',err);
        let config = {};
        name = 'Alin'; //TODO add on register to retrieve name
        email = 'alin.panainte95@gmail.com'; //TODO add on register to retrieve email
        // config.name = this.GetInput("Insert the name:\n");
        config.name = name;
        config.email = email;
        config.created_at = moment().format();
        config.auth_token = null;
        config.public_hash = null;
        config.main_folder_addr = null;
        config.git_module_addr = null;
        node.config = config;
        fs.writeFile(repoPath + '/config.json', JSON.stringify(config), function (err) {
            if (err) {
                return console.log('Error creating ', repoPath + '/nodeinfo', ':', err);
            }
        });
        return config;
    }

};
/*
* TODO This file will be encrypted with ipfs node's public key
* */
exports.InitializeNodeInfo = async (repoPath, node) => {
    try {
        if (await fs.exists(repoPath + '/nodeinfo')) {
            //file exists so we return it instead
            // console.log('node info file exists.');
            fs.readFile(repoPath + '/nodeinfo', function read(err, data) {
                if (err) {
                    throw err;
                }
                const content = data.toString();
                return JSON.parse(content);
            });
        }
    } catch (err) {
        // console.log('node info file does not exist. Will create a new one.');
        let other_nodes = [];
        await fs.writeFile(repoPath + '/nodeinfo', JSON.stringify(other_nodes), function (err) {
            if (err) {
                return console.log('Error creating ', repoPath + '/nodeinfo', ':', err);
            }
        });
        return other_nodes;
    }
};
exports.UpdateOtherNodeInfo = async (nodeInfo, repoPath, node) => {
    try {
        console.log('updating nodeinfo file. at repopath: ',repoPath);
        if (await fs.exists(repoPath + '/nodeinfo')) {
            //file exists
            if (Array.isArray(nodeInfo)) {
                nodeInfo.forEach(function (element) {
                    let index = self.other_nodes.findIndex(i => i.id === element.id);
                    if (index !== -1) {
                        node.other_nodes[index] = element;
                    } else {
                        node.other_nodes.push(element);

                    }
                });
            } else {
                let index = self.other_nodes.findIndex(i => i.id === nodeInfo.id);

                if (index !== -1) {
                    node.other_nodes[index] = nodeInfo;
                } else {
                    node.other_nodes.push(nodeInfo);

                }
            }
            fs.writeFile(repoPath + '/nodeinfo', JSON.stringify(node.other_nodes), function (err) {
                if (err) {
                    return console.log(err);
                }
            });
        }
    } catch (err) {
        console.log('node info file does not exist. Cannot add other node info.');
    }
    return node.other_nodes;

};

exports.StoreTokens = (tokenType, accessToken, refreshToken, repoPath, node) => {

    node.config.tokens.push({
        type: tokenType, access: accessToken, refresh: refreshToken
    });
    this.UpdateConfig(repoPath, node);
};

exports.UpdateConfig = async (repoPath, node) => {
    if (node.config !== undefined) {
        fs.writeFile(repoPath + '/config.json', JSON.stringify(node.config), function (err) {
            if (err) {
                return console.log(err);
            }
        });
    }
};
exports.ReadConfigFile = (repoPath) => {

    try {
        return JSON.parse(fs.readFileSync(repoPath + '/config.json', 'utf8'));
    } catch (err) {
        console.log('Error reading config file', err.toString());
        return null;
    }
};
/*
//TODO Incomplete not working
* */
exports.encryptString = async function (node, toEncrypt) {
    let p2pcrypto = require("libp2p-crypto");
    let NodeRSA = require("node-rsa");

    let node_id_info = await node.id();
    var encryptBuffer = Buffer.from(toEncrypt);
    let publicKey = node_id_info.publicKey;
    let buf = Buffer.from(publicKey, 'base64');

    return publicEncrypt(publicKey, encryptBuffer)

};
/*
//TODO Incomplete not working
* */
exports.decryptString = async function (node, toDecrypt) {

// Note: `node` is an ipfs node set up like so:
// const node = new IPFS();
    let node_config = await node.config.get();
    let privateKey = node_config.Identity.PrivKey;
    var decryptBuffer = Buffer.from(toDecrypt.toString("base64"), "base64");
    var decrypted = privateDecrypt(privateKey, decryptBuffer);
    return decrypted.toString();
};
