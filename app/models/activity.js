// ******************************************
// Schema for Orders.
// __________________________________________

var mongoose = require('mongoose');

var Activity = function() {

    var _schemaModel = mongoose.Schema({

        order_id          : String,
        customer          : String,
        type              : String,
        additional_notes  : String,
        timestamp         : Date

    });

    var _model = mongoose.model('Activity', _schemaModel);

    var _createNew = function(orderObject, callback) {

        _model.create(orderObject, function(err, doc) {
            if(err) {
                fail(err);
            } else {
                callback(doc);
            }
        });
    };

    var _findActivities = function(id, callback) {

        _model.find({ '_id' : id }, function(err, doc) {
            if (err) {
                fail(err);
            } else {
                callback(doc);
            }
        });

    }


    return {
        createNew: _createNew,
        findActivities: _findActivities,
        schema: _schemaModel,
        model: _model
    }
}();

module.exports = Activity;
