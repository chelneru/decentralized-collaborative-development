const os = require('os');
const helpers = require('./helpers')
const crypt = require('./crypt');
const fs = require('fs');
const moment = require('moment');
const path = require('path');
const p2pinterface = require('../p2p-system/interface')
exports.LoadAppConfig = () => {
    global.userPath = path.join(os.homedir(), 'distcollab');
    let configPath = global.userPath + '/config';

    try {
        if (fs.existsSync(configPath)) {
            global.appConfig = JSON.parse(fs.readFileSync(configPath, 'UTF-8'));
        }
    } catch (err) {
        console.log('Error reading app config file: ', err);
    }
};

exports.CheckAppConfig = () => {
    global.userPath = path.join(os.homedir(), 'distcollab');
    let configPath = path.join(global.userPath, 'config');
    return fs.existsSync(configPath);
}

exports.SaveAppConfig = () => {
    let configPath = path.join(global.userPath, 'config');

    if (fs.existsSync(configPath)) {

        fs.writeFileSync(configPath, JSON.stringify(global.appConfig));
    } else {
        console.log('unable to find config file at:' + configPath);
    }
}
exports.CreateAppConfig = () => {
    global.userPath = path.join(os.homedir(), 'distcollab');

    if (!fs.existsSync(global.userPath)) {
        fs.mkdirSync(global.userPath);
    }
    let configPath = path.join(global.userPath, 'config');
    let initialConfig = {
        previousProject: '',   //this will be the name of the project
        projects: [],   //an array of projects metadata
        user: {},
        projectIdCounter: 1,
        p2psystem: 'ipfs' //this is the only option for now
    };
    global.appConfig = initialConfig;
    fs.writeFileSync(configPath, JSON.stringify(initialConfig));
};


exports.Authenticate = (email, password) => {
    password = password.trim();
    let existingEmail = global.appConfig.user.email;
    let existingHashedPassword = global.appConfig.user.password;
    if (email.toLowerCase() === existingEmail) {
        return crypt.comparePassword(password, existingHashedPassword);
    }
};

exports.CreateProjectInitialFiles = (projectPath, projectName, modules, p2psystem) => {
    fs.mkdirSync(path.join(projectPath, projectName), {recursive: true});
    fs.mkdirSync(path.join(projectPath, projectName, '/repository'), {recursive: true});
    if (!fs.existsSync(path.join(projectPath, projectName))) {

        console.log("\x1b[41m", 'Unable to create project directory.');
        return {status: false};
    }
    let projectFile = {
        id: global.appConfig.projectIdCounter,
        name: projectName,
        author: global.identity.name,
        localPath: projectPath + '/' + projectName,
        p2psystem: p2psystem,
        modules: modules,
        bootstrapNodes: [],
        usersDB: {},
        repoDB: {}
    };

    fs.writeFileSync(path.join(projectPath, projectName, 'config'), JSON.stringify(projectFile));
    if (!fs.existsSync(path.join(projectPath, projectName, 'config'))) {
        console.log("\x1b[41m", 'Unable to create project config file.');
        return {status: false};
    }

    //project creation is successful
    global.appConfig.projectIdCounter++;
    global.appConfig.projects.push(projectFile);
    exports.SaveAppConfig();

    return {status: true, projectInfo: projectFile};
}

