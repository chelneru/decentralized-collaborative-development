const os = require('os');
const helpers = require('./helpers')
const crypt = require('./crypt');
const fs = require('fs');
const moment = require('moment');


exports.LoadAppConfig = () => {
    global.userPath = os.homedir() + '/distcollab';
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
    global.userPath = os.homedir() + '/distcollab';
    let configPath = global.userPath + '/config';
    return fs.existsSync(configPath);
}

exports.SaveAppConfig = () => {
    let configPath = global.userPath + '/config';

    if (fs.existsSync(configPath)) {

        fs.writeFileSync(configPath, JSON.stringify(global.appConfig));
    } else {
        console.log('unable to find config file at:' + configPath);
    }
}
exports.CreateAppConfig = () => {
    global.userPath = os.homedir() + '/distcollab';

    if (!fs.existsSync(global.userPath)) {
        fs.mkdirSync(global.userPath);
    }
    let configPath = global.userPath + '/config';
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

exports.CreateProject = (path, projectName, projectInfo) => {
    fs.mkdirSync(path + '/' + projectName, {recursive: true});
    fs.mkdirSync(path + '/' + projectName + '/repository', {recursive: true});
    if (!fs.existsSync(path + '/' + projectName)) {

        console.log("\x1b[41m", 'Unable to create project directory.');
        return {status: false};
    }
    let projectFile = {
        id: global.appConfig.projectIdCounter,
        name: projectName,
        author: projectInfo.author,
        localPath: path + '/' + projectName,
        p2psystem: projectInfo.p2psystem,
        modules: projectInfo.modules,
        usersDB: "",
        repoDB: ""
    };
    fs.writeFileSync(path + '/' + projectName + '/config', JSON.stringify(projectFile));
    if (!fs.existsSync(path + '/' + projectName + '/config')) {
        console.log("\x1b[41m", 'Unable to create project config file.');
        return {status: false};
    }

    //project creation is successful
    global.appConfig.projectIdCounter++;
    global.appConfig.projects.push(projectFile);
    exports.SaveAppConfig();

    return {status: true, projectInfo: projectFile};
}

exports.GetProject = (projectId) => {
    let index = global.appConfig.projects.findIndex(i => i.id === projectId);
    if (index >= 0) {
        return global.appConfig.projects[index];
    }
    return null;
}

exports.CreateSwarmKey = (path) => {

}
exports.JoinProject = (swarmKey) => {
    fs.mkdirSync(global.userPath + '/newProject' + helpers.randomInt(0, 100), {recursive: true});
    let projectFile = {
        name: "newProject",
        author: "",
        p2psystem: "ipfs",
        modules: ['git'],
        usersDB: {},
        repoDB: {},
    };
    //write config file
    fs.writeFileSync(path + '/newProject' + '/config', projectFile);
    if (!fs.existsSync(path + '/newProject' + '/config')) {
        console.log("\x1b[41m", 'Unable to create project config file.');
        return {status: false};
    }
    //write swarmkey file
    fs.writeFileSync(path + '/newProject' + '/swarm.key', swarmKey);
    if (!fs.existsSync(path + '/newProject' + '/swarm.key')) {
        console.log("\x1b[41m", 'Unable to create project swarm key.');
        return {status: false};
    }
};
    exports.PublishLocalRepository = async (projectInfo) => {
        for await (const file of await global.node.node.add(projectInfo.localPath + '/repository')) {
            const db = await global.orbit.open(projectInfo.repoDB.address );
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
