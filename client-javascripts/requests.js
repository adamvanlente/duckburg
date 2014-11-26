// DuckBurg namespace.
var duckburg = duckburg || {};

/**
 * Requests
 * @modele main list of Parse requests
 *
 */
duckburg.requests = {

  /**
   * Create a new object
   * @function makes a new Parse object of a given type.
   * @param objectType String type of object
   * @param params Object key value pairs of object params & values.
   * @param existingObj Object optional argument for updating an existing item.
   *
   */
  createNewObject: function(objectType, params, successCb, existingObj) {

    // Initialize a newItem and verb to explain what happened.
    var newItem;
    var verb;

    // Function will update an existing object.
    if (existingObj) {
      newItem = existingObj;
      verb = 'updated';

    // Function will create a new object.
    } else {
      var DbObject = Parse.Object.extend(objectType);
      newItem = new DbObject();
      verb = 'created';
    }

    // Empty search string.  This is stored as a unique value, and is used
    // to search through object records.
    var searchString = '';

    // Set the params of the item.
    for (var param in params) {
      if (param != 'parse_search_string') {
        newItem.set(param, params[param]);
        searchString += params[param];
      }
    }

    // Set search string if it has content.
    newItem.set('parse_search_string', searchString.toLowerCase());

    // Save the dang thing.
    newItem.save(null, {
      success: function(result) {
        var msg = 'New object ' + verb;
        duckburg.utils.successMessage(msg);
        successCb(result);
      },

      error: function(result, error) {
        var errorMsg = 'Error creating new object: ' + error.message;
        duckburg.utils.errorMessage(errorMsg);
      }
    });
  },

  /**
   * Get an object by its id.
   * @function simple Parse find event for an object with known type & id.
   * @param id String id of item in Parse db
   * @param type String type of db item.
   * @successCb Object function for success.
   *
   */
  findById: function(id, type, successCb) {
    var Item = Parse.Object.extend(type);
    var query = new Parse.Query(Item);

    query.get(id, {
      success: function(result) {
        successCb(result);
      },
      error: function(object, error) {
        duckburg.utils.errorMessage(error.message);
      }
    });
  },

  /**
   * Find objects
   * @function get objects of a certain type
   * @param objectType String type of object as know to Parse
   * @param filters String string of filters to search for
   * @param successCb Function success function
   * @param itemsToReturn Array items you might want to send with initial
   *        function call and have returned back with success callback.
   *
   */
  findObjects: function(objectType, filters, successCb, itemsToReturn) {

    // Build a query from the object type.
    var DbObject = Parse.Object.extend(objectType);
    var query = new Parse.Query(DbObject);

    // Perform logic for filtering results.  Filtering throughout DuckBurg is
    // made possible by the convention of the 'parse_search_string'.  For every
    // object saved to the database, we create a single parameter which is a
    // searchable string, containing all searchable elements of an object.  For
    // instance, 'parse_search_string' for a customer contains the customer
    // name, email, address, phone number, etc.  This will certainly use more
    // database space, but it greatly simplifies the logic for filtering a
    // list of items and quickly displaying matching results.
    if (filters) {
      query.matches('parse_search_string', filters.toLowerCase());
    }

    // Always sort newest first.
    query.descending("updatedAt");

    // Perform the queries and continue with the help of the callback functions.
    query.find({
      success: function(results) {
        successCb(results, itemsToReturn);
      },
      error: function(result, error) {
        var errorMsg = 'Error gettting objects: ' + error.message;
        duckburg.utils.errorMessage(errorMsg);
      }
    });
  },

  /**
   * Find orders
   * @function find orders
   * @param statuses Array of statuses to look for
   * @param sortParam String param to sort by, eg item_name
   * @param sortDirection, either asc or dsc
   * @param filters String search params to filter by
   * @param successCb Object function for success
   *
   */
  findOrders: function(statuses, sortParam, sortDirection, filters, successCb) {

    // Build a query from the object type.
    var DbObject = Parse.Object.extend('dbOrder');
    var query = new Parse.Query(DbObject);

    // Check for filters.
    if (filters) {
      query.matches('parse_search_string', filters.toLowerCase());
    }

    // Set sort direction, and which param to sort by.
    if (sortDirection == 'asc') {
      query.ascending(sortParam);
    } else {
      query.descending(sortParam);
    }

    // Make sure we are only getting the statuses we want.
    query.containedIn("order_status", statuses);

    // Perform the queries and continue with the help of the callback functions.
    query.find({
      success: function(results) {
        successCb(results);
      },
      error: function(result, error) {
        var errorMsg = 'Error gettting objects: ' + error.message;
        duckburg.utils.errorMessage(errorMsg);
      }
    });
  },

  /**
   * Save a file
   * @function saves a file that has just been selected with an input.
   * @param fileInput Object dom element for a file selector
   * @param successCb Object function for success.
   *
   */
  saveFileFromInput: function(fileInput, successCb) {

    // Get the list of files.
    if (fileInput.files.length > 0) {

      // Get the file, give it a name and a Parse instance.
      var file = fileInput.files[0];
      var name = 'design_image.jpg';
      var parseFile = new Parse.File(name, file);

      // Save the file and send it back, or throw error.
      parseFile.save().then(function(response) {
        successCb(response);
      },

      function(reuslt, error) {
        duckburg.errorMessage(error.message);
      });
    } else {

      // Return, but with nothing.
      successCb(false);
    }
  }


};
