const readline = require('readline-sync');
const moment = require('moment');
const fs = require('fs');
var app = require('../../app');


exports.GetInput = (message) => {
    return readline.question(message);
};

exports.InitializeConfig = (repoPath) => {
    let config = {};
    // config.name = this.GetInput("Insert the name:\n");
    config.name = 'Alin';
    config.created_at = moment().format();
    config.auth_token = null;
    config.public_hash = null;
    config.main_folder_addr = null;
    config.git_module_addr = null;
    app.locals.config = config;
    fs.writeFileSync(repoPath+'/config.json', JSON.stringify(config));
};

exports.UpdateConfig = (repoPath) => {
    if (app.locals.config !== undefined) {
        fs.writeFileSync(repoPath+'/config.json', JSON.stringify(app.locals.config));
    }
};
exports.ReadConfigFile = () => {

    try {
        app.locals.config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } catch (err) {
        console.log('Error reading config file', err.toString());
    }
};

