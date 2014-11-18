// ******************************************
// Main route handler.
// __________________________________________

module.exports = function(app, passport) {

	//***********************
	//***********************
	//**** MAIN PAGE ********
	//***********************
	//***********************
	app.get('/', function(req, res) {

			// Render something to a jade template.
			res.render('index.jade', { user : req.user });
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

	//***********************
	//***********************
	//**** ORDER VIEW *******
	//***********************
	//***********************
	app.get('/order', function(req, res) {

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

};
