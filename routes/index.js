const express = require('express');
let router = express.Router();
const p2pinterface = require('../app/p2p-system/interface')
const crypt = require('../app/misc/crypt');
const helpers = require('../app/misc/helpers');
/* GET home page. */

router.get('/', (req, res) => {

    let projectInfo = req.app.get('projectInfo');
    if (global.identity === undefined) {
        // we are not registered
        res.redirect('/user-auth');
    }

    if (global.projectInfo === undefined) {
        res.redirect('/setup');

    }

    res.render('home', {peer_id: projectInfo.id});

});

router.get('/user-auth', (req, res) => {

    let existingUser = !helpers.isEmptyObject(global.user);
    res.render('user-auth', {existingUser: existingUser});


});

router.post('/login', (req, res) => {


    if (global.projects.length === 0) {
        res.redirect('/setup');

    } else {
        let projectInfo = global.previousProject;

        (async () => {
            await p2pinterface.InitializeP2PSystem(projectInfo, global.appConfig.p2psystem);
        })();

        req.app.set('projectInfo', projectInfo);
        res.redirect('/user-auth');

        res.redirect('/');

    }


});

router.post('/register', (req, res) => {

    global.appConfig.user = {
        name: req.body.name,
        email: req.body.email,
        password: crypt.cryptPassword(req.body.password),
        folderPath: req.body.folderpath
    };

    global.identity = {
        name: req.body.name,
        network_validated: false
    }
    res.redirect('/setup');

});

router.post('/create_project', (req, res) => {
//very late to do: there should be some validation

    console.log(JSON.stringify(req.body));
    // let result = framework.CreateProject(req.body.project_path, req.body.project_name,{});

    if (result.status === true) {
        global.projectInfo = result.projectInfo;
        res.redirect('/');
    } else {
        console.log('Couldn\'t create project: ');
        res.redirect('/setup');
    }
});

router.get('/setup', (req, res) => {
    if (global.identity === undefined) {
        res.redirect('/user-auth');
    }
    res.render('project-start');

});
router.post('/join_project', (req, res) => {
    //TODO
});


module.exports = router;
