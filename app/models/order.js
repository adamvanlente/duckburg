// ******************************************
// Schema for Orders.
// __________________________________________

var mongoose = require('mongoose');

var Order = function() {

    var _schemaModel = mongoose.Schema({

        due_date          : Date,
        created           : Date,
        job_name          : String,
        status            : String,
        job_comments      : String,
        shipment_id       : String,
        billing_customer  : String,
        shipping_customer : String,
        subtotal          : Number,
        balance           : Number

    });

    var _model = mongoose.model('Order', _schemaModel);

    var _createNew = function(orderObject, callback) {

        _model.create(orderObject, function(err, doc) {
            if(err) {
                fail(err);
            } else {
                callback(doc);
            }
        });
    };

    var _orderCount = function(callback) {

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

    var _updateOrder = function(id, orderObject, callback) {
      _model.findOne({ '_id' : id }, function(err, order) {
          if (err) {
              fail(err);
          } else {
              for (var item in orderObject) {
                  order[item] = orderObject[item];
              }
              order.save();
              callback(order);
          }
      });
    }


    return {
        createNew: _createNew,
        findById: _findById,
        orderCount: _orderCount,
        updateOrder: _updateOrder,
        schema: _schemaModel,
        model: _model
    }
}();

module.exports = Order;
