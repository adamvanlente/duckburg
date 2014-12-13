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
	//* CUSTOM PAGE SAMPLES *
	//***********************
	//***********************
	app.get('/customPageSamples', function(req, res) {
		res.render('customPageSamples.jade');
	});

	//***********************
	//***********************
	//**** PRINTING *********
	//***********************
	//***********************
	app.get('/printing', function(req, res) {
		res.render('printing.jade');
	});

	//***********************
	//***********************
	//**** FINANCES *********
	//***********************
	//***********************
	app.get('/finances', function(req, res) {
		res.render('finances.jade');
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
	//**** ASSETS PAGE ******
	//***********************
	//***********************
	app.get('/assets', function(req, res) {
		res.render('assets.jade');
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
	//**** PAGE MAKER *******
	//***********************
	//***********************
	app.get('/pages', function(req, res) {
		res.render('pageMaker.jade');
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