exports.IsAuthor = (projectInfo) => {
    return global.identity.name == projectInfo.author;
}
exports.CreateProject = async (projectPath, projectName, modules, p2psystem) => {
    let result = exports.CreateProjectInitialFiles(projectPath, projectName, modules, p2psystem);

    if (result.status === true) {
        console.log('Successfully created the project');
        global.projectInfo = result.projectInfo;

        if (global.node === undefined) {
            await p2pinterface.InitializeP2PSystem({localPath: path.join(result.projectInfo.localPath, '.jsipfs')}, 'ipfs');
        }

        if (global.orbit === undefined) {
            await p2pinterface.InitializeOrbitInstance(result.projectInfo.localPath);
        }

        //create databases
        await p2pinterface.CreateDatabase('users', result.projectInfo.id).then(function () {
            console.log('Users DB created');
        });

        await p2pinterface.CreateDatabase('repository', result.projectInfo.id).then(function () {
            console.log('Repository DB created');
        });
        if (modules.length > 0) {
            //we have extensions so we need a database for shared data
            await p2pinterface.CreateDatabase('shared-data', result.projectInfo.id).then(function () {
                console.log('Shared Data DB created');
            });
            for (let iterMod = 0; iterMod < modules.length; iterMod++) {
                if (modules[iterMod].hasDB) {
                    await p2pinterface.CreateDatabase(modules[iterMod].name, result.projectInfo.id).then(function () {
                        console.log(modules[iterMod].name+'DB created');
                    });
                }
            }
        }

        await p2pinterface.AddUserToDatabase(result.projectInfo,global.appConfig.user.name,global.appConfig.user.email,global.appConfig.user.password,global.node.id);
        let projectIndex = global.appConfig.projects.findIndex(i => i.id === result.projectInfo.id);
        if (projectIndex >= 0) {
            global.appConfig.previousProject = global.appConfig.projects[projectIndex];
            exports.SaveAppConfig();
            return {status: true};
        } else {
            return {status: false, message: 'project not found!'};

        }
    } else {
        console.log('Failed in creating a project!');

        return {status: false, message: 'failed to create project!'};

    }
}

exports.GetProject = (projectId) => {
    let index = global.appConfig.projects.findIndex(i => i.id === projectId);
    if (index >= 0) {
        return index;
    }
    return null;
}

exports.AddProjectIPFS = (projectName, databases, modules) => {
    let index = global.appConfig.projects.findIndex(i => i.name === projectName);
    if (index >= 0) {
        global.appConfig.projects[index].modules = [].concat(modules);
        for (let dbIter = 0; dbIter < databases.length; dbIter++) {
            global.appConfig.projects[index][databases[dbIter].name] = databases[dbIter].content;
        }
        global.projectInfo = global.appConfig.projects[index];
        exports.SaveAppConfig();
        return {status: true, message: 'success'};

    } else {
        return {status: false, message: 'project not found'};
    }

}
exports.JoinProjectIPFS = (projectName, swarmKey, projectPath, bootstrapNodes) => {
    fs.mkdirSync(path.join(projectPath, projectName),{recursive:true});
    let projectFile = {
        name: projectName,
        author: "",
        p2psystem: "ipfs",
        localPath: path.join(projectPath, projectName),
        modules: [],
        usersDB: {},
        bootstrapNodes: JSON.parse(bootstrapNodes),
        repoDB: {},
    };
    //write config file
    fs.writeFileSync(path.join(projectPath, projectName, 'config'), JSON.stringify(projectFile));
    if (!fs.existsSync(path.join(projectPath, projectName, 'config'))) {
        console.log("\x1b[41m", 'Unable to create project config file.');
        return {status: false};
    }
    fs.mkdirSync(path.join(projectPath, projectName, '.jsipfs'));

    //write swarmkey file
    fs.writeFileSync(path.join(projectPath, projectName, '.jsipfs', 'swarm.key'), swarmKey);
    if (!fs.existsSync(path.join(projectPath, projectName, '.jsipfs', 'swarm.key'))) {
        console.log("\x1b[41m", 'Unable to create project swarm key.');
        return {status: false};
    }
    global.appConfig.projects.push(projectFile);
    exports.SaveAppConfig();


    return {status: true};
};
exports.AddFolderToIpfs = async (folderPath,folderName) => {
    let files = exports.getAllFiles(folderPath);
    console.log(JSON.stringify(files));
    console.log('folderName:', folderName);
    try {
        await global.node.node.files.mkdir(folderName);

    } catch (e) {
        console.log('unable to create repo ipfs folder:', e.toString());
    }
    for await (const result of await global.node.node.add(files, {pin: true, wrapWithDirectory: true})) {

        let rootItem = "/ipfs/" + result.cid.toString();
        console.info(result);
        console.info("Copying from " + rootItem + " to " + folderName);
        try {
            await global.node.node.files.cp(rootItem, folderName);
        } catch (e) {
            console.log('Unable to ipfs copy:', e.toString());

        }

    }
    console.log('finished adding files');
    return {status: true};
};

