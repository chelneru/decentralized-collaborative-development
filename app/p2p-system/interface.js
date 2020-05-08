let IpfsSystem = require('./ipfs-p2p-system');
const fs = require('fs');
const OrbitDB = require('orbit-db');
const framework = require('../misc/framework');
const path = require('path');
exports.InitializeP2PSystem = async (projectInfo, p2psystem) => {
    switch (p2psystem) {
        case 'ipfs':
            global.node = await IpfsSystem.create({
                repo: projectInfo.localPath,
                bootstrap: projectInfo.bootstrap
            }, true);
            console.log('\x1b[33m%s\x1b[0m', 'node ', global.node.id, ' is set');
            break;
    }
}

exports.InitializeOrbitInstance = async (projectPath) => {
    global.orbit = await OrbitDB.createInstance(global.node.node, {directory: projectPath});
    console.log('Orbit initialized.')
}

exports.GetCurrentProjectDatabases = () => {
    let databases = [];
    //prepare databases
    if (global.projectInfo.usersDB !== undefined) {
        databases.push({name: 'usersDB', content: JSON.stringify(global.projectInfo.usersDB)});
    }
    if (global.projectInfo.repoDB !== undefined) {
        databases.push({name: 'repoDB', content: JSON.stringify(global.projectInfo.repoDB)});
    }
    for (let modIter = 0; modIter < global.projectInfo.modules.length; modIter++) {
        if (global.projectInfo.modules[modIter].hasDB === true) {
            databases.push({
                name: global.projectInfo.modules[modIter].name + 'DB',
                content: global.projectInfo[global.projectInfo.modules[modIter].name + 'DB']
            });

        }
    }
    return databases;
};
exports.AddDatabaseCollaborator = async (projectId, collaboratorPublicKey) => {
    let index = framework.GetProject(projectId);
    if (index !== null) {
        try {
            let projectInfo = global.appConfig.project[index];
            const dbUsers = await global.orbit.open(projectInfo.usersDB.address);
            await dbUsers.access.grant('write', collaboratorPublicKey) // grant access to collaborator
            const dbRepo = await global.orbit.open(projectInfo.repoDB.address);
            await dbRepo.access.grant('write', collaboratorPublicKey) // grant access to collaborator
            let moduleDB = null;
            for (let modIter = 0; modIter < projectInfo.modules.length; modIter++) {
                if (projectInfo.modules[modIter].hasDB === true) {
                    moduleDB = await global.orbit.open(projectInfo[projectInfo.modules[modIter].name + 'DB'].address);
                    moduleDB.access.grant('write', collaboratorPublicKey) // grant access to collaborator
                }
            }
            global.appConfig.project[index] = projectInfo;
            framework.SaveAppConfig();
            console.log('Added collaborator to all project\'s databases');
        } catch (e) {
            console.log('Error when adding collaborator', e.toString());

        }
    } else {
        console.log('project not found when trying to add database collaborator');
    }

}
exports.CreateDatabase = async (purpose, projectId) => {

    let db = null;
    let index = null;
    switch (purpose) {
        case 'users':
            db = await global.orbit.create('network.users', 'eventlog',
                {
                    accessController: {
                        write: ['*']
                    }
                }
            );

            //save db info in the project config
            index = global.appConfig.projects.findIndex(i => i.id === projectId);
            global.appConfig.projects[index].usersDB.publicKey = db.identity.publicKey;
            global.appConfig.projects[index].usersDB.signatures = db.identity.signatures;
            global.appConfig.projects[index].usersDB.address = db.address.toString();
            global.appConfig.projects[index].usersDB.toJSON = null; //the toJSON() functions does not include the address field . So using JSON.stringify would not include that field

            framework.SaveAppConfig();
            break;
        case 'repository':
            db = await global.orbit.create('network.repository', 'keyvalue',
                {
                    accessController: {
                        write: ['*']
                    }
                }
            );
            //save db info in the project config
            index = global.appConfig.projects.findIndex(i => i.id === projectId);
            global.appConfig.projects[index].repoDB.id = db.identity.id;
            global.appConfig.projects[index].repoDB.publicKey = db.identity.publicKey;
            global.appConfig.projects[index].repoDB.signatures = db.identity.signatures;
            global.appConfig.projects[index].repoDB.address = db.address.toString();
            global.appConfig.projects[index].repoDB.toJSON = null; //the toJSON() functions does not include the address field . So using JSON.stringify would not include that field
            framework.SaveAppConfig();
            break;
        case 'shared-data':
            db = await global.orbit.create('network.shared-data', 'keyvalue',
                {
                    accessController: {
                        write: ['*']
                    }
                }
            );
            //save db info in the project config
            index = global.appConfig.projects.findIndex(i => i.id === projectId);
            global.appConfig.projects[index].sharedDataDB.id = db.identity.id;
            global.appConfig.projects[index].sharedDataDB.publicKey = db.identity.publicKey;
            global.appConfig.projects[index].sharedDataDB.signatures = db.identity.signatures;
            global.appConfig.projects[index].sharedDataDB.address = db.address.toString();
            global.appConfig.projects[index].sharedDataDB.toJSON = null; //the toJSON() functions does not include the address field . So using JSON.stringify would not include that field
            framework.SaveAppConfig();
            break;
        case 'git':
        case 'matrix':
        case 'git-bug':
            db = await global.orbit.create('network.'+purpose+'-extension', 'eventlog',
                {
                    accessController: {
                        write: ['*']
                    }
                }
            );

            //save db info in the project config
            index = global.appConfig.projects.findIndex(i => i.id === projectId);
            global.appConfig.projects[index][purpose+'DB'].publicKey = db.identity.publicKey;
            global.appConfig.projects[index][purpose+'DB'].signatures = db.identity.signatures;
            global.appConfig.projects[index][purpose+'DB'].address = db.address.toString();
            global.appConfig.projects[index][purpose+'DB'].toJSON = null; //the toJSON() functions does not include the address field . So using JSON.stringify would not include that field

            framework.SaveAppConfig();
            break;
    }
}

