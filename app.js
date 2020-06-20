let createError = require('http-errors');
let express = require('express');
let ejs = require('ejs');


let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');

let app = express();

let indexRouter = require('./routes/index');
let usersRouter = require('./routes/users');
let nodeIpfsRouter = require('./routes/node-info');
let extensionRouter = require('./routes/extension');

require('events').defaultMaxListeners = 30;
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
var session = require('express-session');
app.use(session({secret: 'mySecret', resave: false, saveUninitialized: false}));
app.use(logger('dev', {
    skip: function (req, res) { return res.statusCode < 400 }
}));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname + '/public'));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/node', nodeIpfsRouter);
app.use('/extension', extensionRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    console.log(JSON.stringify(err))
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error', {error: err.toString(), stack: err.stack.toString()});
});

//check config files
let framework = require('./app/misc/framework');

if (framework.CheckAppConfig()) {
    framework.LoadAppConfig();
} else {
    framework.CreateAppConfig();
}
module.exports = app;
