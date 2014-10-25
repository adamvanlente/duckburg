// ******************************************
// Route for API explorer.
// __________________________________________

var Customer       		   = require('../models/customer');
var Order                = require('../models/order');

module.exports = function(app, passport) {

  // HOME
  app.get('/explorer', function(req, res) {
      if (req.user) {

        var endpoints = {

          'Customer': Customer,
          'Order'   : Order

        }

        var explorerObj = {};

        for (var endpoint in endpoints) {

            explorerObj[endpoint] = {};
            explorerObj[endpoint]["functions"] = [];

            for (var item in endpoints[endpoint]) {

                if (item != 'model' && item != 'schema') {
                    explorerObj[endpoint]["functions"].push(item);
                }

                if (item == 'schema') {

                    var schema = endpoints[endpoint][item].paths;
                    explorerObj[endpoint]["schema"] = [];
                    for (var param in schema) {
                        explorerObj[endpoint]["schema"].push(param);
                    }
                }
            }
        }

        res.json(explorerObj);
      } else {
        res.render('index.jade', { user : req.user });
      }
  });

};
