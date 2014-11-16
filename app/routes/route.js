// ******************************************
// Main route handler.
// __________________________________________

module.exports = function(app, passport) {

	// HOME
	app.get('/', function(req, res) {

			// Render something to a jade template.
			res.render('index.jade', { user : req.user });
	});

	app.get('/make/:objectType', function(req, res) {

			// Type of object to make.
			var objectType = req.params.objectType;

			// Render something to a jade template.
			res.render('index.jade', { object : objectType });
	})

};
