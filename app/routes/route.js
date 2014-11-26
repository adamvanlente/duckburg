// ******************************************
// Main route handler.
// __________________________________________

// Get the Parse API set up.
var config 				= require('../config');

var Parse 				= require('parse').Parse;
Parse.initialize(config.key, config.token);

module.exports = function(app) {

	//***********************
	//***********************
	//**** MAIN PAGE ********
	//***********************
	//***********************
	app.get('/', function(req, res) {
			res.render('orderList.jade');
	});

	//***********************
	//***********************
	//**** USERS PAGE *******
	//***********************
	//***********************
	app.get('/users', function(req, res) {
			res.render('users.jade');
	});

	//***********************
	//***********************
	//**** OBJECTS PAGE *****
	//***********************
	//***********************
	app.get('/objects', function(req, res) {
			res.render('objects.jade');
	});

	//***********************
	//***********************
	//***** MAKE OBJECT *****
	//***********************
	//***********************
	app.get('/makeObject/:objectType', function(req, res) {
			res.render('objects.jade');
	});

	//***********************
	//***********************
	//***** VIEW OBJECT *****
	//***********************
	//***********************
	app.get('/viewObject/:objectType/:objectId', function(req, res) {
			res.render('objects.jade');
	});

	//***********************
	//***********************
	//**** LOGIN PAGE *******
	//***********************
	//***********************
	app.get('/login', function(req, res) {
			res.render('login.jade');
	});


	//***********************
	//***********************
	//***** ORDER VIEW ******
	//***** BY ORDER ID *****
	//***********************
	// app.get('/order/:orderId', function(req, res) {
	//
	// 		// Type of object to make.
	// 		var id = req.params.orderId;
	//
	// 		res.render('index.jade', { order : id });
	// });
};
