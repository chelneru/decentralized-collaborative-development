const os = require('os');
const crypt = require('./crypt');
const fs = require('fs');
const moment = require('moment');
const path = require('path');
const p2pinterface = require('../p2p-system/interface')
const {globSource} = require('ipfs');

exports.LoadAppConfig = () => {
    global.userPath = path.join(os.homedir(), 'colligo');
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
    global.userPath = path.join(os.homedir(), 'colligo');
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
    global.userPath = path.join(os.homedir(), 'colligo');

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
exports.RunBackgroundTasks = async () => {

    if (global.background_task_running === undefined || global.background_task_running === false) {

        console.log('Starting periodic update of users list')
        setInterval(async function () {
                if (global.orbit !== undefined) {
                    exports.CheckOnlineStatus().then(async function () {
                    await p2pinterface.ShareUsers(global.projectInfo);
                    });
                }

            }
            , 3000);
        global.background_task_running = true;
    }
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
                    await p2pinterface.CreateDatabase(modules[iterMod].name, result.projectInfo.id, modules[iterMod].dbType).then(function () {
                        console.log(modules[iterMod].name + 'DB created');
                    });
                }
            }
        }

        await p2pinterface.AddUserToDatabase(result.projectInfo, global.appConfig.user.name, global.appConfig.user.email, global.appConfig.user.password, global.node.id);
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

