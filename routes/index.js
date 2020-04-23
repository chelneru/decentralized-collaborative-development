var express = require('express');
var router = express.Router();
var crypt =  require('../app/misc/crypt')
const helpers = require('../app/misc/helpers');
/* GET home page. */
router.get('/', (req, res) => {

// The render method takes the name of the HTML
// page to be rendered as input
// This page should be in the views folder
// in the root directory.
    if (global.node.identity === undefined) {
        // we are not registered
        res.redirect('/user-auth');
    }

    res.render('home', {peer_id: global.node.id});

});

router.get('/user-auth', (req, res) => {

    let existingUser = global.user !== undefined;
    res.render('user-auth', {existingUser: existingUser});


});

router.post('/login', (req, res) => {
    res.render('user-auth')


    if(global.projects.length === 0) {
        res.redirect('/setup');

    }
    else {
        
    }


});

router.post('/register', (req, res) => {
    global.tempUser = {
        name: req.body.name,
        email:req.body.email,
        password:crypt.cryptPassword(req.body.password),
        folderPath:req.body.folderpath
    };

    res.redirect('/setup');

});


module.exports = router;
