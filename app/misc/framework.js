const os = require('os');
const generator = require('js-ipfs-swarm-key-gen');
const helpers = require('./helpers')
const crypt = require('./crypt');

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

exports.SaveAppConfig = () => {
    let configPath = global.userPath + '/config';

    if (fs.existsSync(configPath)) {
        global.appConfig = JSON.parse(fs.writeFileSync(JSON.stringify(global.appConfig)));
    }
}
exports.CreateAppConfig = () => {
    global.userPath = os.homedir() + '/distcollab';
    let configPath = global.userPath + '/config';
    let initialConfig = {
        previousProject: '',   //this will be the name of the project
        projects: [],   //an array of projects metadata
        user: {},
        p2psystem: 'ipfs' //this is the only option for now
    };
    global.appConfig = initialConfig;
    fs.writeFileSync(configPath, initialConfig);
};

exports.LoadProjectsMetadata = () => {
    global.projects = global.appConfig.projects;
};

exports.Authenticate = (email,password) => {
    let existingEmail = global.appConfig.user.email;
    let existingHashedPassword = global.appConfig.user.password;
    if(email.toLowerCase() === existingEmail) {
        crypt.comparePassword(password,existingHashedPassword, (err, same) => {
            if (same) {
               return true;
            }
            return false;

        });
    }
    return false;

}

exports.CreateProject = (path, projectName, projectInfo) => {
    fs.mkdirSync(path + '/' + projectName, {recursive: true});
    if (!fs.existsSync(path + '/' + projectName)) {

        console.log("\x1b[41m", 'Unable to create project directory.');
        return {status: false};
    }

    generator(path + '/' + projectName+'/swarm.key').then(() => console.log('Swarm key generated.'));
    let projectFile = {
        name: projectName,
        author: projectInfo.author,
        p2psystem: projectInfo.p2psystem,
        modules: projectInfo.modules,
        usersDB: "",
        repoDB: ""
    };

    fs.writeFileSync(path + '/' + projectName + '/config', projectFile);
    if (!fs.existsSync(path + '/' + projectName + '/config')) {
        console.log("\x1b[41m", 'Unable to create project config file.');
        return {status: false};
    }

    return {status: true, projectInfo: projectFile};
}

exports.JoinProject = (swarmKey) => {
    fs.mkdirSync(global.userPath + '/newProject' + helpers.randomInt(0,100), {recursive: true});
    let projectFile = {
        name: "newProject",
        author: "",
        p2psystem: "ipfs",
        modules: ['git'],
        usersDB: "",
        repoDB: ""
    };
    //write config file
    fs.writeFileSync(path + '/newProject'  + '/config', projectFile);
    if (!fs.existsSync(path + '/newProject'  + '/config')) {
        console.log("\x1b[41m", 'Unable to create project config file.');
        return {status: false};
    }
    //write swarmkey file
    fs.writeFileSync(path + '/newProject'  + '/swarm.key', swarmKey);
    if (!fs.existsSync(path + '/newProject'  + '/swarm.key')) {
        console.log("\x1b[41m", 'Unable to create project swarm key.');
        return {status: false};
    }

}