exports.GetIpfsFolder = async (folderPath) => {
    try {
        let result = await global.node.node.files.stat(folderPath);
        console.log(JSON.stringify(result));
        return result.cid.toString();

    } catch (e) {
        console.log('Error getting ipfs folder hash', e.toString())
    }
};
exports.getAllFiles = (dirPath, originalPath, arrayOfFiles) => {
    let files = fs.readdirSync(dirPath)

    arrayOfFiles = arrayOfFiles || []
    originalPath = originalPath || path.resolve(dirPath, "..")

    let folder = path.relative(originalPath, path.join(dirPath, "/"))
    try {
        arrayOfFiles.push({
            path: folder.replace(/\\/g, "/"),
        })
    } catch (e) {
        console.log('Unable to push file in the array', e.toString());
    }
    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = exports.getAllFiles(dirPath + "/" + file, originalPath, arrayOfFiles)
        } else {
            file = path.join(dirPath, "/", file)

            arrayOfFiles.push({
                path: path.relative(originalPath, file).replace(/\\/g, "/"),
                content: fs.readFileSync(file),
            })
        }
    })

    return arrayOfFiles;
};
exports.RetrieveFolderFromIpfs = async (hash) => {
    for await (const file of await global.node.node.get(hash)) {
        return file;
    }
};
exports.AppendRepoDB = async (projectInfo, dataObject) => {
    const db = await global.orbit.open(projectInfo.repoDB.address);
    await db.load();
    let currentData = db.get('repository');
    console.log(JSON.stringify(currentData));
    if (currentData == null) {
        currentData = [dataObject];
    } else {
        currentData.push(dataObject);
    }
    db.put('repository', currentData);
};

exports.AppendExtensionDB = async (projectInfo, extensionName, dbObject) => {

    const db = await global.orbit.open(projectInfo[extensionName + 'DB'].address);
    await db.load();
    db.add(dbObject);
    console.log('Current contents of ',extensionName+'DB',' is ',JSON.stringify(db.iterator({limit: -1})
        .collect()
        .map((e) => e.payload.value)));
};
exports.RetrieveExtensionData = async (projectInfo, extensionName, data) => {
    try {
        const db = await global.orbit.open(projectInfo[extensionName + 'DB'].address);
        await db.load();

        if(extensionName != 'chat') {
            let extensionDataPath = data.extensionPath;
            let folderName = data.folderName;
            let result = db.iterator({limit: -1})
                .collect()
                .map((e) => e.payload.value);

            if (result !== null) {
                let ipfsHash = result;// get latest hash

                await exports.SaveIpfsFolderLocally(projectInfo, folderName, ipfsHash, extensionDataPath);
            } else {
                return {status: false, message: 'hash not found'};
            }
            return {status: true};
        }
        else {
            //for chat we retrieve all messages
            let result = db.iterator({limit: -1})
                .collect()
                .map((e) => e.payload.value);
            if (result !== null) {
                return {status:true,content:result};
            } else {
                return {status: false, message: 'hash not found'};
            }
        }
    } catch (e) {
        console.log('Error retrieving data for extension '+extensionName+': '+e.toString())
        return {status: false, message: e.toString()};

    }

};
exports.PublishExtensionData = async (projectInfo, extensionName, data) => {
    try {
        let dbObject = null;
        if (extensionName != 'chat') {
            let extensionPath = data.extensionPath;
            let folderName = data.folderName;
            let result = await exports.AddFolderToIpfs(extensionPath, folderName);
            let ipfsHash = await exports.GetIpfsFolder('/' + path.basename(path.dirname(extensionPath)));

            dbObject = {
                hash: ipfsHash, //IPFS hash to the content
                author: {
                    name: global.identity.name,
                    ipfsId: global.node.id
                },
                cTime: moment().format("DD-MM-YYYY, hh:mm:ss a")
            };
        } else {
            dbObject = data;
            dbObject.cTime = moment().format("DD-MM-YYYY, hh:mm:ss a")

        }
        await exports.AppendExtensionDB(projectInfo, extensionName, dbObject);

        return {status: true, message: ''};

    } catch (e) {
        console.log('Error publishing for extension '+extensionName+' :'+e.toString())
        return {status: false, message: e.toString()};

    }
}
exports.GetNetworkUsers = async (projectInfo) => {
    try {
    const db = await global.orbit.open(projectInfo.usersDB.address);
    await db.load();
    return db.iterator({limit: -1})
        .collect()
        .map((e) => {
            return {name: e.payload.value.name, email: e.payload.value.email,ipfsId: e.payload.value.ipfsId}
        });
    }catch (e) {
        console.log('Error getting users from the database:',e.toString())
    }
}

