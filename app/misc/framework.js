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
    let index = global.appConfig.projects.findIndex(i => i.name === "newProject");
    if (index >= 0) {
        global.appConfig.projects[index].name = projectName;
        //rename localPath folder
        try {
            let currentPath = global.appConfig.projects[index].localPath;
            let newPath = path.join(path.dirname(global.appConfig.projects[index].localPath), projectName);
            fs.renameSync(currentPath, newPath)
            console.log("Successfully renamed the directory.")
        } catch (err) {
            console.log(err)
        }
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
exports.JoinProjectIPFS = (swarmKey, projectPath, bootstrapNodes) => {
    fs.mkdirSync(path.join(projectPath, 'newProject'));
    let projectFile = {
        name: "newProject",
        author: "",
        p2psystem: "ipfs",
        localPath: path.join(projectPath, 'newProject'),
        modules: [],
        usersDB: {},
        bootstrapNodes: JSON.parse(bootstrapNodes),
        repoDB: {},
    };
    //write config file
    fs.writeFileSync(path.join(projectPath, 'newProject', 'config'), JSON.stringify(projectFile));
    if (!fs.existsSync(path.join(projectPath, 'newProject', 'config'))) {
        console.log("\x1b[41m", 'Unable to create project config file.');
        return {status: false};
    }
    fs.mkdirSync(path.join(projectPath, 'newProject', '.jsipfs'));

    //write swarmkey file
    fs.writeFileSync(path.join(projectPath, 'newProject', '.jsipfs', 'swarm.key'), swarmKey);
    if (!fs.existsSync(path.join(projectPath, 'newProject', '.jsipfs', 'swarm.key'))) {
        console.log("\x1b[41m", 'Unable to create project swarm key.');
        return {status: false};
    }
    global.appConfig.projects.push(projectFile);
    exports.SaveAppConfig();


    return {status: true};
};
exports.PublishLocalRepository = async (projectInfo) => {
    for await (const file of await global.node.node.add(projectInfo.localPath + '/repository')) {
        const db = await global.orbit.open(projectInfo.repoDB.address);
        await db.load();

        let dbObject = {
            hash: file.cid.toString(), //IPFS hash to the content
            author: {
                name: global.identity.name,
                ipfsId: global.node.id
            },
            cTime: moment().format("DD-MM-YYYY, hh:mm:ss a")
        };
        let currentData = db.get('repository');
        console.log(JSON.stringify(currentData));
        if (currentData == null) {
            currentData = [dbObject];
        } else {
            currentData.push(dbObject);
        }
        db.put('repository', currentData);
        return {status: true, message: ''};
    }

};
