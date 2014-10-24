// ******************************************
// Schema for Orders.
// __________________________________________

var mongoose = require('mongoose');

var Model = function() {

    var _schemaModel = mongoose.Schema({

        label: String

    });

    var _model = mongoose.model('Model', _schemaModel);

    var _createNew = function(modelObject, callback) {
        _model.create(modelObject, function(err, doc) {
            if (err) {
                fail(err);
            } else {
                callback(doc);
            }
        });
    };

    var _findById = function(id, callback) {
        _model.findOne({ '_id' : id}, function(err, doc) {
            if (err) {
                fail(err);
            } else {
                callback(doc);
            }
        });
    }

    return {
        createNew: _createNew,
        findById: _findById,
        schema: _schemaModel,
        model: _model
    }
}();

module.exports = Model;