exports.AddProjectIPFS = async (projectID, databases, modules) => {
    let projectIndex = global.appConfig.projects.findIndex(i => i.id === global.projectInfo.id)
    global.projectInfo.modules = modules;
    global.projectInfo.id = projectID;

    for (let dbIter = 0; dbIter < databases.length; dbIter++) {
        try {
            if (databases[dbIter].address !== undefined) {
                let db = await global.orbit.open(databases[dbIter].address,{create:true});
                global.projectInfo[databases[dbIter].name] = {};
                global.projectInfo[databases[dbIter].name].id = db.identity.id;
                global.projectInfo[databases[dbIter].name].publicKey = db.identity.publicKey;
                global.projectInfo[databases[dbIter].name].signatures = db.identity.signatures;
                global.projectInfo[databases[dbIter].name].address = db.address.toString();

            } else {
                global.projectInfo[databases[dbIter].name] = {name: databases[dbIter].name};
            }
        } catch (e) {
            console.log('Unable to parse the JSON for ', databases[dbIter].name, '. The content is "', databases[dbIter].content, '"')
        }
    }
    await p2pinterface.AddUserToDatabase(global.projectInfo, global.appConfig.user.name, global.appConfig.user.email, global.appConfig.user.password, global.node.id);
    global.appConfig.projects[projectIndex] = global.projectInfo;
    console.log('Final received project info ',JSON.stringify(global.projectInfo));
    exports.SaveAppConfig();
    return {status: true, message: 'success'};


}
exports.JoinProjectIPFS = (projectName,swarmKey, projectPath, bootstrapNodes) => {

    fs.mkdirSync(path.join(projectPath, projectName), {recursive: true});
    fs.mkdirSync(path.join(projectPath, projectName, '/repository'), {recursive: true});
    if (!fs.existsSync(path.join(projectPath, projectName))) {

        console.log("\x1b[41m", 'Unable to create project directory.');
        return {status: false};
    }
    let projectFile = {
        id:global.appConfig.projectIdCounter,
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
    global.projectInfo = projectFile;
    global.appConfig.projectIdCounter++;
    global.appConfig.projects.push(projectFile);
    exports.SaveAppConfig();


    return {status: true};
};
exports.AddFolderToIpfs = async (ipfs,folderPath) => {
    console.time("adding ipfs files");
    let files = [];
    try {
        for await (const file of ipfs.add(globSource(folderPath, {
            recursive: true
        }))) {
            files.push(file);
        }
    } catch (e) {
        console.log('Unable to add folder to IPFS:', e.toString());
    }
    return {
        folder: folderPath,
        files: files,
    }
};

exports.GetIpfsFolder = async (folderPath) => {
    try {
        for await (const file of await global.node.node.files.ls()) {
            console.log(JSON.stringify(file) );

        }
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
    if (global.orbit === undefined) {
        throw "Orbit is not initialized when trying to append to repository DB";
    }
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
    if (global.orbit === undefined) {
        throw "Orbit is not initialized when trying to append to extension " + extensionName + "DB";
    }
    const db = await global.orbit.open(projectInfo[extensionName + 'DB'].address);
    await db.load();
    db.add(dbObject);
    // console.log('Current contents of ', extensionName + 'DB', ' is ', JSON.stringify(db.iterator({limit: -1})
    //     .collect()
    //     .map((e) => e.payload.value)));
};
exports.RetrieveExtensionData = async (projectInfo, extensionName, data) => {
    try {
        if (global.orbit === undefined) {
            throw "Orbit is not initialized when trying to retrieve extension data from " + extensionName + "DB";
        }
        console.log('Retrieving extensions data from projectinfo ',JSON.stringify(projectInfo));
        const db = await global.orbit.open(projectInfo[extensionName + 'DB'].address);
        await db.load();

        if (extensionName != 'chat') {
            let extensionDataPath = data.extensionPath;
            let folderName = data.folderName;
            let result = db.iterator({limit: 1})
                .collect()
                .map((e) => e.payload.value);

            if (result !== null) {
                if (result.length > 0) {
                    let content = result[0].content;// get latest hash
                    if (content != null) {
                        await exports.SaveIpfsFolderLocally(global.node.node, content.files, content.folder, extensionDataPath);
                    }
                }

            } else {
                console.log('Unable to find hash for extension ', extensionName, ":", JSON.stringify(result))
                return {status: false, message: 'hash not found'};
            }
            console.log('Retrieving data for extension ' + extensionName + ' :' + JSON.stringify(result));

            return {status: true};
        } else {
            //for chat we retrieve all messages
            let result = db.iterator({limit: -1})
                .collect()
                .map((e) => e.payload.value);
           // console.log('Retrieving data for extension '+extensionName+' :'+JSON.stringify(result));

            if (result !== null) {
                return {status: true, content: result};
            } else {
                console.log('Unable to find hash for extension ',extensionName,":",JSON.stringify(result))

                return {status: false, message: 'hash not found'};
            }
        }
    } catch (e) {
        console.log('Error retrieving data for extension ' + extensionName + ': ' + e.toString(), JSON.stringify(projectInfo));
        return {status: false, message: e.toString()};

    }

};
exports.PublishExtensionData = async (projectInfo, extensionName, data) => {
    console.log('Adding submission for '+extensionName+' '+JSON.stringify(data));

    try {
        let dbObject = null;
        if (extensionName != 'chat') {
            let extensionPath = data.extensionPath;
            let folderName = data.folderName;
            let result = await exports.AddFolderToIpfs(global.node.node,extensionPath, '/'+folderName);

            dbObject = {
                content: result,
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
        console.log('Error publishing for extension ' + extensionName + ' :' + e.toString())
        return {status: false, message: e.toString()};

    }
}
exports.GetNetworkUsers = async (projectInfo) => {
    try {
        if (global.orbit === undefined) {
            throw "Orbit is not initialized when trying to retrieve network users";
        }
        if (projectInfo.usersDB.address !== undefined) {
            const db = await global.orbit.open(projectInfo.usersDB.address);
            await db.load();
            return db.iterator({limit: -1})
                .collect()
                .map((e) => {
                    return {name: e.payload.value.name, email: e.payload.value.email, ipfsId: e.payload.value.ipfsId}
                });
        } else {
            console.log('UsersDB is not initialized. Result will be [].');
            return [];
        }
    } catch (e) {
        console.log('Error getting users from the database:', e.toString());
    }
}

exports.CheckOnlineStatus = async () => {
    let users = await exports.GetNetworkUsers(global.projectInfo);
    try {
        // for (let iterUser = 0; iterUser < users.length; iterUser++) {
        //     if (global.node.id !== users[iterUser].ipfsId) {
        //         for await (const res of global.node.node.ping(users[iterUser].ipfsId)) {
        //             if (res.time) {
        //                 users[iterUser].status = 'online';
        //             } else {
        //                 users[iterUser].status = 'offline';
        //             }
        //         }
        //     } else {
        //         //this is own ide
        //         users[iterUser].status = 'online';
        //
        //     }
        // }
        global.users = users;
    } catch (e) {
        console.log('Error check users status', e.toString());
    }
}

exports.PublishLocalRepository = async (projectInfo) => {
    let result = await exports.AddFolderToIpfs(global.node.node,path.join(projectInfo.localPath, 'repository'));
    console.log('Publishing repository :'+JSON.stringify(result));

    let dbObject = {
        content: result, //IPFS hash to the content
        author: {
            name: global.identity.name,
            ipfsId: global.node.id
        },
        cTime: moment().format("DD-MM-YYYY, hh:mm:ss a")
    };

    await exports.AppendRepoDB(projectInfo, dbObject);
    return {status: true, message: ''};
};
exports.SaveIpfsFolderLocally = async (ipfs,files, parentFolder, outputPath) => {
    const del = require('del');
    await del([path.join(outputPath,'*.*')]);
    console.log('Saving file(s)');

    const toIterable = require('stream-to-it')
    const pipe = require('it-pipe')
    const {map} = require('streaming-iterables')
    for (let fileIter = 0; fileIter < files.length; fileIter++) {
        files[fileIter].path =  files[fileIter].path.replace(path.basename(parentFolder)+'/','');
        files[fileIter].path =  files[fileIter].path.replace(path.basename(parentFolder),'');
        for await (const fileResult of await ipfs.get(files[fileIter].cid.toString())) {

            if (files[fileIter].path.length > 0 ) {
                //remove hash folders for a nice folder location
                const fullFilePath = path.join(outputPath, files[fileIter].path);
                if (files[fileIter].mode === 420) { // check if its folder of file
                    if(!fs.existsSync(path.join(outputPath, path.dirname(files[fileIter].path)))) {
                    await fs.promises.mkdir(path.join(outputPath, path.dirname(files[fileIter].path)), {recursive: true})
                    }
                    await pipe(
                        fileResult.content,
                        map(chunk => chunk.slice()), // BufferList to Buffer
                        toIterable.sink(fs.createWriteStream(fullFilePath))
                    )
                } else {
                    // this is a dir
                    if(!fs.existsSync(fullFilePath)) {
                        await fs.promises.mkdir(fullFilePath, {recursive: true})
                    }
                }
            }
        }
    }
}
exports.SyncronizeRepository = async (projectInfo) => {
    if (global.orbit === undefined) {
        throw "Orbit is not initialized when trying to synchronize repository";
    }
    const db = await global.orbit.open(projectInfo.repoDB.address);
    await db.load();
    let currentData = db.get('repository');
    if (currentData !== null) {
        let ipfsHash = currentData[currentData.length - 1].content;// get latest hash
        let outputPath = path.join(projectInfo.localPath, 'repository-sync');
        console.log('Retrieving repository :'+JSON.stringify(ipfsHash));

        await exports.SaveIpfsFolderLocally(global.node.node, ipfsHash.files,ipfsHash.folder,  outputPath);
    }

};

exports.StartExtensionModules = async () => {
    global.startedModules = true;
    var fork = require('child_process').fork;
    var appRoot = process.cwd();
    var childGit = fork(path.join(appRoot, `/git-extension-module/bin/www`));
    var childGitBug = fork(path.join(appRoot, `/git-bug-extension-module/bin/www`));
    var childChat = fork(path.join(appRoot, `/chat-extension-module/bin/www`));

}
