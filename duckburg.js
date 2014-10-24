// Add neccessary modules.
var express      = require('express');
var port         = 3000;
var mongoose     = require('mongoose');
var path         = require('path');

var morgan       = require('morgan');
var session      = require('express-session');
var passport     = require('passport');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var configDB     = require('./config/database.js');

// Set up the express application.
var app = express();
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser());

// Connect to database.
mongoose.connect(configDB.url);

// Get Passport set up.
require('./config/passport')(passport);
app.use(session({ secret: 'SOME_APP_SECRET' }));
app.use(passport.initialize());
app.use(passport.session());

// Setup a public directory for scripts/assets that will serve client side.
app.use(express.static(path.join(__dirname, 'public')));

// Set Jade as the templating engine.
app.set('view engine', 'jade');

// Pass app and passport to routes.
require('./app/routes/route.js')(app);
require('./app/routes/login_routes.js')(app, passport);
require('./app/routes/order_routes.js')(app);
require('./app/routes/customer_routes.js')(app);

// 404 redirect
app.use(function(req, res, next) {
    res.render('404.jade');
});

// Launch app
app.listen(port);
console.log('The app is running on port', port);
