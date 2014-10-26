// ******************************************
// Route handler for logins.
// __________________________________________

var User       		   = require('../models/user');

module.exports = function(app, passport) {

    // ====================================
    // ====================================
    // GET USERS LIST JSON ================
    // ====================================
    // ====================================
    app.get('/json/users', function(req, res) {

        User.findAll(function(users) {

            if (req.user) {
              renderResponse(users, true, res);
            } else {
              renderResponse({}, false, res);
            }

        })
    });


    function renderResponse(doc, success, res) {

        var response      = {};
        response.results  = doc;
        response.success  = success;
        res.json(response);

    }

};
