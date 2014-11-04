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
      if (duckburg.utils.isSearchableValue(field, value)) {
        searchString += value.toLowerCase() + ' ';
      }
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

    // Always sort newest first.
    query.descending("createdAt");

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
      if (duckburg.utils.isSearchableValue(field, newValue)) {
        searchString += newValue.toLowerCase() + ' ';
      }
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

        duckburg.requests.common.activityLog(stringId, 'updated');
      },
      error: function(error) {
        duckburg.requests.common.activityLog(
            stringId, 'NOT updated', error.message);
      }
    });
  },

  saveParseObject: function(newParseObject, newObject, stringId) {
    newParseObject.save(newObject, {
      success: function(newItem) {
        var msg = 'New ' + stringId + ' created.';
        duckburg.successMessage(msg);
        duckburg.filterPopupCurrentResults = newItem;
        if (duckburg.filteringInput) {
          duckburg.forms.inputs.placeStringInsideInput()
        }

        duckburg.forms.common.closeCurrentForm();

        // If we're in list view, refresh the current list.
        var insideListView = false;
        $('.addNewItemListViewButton').each(function() {
          insideListView = true;
        });
        if (insideListView) {
          duckburg.views[duckburg.currentListView].load();
        }

        duckburg.requests.common.activityLog(stringId, 'saved');

      },
      error: function(error) {
        var msg = 'Something went wrong ' + error.message;
        duckburg.errorMessage(msg);
        duckburg.forms.common.closeCurrentForm();
        duckburg.requests.common.activityLog(
            stringId, 'NOT saved', error.message);
      }
    });
  },

  activityLog: function(type, method, msg) {
    var Activity = Parse.Object.extend("DuckburgActivity");
    var activityLog = new Activity();

    var currentUserName = duckburg.curUser.attributes.username;

    // String message, such as 'A product was saved by adam'.
    var summary = 'An ' + type + ' was ' + method + ' by ' + currentUserName;
    activityLog.set("summary", summary);
    activityLog.set("user", currentUserName);

    if (msg) {
      activityLog.set("msg", msg);
    }

    activityLog.save(null, {
      success: function(logItem) {
        // activity logged
      },
      error: function(logItem, error) {
        var msg = 'Something is failing on the activity log: ' + error.message;
        duckburg.errorMessage(msg);
      }
    });

  }
};
