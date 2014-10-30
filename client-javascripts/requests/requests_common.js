// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.requests.common = {

  /*
   * Many objects have a generic flow.  They can share these two save/find
   * functions
   *
   */
  genericSave: function(objectName, stringId) {

    var searchString = '';
    // If editing an object, update and exit this method.
    if (duckburg.parseEditingObject) {
      this.updateParseObject(objectName, stringId);
      return false;
    }

    // Set object properties.
    var newObject = {};
    for (var i = 0; i < duckburg.currentFormFields.length; i++) {
      var field = duckburg.currentFormFields[i];
      var value = $('#' + field).val();

      // Sentance case for First & Last name.
      if (field == 'first_name' || field == 'last_name') {
        value = duckburg.utils.toTitleCase(value);
      }

      newObject[field] = value;
      searchString += value.toLowerCase() + ' ';
    }

    newObject.parse_search_string = searchString;

    // Extend parse object.
    var ParseObject = Parse.Object.extend(objectName);

    // New instance of object.
    var newParseObject = new ParseObject();

    this.saveParseObject(newParseObject, newObject, stringId);
  },

  genericFind: function(objectName, successCb) {

    var ParseObject = Parse.Object.extend(objectName);

    // check if customer with this first/last name is in the system
    var query = new Parse.Query(ParseObject);

    if (duckburg.searchFilters) {
        query.matches('parse_search_string', duckburg.searchFilters);
    }

    query.find({
      success: function(results) {

        successCb(results);
        duckburg.searchOcurred = false;
      },
      error: function(error) {
        duckburg.errorMessage(error.message);
      }
    });
  },

  updateParseObject: function(objectName, stringId) {

    var searchString = ''
    for (var i = 0; i < duckburg.currentFormFields.length; i++) {
      var field = duckburg.currentFormFields[i];
      var newValue = $('#' + field).val();

      // Sentance case for First & Last name.
      if (field == 'first_name' || field == 'last_name') {
        newValue = duckburg.utils.toTitleCase(newValue);
      }
      searchString += newValue.toLowerCase() + ' ';
      duckburg.parseEditingObject.set(field, newValue);
    }

    duckburg.parseEditingObject.set('parse_search_string', searchString);

    duckburg.parseEditingObject.save(null, {
      success: function() {
        var msg = stringId + ' updated!';

        duckburg.successMessage(msg);
        duckburg.forms.common.closeCurrentForm();
        duckburg.utils.clearSearchFilters();
        duckburg.views[duckburg.currentView].load();
      }
    });
  },

  saveParseObject: function(newParseObject, newObject, stringId) {
    newParseObject.save(newObject, {
      success: function(newItem) {
        var msg = 'New ' + stringId + ' created.';
        duckburg.successMessage(msg);
        duckburg.forms.common.closeCurrentForm();
      },
      error: function(error) {
        var msg = 'Something went wrong ' + error.message;
        duckburg.errorMessage(msg);
        duckburg.forms.common.closeCurrentForm();
      }
    });
  }
};
