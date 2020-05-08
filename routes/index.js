const express = require('express');
let router = express.Router();
const p2pinterface = require('../app/p2p-system/interface')
const crypt = require('../app/misc/crypt');
const helpers = require('../app/misc/helpers');
const framework = require('../app/misc/framework');
const path = require('path');

/* GET home page. */

router.get('/', async (req, res) => {
    let projectInfo = null;
    if (global.identity === undefined) {
        // we are not registered
        console.log(' on / route there is no identity');
        return res.redirect('/user-auth');
    }
    if (global.projectInfo === undefined) {
        if (global.appConfig.previousProject !== undefined) {
            let index = framework.GetProject(global.appConfig.previousProject.id);
            if(index !== null) {
                global.projectInfo = global.appConfig.projects[index];

            }
        }
    }
    if (global.projectInfo == undefined) {
        console.log(' on / route there is no project');

        return res.redirect('/setup');

    }
    if (global.node === undefined) {
            await p2pinterface.InitializeP2PSystem({localPath:path.join(global.projectInfo.localPath,'.jsipfs'),bootstrap:global.projectInfo.bootstrapNodes}, 'ipfs');
    }
    if (global.orbit === undefined) {
            await p2pinterface.InitializeOrbitInstance(global.projectInfo.localPath);
    }
    global.appConfig.previousProject = global.projectInfo;
    framework.SaveAppConfig();


    framework.StartExtensionModules(global.projectInfo);

    return res.render('home', {projectInfo: global.projectInfo});

});

router.get('/user-auth', (req, res) => {

    let existingUser = !helpers.isEmptyObject(global.appConfig.user);
    return res.render('user-auth', {existingUser: existingUser,frameworkPath:global.userPath});


});

router.post('/login', (req, res) => {
    if (framework.Authenticate(req.body.email, req.body.password)) {
        global.identity = global.appConfig.user;
        if (global.appConfig.projects.length === 0) {
            return res.redirect('/setup');
        } else {
            global.projectInfo = global.appConfig.previousProject;
            return res.redirect('/');
        }
    } else {
        return res.redirect('/user-auth');
    }
});

router.post('/register', (req, res) => {


    global.appConfig.user = {
        name: req.body.name,
        email: req.body.email.toLowerCase(),
        folderPath: req.body.folderpath
    };
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(req.body.password, salt, function(err, hash) {
            // Store hash in your password DB.
            global.appConfig.user.password = hash;
            framework.SaveAppConfig();

        });
    });

    global.identity = {
        name: req.body.name,
        network_validated: false
    }
    return res.redirect('/setup');

});

router.post('/create_project',async (req, res) => {
//very late to do: there should be some validation

    let modules = [];
    if(req.body.git_ext === "on") {
        modules.push({name:'git',hasDB:true});
    }
    if(req.body.bug_ext === "on") {
        modules.push({name:'gitbug',hasDB:true});
    }
    if(req.body.message_ext === "on") {
        modules.push({name:'message',hasDB:true});
    }
    let result =await framework.CreateProject(req.body.project_path,req.body.project_name,modules,req.body.p2psystem);
    if(result.status === true) {
        return res.redirect('/');
    } else {
        console.log(result.message);
        return res.redirect('/setup');
    }
});

router.get('/setup', (req, res) => {
    if (global.identity === undefined) {
        return res.redirect('/user-auth');
    }
    res.render('project-start',{projectPath:global.userPath});

});
router.post('/join_project', (req, res) => {
    //TODO
    let result = framework.JoinProjectIPFS(req.body.project_name,req.body.swarm_key_content,req.body.project_path, req.body.bootstrap_nodes);
    if(result.status === true) {
        return res.redirect('/');
    } else {
        console.log(result.message);
        return res.redirect('/setup');
    }
});


module.exports = router;
