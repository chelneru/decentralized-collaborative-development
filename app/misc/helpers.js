const readline = require('readline-sync');
const moment = require('moment');
const fs = require('fs');
const {generateKeyPairSync, publicEncrypt, privateDecrypt} = require('crypto');
const path = require("path");
const NodeRSA = require('node-rsa');
exports.GetInput = (message) => {
    return readline.question(message);
};

exports.InitializeConfig = (repoPath, node, name, email) => {

    try {
        if (fs.existsSync(repoPath + '/config.json')) {
            return JSON.parse(fs.readFileSync(repoPath + '/config.json').toString());
        }
        else {
            let config = {};
            name = 'Alin'; //TODO add on register to retrieve name
            email = 'alin.panainte95@gmail.com'; //TODO add on register to retrieve email
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
                    return console.log('Error creating ', repoPath + '/config.json', ':', err);
                }
            });
            return config;
        }
    } catch (err) {
        console.log('Error checking config file: ', err);

    }

};
/*
* TODO This file will be encrypted with ipfs node's public key
* */
exports.InitializeNodeInfo = async (repoPath, node) => {
    try {
        if (fs.existsSync(repoPath + '/nodeinfo')) {
            //file exists so we return it instead
            let data = fs.readFileSync(repoPath + '/nodeinfo');
            return JSON.parse(data.toString());
        }
        else {
            let other_nodes = [];
            fs.writeFile(repoPath + '/nodeinfo', JSON.stringify(other_nodes), function (err) {
                if (err) {
                    console.log('Error creating ', repoPath + '/nodeinfo', ':', err);
                }
            });
            return other_nodes;
        }
    } catch (err) {
        console.log('Error checking file ' + repoPath + '/nodeinfo : ',err);

    }
};

exports.UpdateNodeInfoFile = async ( repoPath, node) => {
    try {
        if (fs.existsSync(repoPath + '/nodeinfo')) {
            fs.writeFile(repoPath + '/nodeinfo', JSON.stringify(node.other_nodes), function (err) {
                if (err) {
                    console.log('unable to update nodeinfo file: ' + err);
                }
            });
        }
    } catch (err) {
        console.log('unable to update nodeinfo file: ' + err);
    }
};
exports.UpdateOtherNodeInfo = async (nodeInfo, repoPath, node) => {
    try {
        if (fs.existsSync(repoPath + '/nodeinfo')) {
            //file exists
            if (Array.isArray(nodeInfo)) {
                nodeInfo.forEach(function (element) {
                    let index = node.other_nodes.findIndex(i => i.id === element.id);
                    if (index !== -1) {
                        element.other_nodes[index].updatedAt = moment().format('MM DD YYYY, h:mm:ss a');
                        element.createdAt = node.other_nodes[index].created_at;
                        node.other_nodes[index] = element;
                        node.other_nodes[index].updatedAt = moment().format('MM DD YYYY, h:mm:ss a');
                    } else {
                        element.createdAt = moment().format('MM DD YYYY, h:mm:ss a');
                        element.updatedAt = moment().format('MM DD YYYY, h:mm:ss a');

                        node.other_nodes.push(element);

                    }
                });
            } else {
                let index = node.other_nodes.findIndex(i => i.id === nodeInfo.id);

                if (
                    index !== -1) {
                    nodeInfo.updatedAt = moment().format('MM DD YYYY, h:mm:ss a'); // 04 16th 2020, 3:07:31 pm
                    node.other_nodes[index] = nodeInfo;

                } else {
                    nodeInfo.createdAt = moment().format('MM DD YYYY, h:mm:ss a'); // 04 16th 2020, 3:07:31 pm
                    nodeInfo.updatedAt = moment().format('MM DD YYYY, h:mm:ss a'); // 04 16th 2020, 3:07:31 pm

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
        console.log('node info file ' + repoPath + '/nodeinfo' + ' does not exist. Cannot add other node info: ' + err);
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
                return console.log('Error updating config file:', err);
            }
        });
    }

};
exports.isEmptyObject = function (obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            return false;
        }
    }

    return JSON.stringify(obj) === JSON.stringify({});
}
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
