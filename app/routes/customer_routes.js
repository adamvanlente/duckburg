// ******************************************
// Route handler for orders.
// __________________________________________

var Customer   = require('../models/customer');
var Activity   = require('../models/activity');

module.exports = function(app) {

    // CREATE
    // http://localhost:3000/customer/create/adam/VL/adam@retroduck.com/6164055424/nil/lineone/ln2/ln3/holland/mi/494923/usa/retroduck/some%20notes/NA

    // UPDATE
    // http://localhost:3000/customer/update/adam/VanLente/adam@retroduck.com/6164055424/nil/lineone/ln2/ln3/holland/mi/494923/usa/retroduck/some%20notes/5449b7ab1150f1c826000001

    // Create an order.
    app.post('/customer/:action/:firstName/:lastName/:email/:phone/:phoneTwo/:a/:a2/:a3/:city/:state/:zip/:country/:org/:notes/:custId', function(req, res) {

        var action                     = req.params.action;
        var custId                     = req.params.custId;

        var newCustomer                = {};
        newCustomer.first_name         = req.params.firstName;
        newCustomer.last_name          = req.params.lastName;
        newCustomer.email              = req.params.email;
        newCustomer.phone              = req.params.phone;
        newCustomer.phone_two          = req.params.phoneTwo;
        newCustomer.address_line_one   = req.params.a;
        newCustomer.address_line_two   = req.params.a2;
        newCustomer.address_line_three = req.params.a3;
        newCustomer.address_city       = req.params.city;
        newCustomer.address_state      = req.params.state;
        newCustomer.address_zip        = req.params.zip;
        newCustomer.address_country    = req.params.country;
        newCustomer.organization       = req.params.org;
        newCustomer.notes              = req.params.notes;

        if (action == 'create') {

            newCustomer.create         = new Date();

            Customer.createNew(newCustomer, function(json) {

                var response     = {};
                response.success = true;
                response.result  = json;

                res.json(response);
            });
        } else if (action == 'update') {

            Customer.updateCustomer(custId, newCustomer, function(json) {

                var response     = {};
                response.success = true;
                response.result  = json;

                res.json(response);
            });
        }
    });
};
