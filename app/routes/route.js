// ******************************************
// Main route handler.
// __________________________________________

module.exports = function(app, passport) {

	// HOME
	app.get('/', function(req, res) {
			// Render something to a jade template.
			res.render('index.jade', { user : req.user });
	});

};
