var express = require('express');
var router = express.Router();
const helpers = require('../app/misc/helpers');
/* GET home page. */
router.get('/', (req, res) => {

// The render method takes the name of the HTML
// page to be rendered as input
// This page should be in the views folder
// in the root directory.
//     if (req.app.locals.node.identity === undefined) {
        //we are not registered
        // res.redirect('/register')
    // }

    res.render('home', {peer_id: global.node.id});

});

router.get('/register', (req, res) => {
    res.render('register');


});
router.get('/failedlogin', (req, res) => {
    res.send('failed to login');


});
router.get('/successlogin', (req, res) => {
    res.send('logged in ! ' + JSON.stringify(helpers.ReadConfigFile(global.node.repoInfo)));


});
const passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
        clientID: '383957423713-tsket8uav1tmrmue132un5qbvp7t4djq.apps.googleusercontent.com',
        clientSecret: '-DwVt7unW7TFbMsmWl4hl_3H',
        callbackURL: "http://localhost:3000/successlogin"
    },
    function (accessToken, refreshToken, profile, cb) {
        console.log('storing the tokenz');
        helpers.StoreTokens('google', accessToken, refreshToken, global.node.repoInfo, global.node);
        User.findOrCreate({googleId: profile.id}, function (err, user) {
            return cb(err, user);
        });
    }
));
router.get('/login',
    passport.authenticate('google', {scope: ['profile']}));

router.get('/login/callback',
    passport.authenticate('google', {failureRedirect: '/failedlogin'}),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('http://localhost:3000/');
    });
module.exports = router;