exports.CheckOnlineStatus = async () => {
    let users = await exports.GetNetworkUsers(global.projectInfo);
    try {
        for (let iterUser = 0; iterUser < users.length; iterUser++) {
            if (global.node.id !== users[iterUser].ipfsId) {
                for await (const res of global.node.node.ping(users[iterUser].ipfsId)) {
                    if (res.time) {
                        users[iterUser].status = 'online';
                    } else {
                        users[iterUser].status = 'offline';
                    }
                }
            } else {
                //this is own ide
                users[iterUser].status = 'online';

            }
        }
        global.users = users;
    } catch (e) {
        console.log('Error check users status', e.toString());
    }
}

exports.PublishLocalRepository = async (projectInfo) => {
    let result = await exports.AddFolderToIpfs(path.join(projectInfo.localPath, 'repository'));
    let ipfsHash = await exports.GetIpfsFolder('/repository');

    let dbObject = {
        hash: ipfsHash, //IPFS hash to the content
        author: {
            name: global.identity.name,
            ipfsId: global.node.id
        },
        cTime: moment().format("DD-MM-YYYY, hh:mm:ss a")
    };
    await exports.AppendRepoDB(projectInfo, dbObject);
    return {status: true, message: ''};
};
exports.SaveIpfsFolderLocally = async (projectInfo, parentFolder, ipfsPath, outputPath) => {
    console.log('Saving file(s)', ipfsPath);

    const toIterable = require('stream-to-it')
    const pipe = require('it-pipe')
    const {map} = require('streaming-iterables')
    for await (const file of global.node.node.get(ipfsPath)) {
        if (file.path.indexOf('/' + parentFolder) > -1) {
            //remove hash folders for a nice folder location

            file.path = file.path.substring(file.path.indexOf('/' + parentFolder) + ('/' + parentFolder).length, file.path.length);
            const fullFilePath = path.join(outputPath, file.path)

            if (file.content) {
                await fs.promises.mkdir(path.join(outputPath, path.dirname(file.path)), {recursive: true})
                await pipe(
                    file.content,
                    map(chunk => chunk.slice()), // BufferList to Buffer
                    toIterable.sink(fs.createWriteStream(fullFilePath))
                )
            } else {
                // this is a dir
                await fs.promises.mkdir(fullFilePath, {recursive: true})
            }
        }
    }
}
exports.SyncronizeRepository = async (projectInfo) => {
    const db = await global.orbit.open(projectInfo.repoDB.address);
    await db.load();
    let currentData = db.get('repository');
    if (currentData !== null) {
        let ipfsHash = currentData[currentData.length - 1].hash;// get latest hash
        let outputPath = path.join(projectInfo.localPath, 'repository-sync');
        await exports.SaveIpfsFolderLocally(projectInfo, 'repository', ipfsHash, outputPath);
    }

};

exports.StartExtensionModules = (projectInfo) => {
    var fork = require('child_process').fork;
    var appRoot = process.cwd();
    var childGit = fork(path.join(appRoot, `/git-extension-module/bin/www`));
    var childGitBug = fork(path.join(appRoot, `/git-bug-extension-module/bin/www`));
    var childChat = fork(path.join(appRoot, `/chat-extension-module/bin/www`));
}
