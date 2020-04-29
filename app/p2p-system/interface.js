let IpfsSystem = require('./ipfs-p2p-system');
const fs = require('fs');
const OrbitDB = require('orbit-db');
const framework = require('../misc/framework');

exports.InitializeP2PSystem = async (projectInfo, p2psystem) => {
    switch (p2psystem) {
        case 'ipfs':
            global.node = await IpfsSystem.create({repo:projectInfo.localPath},true);
            console.log('\x1b[33m%s\x1b[0m','node ', global.node.id,' is set');
            break;
    }
}

exports.InitializeOrbitInstance = async (projectPath) => {
    global.orbit = await OrbitDB.createInstance(global.node.node,{directory:projectPath});
    console.log('Orbit initialized.')
}

exports.CreateDatabase = async (purpose,projectId) =>{

    let db = null;
    let index = null;
    switch (purpose) {
        case 'users':
            db = await global.orbit.create('network.users','eventlog',
                {
                    accessController: {
                        write: [
                            // Give access to ourselves
                            global.orbit.identity.id,
                            //todo Give access to other peers
                        ]
                    }}
            );
            //save db info in the project config
            index = global.appConfig.projects.findIndex(i => i.id === projectId);
            global.appConfig.projects[index].usersDB = db.identity;
            global.appConfig.projects[index].usersDB.address = db.address.toString();
            global.appConfig.projects[index].usersDB.toJSON = null; //the toJSON() functions does not include the address field . So using JSON.stringify would not include that field

            framework.SaveAppConfig();
            break;
        case 'repository':
            db = await global.orbit.create('network.users','keyvalue',
                {
                    accessController: {
                        write: [
                            // Give access to ourselves
                            global.orbit.identity.id,
                            //todo Give access to other peers
                        ]
                    }}
            );
            //save db info in the project config
            index = global.appConfig.projects.findIndex(i => i.id === projectId);
            global.appConfig.projects[index].repoDB = db.identity;
            global.appConfig.projects[index].repoDB.address = db.address.toString();
            global.appConfig.projects[index].repoDB.toJSON = null; //the toJSON() functions does not include the address field . So using JSON.stringify would not include that field
            framework.SaveAppConfig();
            break;
    }
}
exports.GetSwarmKeyContents = (projectInfo) => {
   let localPath = projectInfo.localPath;
    return fs.readFileSync(localPath + '/swarm.key').toString();
}
