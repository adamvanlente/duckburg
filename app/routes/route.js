// ******************************************
// Main route handler.
// __________________________________________

// Get the Parse API set up.
var config 				= require('../config');

var Parse 				= require('parse').Parse;
Parse.initialize(config.key, config.token);

// Import some helpers.
var orderSaver 		= require('../orderSaver');

module.exports = function(app) {

	//***********************
	//***********************
	//**** MAIN PAGE ********
	//***********************
	//***********************
	app.get('/', function(req, res) {
			// Render something to a jade template.
			res.render('index.jade');
	});


	//***********************
	//***********************
	//***** ORDER VIEW ******
	//***** BY ORDER ID *****
	//***********************
	app.get('/order/:orderId', function(req, res) {

			// Type of object to make.
			var id = req.params.orderId;

			// Render something to a jade template.
			res.render('index.jade', { order : id });
	});

	// Same route for plural 'orders'.
	app.get('/orders/:orderId', function(req, res) {

			// Type of object to make.
			var id = req.params.orderId;

			// Render something to a jade template.
			res.render('index.jade', { order : id });
	});

	//***********************
	//***********************
	//**** ORDER VIEW *******
	//***********************
	//***********************
	app.get('/order', function(req, res) {

			// Render something to a jade template.
			res.render('index.jade', { order : 'newOrder' });
	});

	// Same route for plural 'orders'.
	app.get('/orders', function(req, res) {

			// Render something to a jade template.
			res.render('index.jade', { order : 'newOrder' });
	});

	//***********************
	//***********************
	//**** MAKE AN OBJECT ***
	//***********************
	//***********************
	app.get('/make/:objectType', function(req, res) {

			// Type of object to make.
			var objectType = req.params.objectType;

			// Render something to a jade template.
			res.render('index.jade', { object : objectType });
	});


	// Saving an order.
	app.get('/saveOrder/', function(req, res) {

			var json;
			for (var item in req.query) {
				json = JSON.parse(item);
			}

			if (json.id) {
				orderSaver.saveOrder(json, res, Parse);
			} else {
				orderSaver.createOrder(json.obj, res, Parse);
			}

	});

};
