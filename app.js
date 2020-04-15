var createError = require('http-errors');
var express = require('express');
var ejs = require('ejs');
var cors = require('cors');

var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');


var app = express();
app.use(cors());

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var nodeIpfsRouter = require('./routes/node-info');
let IpfsSystem = require('./app/p2p-system/ipfs-p2p-system');
let helpers = require('./app/misc/helpers');
(async () => {
//do initial stuff

    // global.node = await IpfsSystem.create();
    //
    // console.log('\x1b[33m%s\x1b[0m','we set the node ', global.node.id);
})();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

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


module.exports = app;
