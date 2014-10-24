// ******************************************
// Schema for a record of a forgotten password
// __________________________________________

var mongoose = require('mongoose');

var ForgottenPass = function() {

    var _schemaModel = mongoose.Schema({

        email        : String,
        temp_code    : String,
    });

    var _model = mongoose.model('ForgottenPass', _schemaModel);

    var _createNew = function(userObject, callback) {
        _model.create(userObject, function(err, doc) {
            if(err) {
                fail(err);
            } else {
                callback(doc);
            }
        });
    };

    var _findByCode = function(code, callback) {
        _model.findOne({ 'temp_code' : code}, function(err, doc) {
            if(err) {
                fail(err);
            } else {
                callback(doc);
            }
        });
    }


    var _removeByCode = function(code, callback) {
        _model.findOne({ 'temp_code' : code}, function(err, doc) {
            if(err) {
                fail(err);
            } else {
                doc.remove();
                callback(doc);
            }
        });
    }

    return {
        createNew: _createNew,
        findByCode: _findByCode,
        _removeByCode: _removeByCode,
        schema: _schemaModel,
        model: _model
    }
}();

module.exports = ForgottenPass;
