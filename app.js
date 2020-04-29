var createError = require('http-errors');
var express = require('express');
var ejs = require('ejs');


var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var app = express();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var nodeIpfsRouter = require('./routes/node-info');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
var session = require('express-session');
app.use(session({secret: 'mySecret', resave: false, saveUninitialized: false}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname + '/public'));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/node', nodeIpfsRouter);

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
