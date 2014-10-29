// Add neccessary modules.
var express      = require('express');
var port         = 3000;
var path         = require('path');

var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');

// Set up the express application.
var app = express();
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser());

// Setup a public directory for scripts/assets that will serve client side.
app.use(express.static(path.join(__dirname, 'public')));

// Set Jade as the templating engine.
app.set('view engine', 'jade');

// Pass app and passport to routes.
require('./app/routes/route.js')(app);

// 404 redirect
app.use(function(req, res, next) {
    res.render('404.jade');
});

// Launch app
app.listen(port);
console.log('The app is running on port', port);
