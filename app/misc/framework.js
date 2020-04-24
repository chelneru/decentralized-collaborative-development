const os = require('os');

exports.LoadAppConfig = () => {
    global.userPath = os.homedir() + '/distcollab';
    let configPath = global.userPath + '/config.json';

    try {
        if (fs.existsSync(configPath)) {
            global.appConfig = JSON.parse(fs.readFileSync(configPath, 'UTF-8'));
        }
    } catch (err) {
        console.log('Error reading app config file: ', err);
    }
};

exports.CreateAppConfig = () => {
    global.userPath = os.homedir() + '/distcollab';
    let configPath = global.userPath + '/config.json';
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

exports.CreateProject = (path, projectName, projectInfo) => {
    fs.mkdirSync(path + '/' + projectName, {recursive: true});
    if (!fs.existsSync(path + '/' + projectName)) {

        console.log("\x1b[41m", 'Unable to create project directory.');
        return {status: false};
    }
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

    return {status: true,projectInfo:projectFile};
}
