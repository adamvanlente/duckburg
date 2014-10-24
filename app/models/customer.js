// ******************************************
// Schema for Orders.
// __________________________________________

var mongoose = require('mongoose');

var Customer = function() {

    var _schemaModel = mongoose.Schema({

        first_name          : String,
        last_name           : String,
        email               : String,
        phone               : String,
        phone_two           : String,
        address_line_one    : String,
        address_line_two    : String,
        address_line_three  : String,
        address_city        : String,
        address_state       : String,
        address_zip         : String,
        address_country     : String,
        organization        : String,
        notes               : String,
        created             : Date

    });

    var _model = mongoose.model('Customer', _schemaModel);

    var _createNew = function(customerObject, callback) {

        _model.create(customerObject, function(err, doc) {
            if(err) {
                fail(err);
            } else {
                callback(doc);
            }
        });
    };

    var _custCount = function(callback) {

        _model.find(function(err, doc) {
            if (err) {
                fail(err);
            } else {
                callback(doc.length);
            }
        });

    }

    var _findById = function(id, callback) {
        _model.findOne({ '_id' : id}, function(err, doc) {
            if(err) {
                fail(err);
            } else {
                callback(doc);
            }
        });
    }

    var _updateCustomer = function(id, custObject, callback) {
      _model.findOne({ '_id' : id }, function(err, customer) {
          if (err) {
              fail(err);
          } else {

              for (var item in custObject) {
                  customer[item] = custObject[item];
              }
              customer.save();
              callback(customer);
          }
      });
    }

    return {
        createNew: _createNew,
        findById: _findById,
        custCount: _custCount,
        updateCustomer: _updateCustomer,
        schema: _schemaModel,
        model: _model
    }
}();

module.exports = Customer;