exports.AddProjectDatabase = async (purpose, projectId, dbInfo) => {
    let db = null;
    let index = null;
    switch (purpose) {
        case 'users':
            index = global.appConfig.projects.findIndex(i => i.id === projectId);
            global.appConfig.projects[index].usersDB = dbInfo;

            framework.SaveAppConfig();
            break;
        case 'repository':
            //save db info in the project config
            index = global.appConfig.projects.findIndex(i => i.id === projectId);
            global.appConfig.projects[index].repoDB = dbInfo;
            framework.SaveAppConfig();
            break;
    }
}
exports.AddUserToDatabase = async (projectInfo,userName,userEmail,userPassword) =>
{
    const db = await global.orbit.open(projectInfo.usersDB.address);
    await db.load();
    db.add({email:userEmail,pass:userPassword,name:userName});

}
exports.PublishSharedData = async (projectInfo,extensionName,data) =>
{
    try {
    const db = await global.orbit.open(projectInfo.sharedDataDB.address);
    await db.load();
    db.put(extensionName, data);
    return {status:true};
    }
    catch (e) {
        return {status:false,message:e.toString()};
    }

}
exports.RetrieveSharedData = async (projectInfo) => {
    try {
        const db = await global.orbit.open(projectInfo.sharedDataDB.address);
        await db.load();
        let result = [];
        for (let iterMod = 0; iterMod < projectInfo.modules.length; iterMod++) {
            result.push({name: projectInfo.modules[iterMod].name, data: db.get(projectInfo.modules[iterMod].name)});
        }
        //add shared data from framework
        result.push({name: 'framework', data: db.get('framework')});

        return {status: true, content: result};
    } catch (e) {
        return {status: false, content: null, message: e.toString()};
    }

}
exports.AuthenticateUserOverNetwork = async (projectInfo,userEmail,userPassword) => {
    if (projectInfo.usersDB !== undefined) {
        const db = await global.orbit.open(projectInfo.usersDB.address);
        await db.load();
        const users = db.iterator().collect().map(e => e.payload.value)
        for (let iter = 0; iter < users.length; iter++) {
            if (users[iter].email === userEmail) {
                return bcrypt.compare(userPassword, users[iter].pass, function (err, result) {
                    return result;
                });
            }
        }
        return false;
    }
}
exports.GetSwarmKeyContents = (projectInfo) => {
    let localPath = projectInfo.localPath;
    try {
        return fs.readFileSync(path.join(localPath, '.jsipfs', 'swarm.key')).toString();
    } catch (e) {
        console.log('Unable to read swarm key contents:', e.toString());
        return "";
    }
}

exports.ShareUsers = async (projectInfo) => {
    const db = await global.orbit.open(projectInfo.usersDB.address);
    await db.load();
    const users = db.iterator({ limit: -1 })
        .collect()
        .map((e) => {
            return {name:e.payload.value.name,email:e.payload.value.email}
        });
    await exports.PublishSharedData(projectInfo,'framework',users);
}
