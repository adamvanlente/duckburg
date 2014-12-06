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
	//**** INVOICE **********
	//***********************
	//***********************
	app.get('/invoice/:orderId', function(req, res) {
		res.render('invoice.jade');
	});

	//***********************
	//***********************
	//**** PRINTING *********
	//***********************
	//***********************
	app.get('/printing', function(req, res) {
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
	//***** NEW ORDER *******
	//***********************
	//***********************
	app.get('/order', function(req, res) {
			res.render('order.jade');
	});

	//***********************
	//***********************
	//***** VIEW ORDER ******
	//***********************
	//***********************
	app.get('/order/:orderNumber', function(req, res) {
			res.render('order.jade');
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
	//**** ORDER MAKER ******
	//***********************
	//***********************
	app.get('/make', function(req, res) {
		res.render('orderMaker.jade');
	});

	//***********************
	//***********************
	//**** ORDER MAKER ******
	//***********************
	//***********************
	app.get('/dos', function(req, res) {
		res.render('dailyOrderSheet.jade');
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
