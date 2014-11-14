// Global duckburg namespace.
var duckburg = duckburg || {};

/*
 * Object containing all requests for duckburg.
 * This will connect with Parse's methods to help
 * create Parse data objects.
 */
duckburg.requests = {

  /*
   * saveObject will save or update any object that Parse
   * knows about.  It accepts an object type, a list of fields
   * that contain corresponding values, as well as success and error
   * callbacks.
   *
   */

  saveObject: function(objectType, fields, successCb, errorCb, existingObject) {

    var newItem;

    // Function will update an existing object.
    if (existingObject) {
      newItem = existingObject;

    // Function will update an existing object.
    } else {
      var DbObject = Parse.Object.extend(objectType);
      var newItem = new DbObject();
    }

    // Get the model object so we can take a look at it.
    var model = duckburg.models[objectType];

    // Empty search string.  This is stored as a unique value, and is used
    // to search through object records.
    var searchString = '';

    // Iterate over all the fields in this form.
    for (var i = 0; i < fields.length; i++) {

      // Capture field id and value.  id will be the 'key' used in the database,
      // which the value will be mapped to.
      var field = fields[i];
      var id = field.id;
      var val = field.value || '';

      // Make sure it is a valid property of the model.
      if (model.values[id]) {

        // Set the value on the new object.
        if (model.values[id].input == 'checkbox') {
          val = field.checked ? 'yes' : 'no';
        }
        newItem.set(id, val);

        // Add the item to the search string if neccessary.
        if (duckburg.requests.isValidSearchString(id, val)) {
          searchString += ' ' + val;
        }
      }
    }

    // Set search string if it has content.
    newItem.set('parse_search_string', searchString);

    // Save the dang thing.
    newItem.save(null, {
      success: function(result) {
        successCb(result)
      },
      error: function(error) {
        errorCb(error);
      }
    });
  },

  // Determine if this field should be stored as a searchable value.
  isValidSearchString: function(id, val) {

    // Don't take urls as search strings.
    if (val.search('http://') != -1 || val == '') {
      return false;
    }

    // Ignore this field.
    if (id == 'customer_is_salesperson') {
      return false;
    }

    return true;
  },

  // Find objects based on type, such as dbCustomer.  Allow for passing of
  // filters if neccessary.
  findObjects: function(objectType, successCb, errorCb, filters) {

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
      // query.matches('parse_search_string', duckburg.searchFilters);
    }

    // Perform the queries and continue with the help of the callback functions.
    query.find({
      success: function(results) {
        successCb(results);
      },
      error: function(error) {
        errorCb(error.message);
      }
    });
  },

  /*
   * Functionality for creating new users.
   *
   */
  users: {

    create: function() {

      // var user = new Parse.User();
      // user.set("username", "my name");
      // user.set("password", "my pass");
      // user.set("email", "email@example.com");
      // user.set("role", "adminorwhat?");
      //
      // user.signUp(null, {
      //   success: function(user) {
      //     // Hooray! Let them use the app now.
      //   },
      //   error: function(user, error) {
      //     // Show the error message somewhere and let the user try again.
      //     alert("Error: " + error.code + " " + error.message);
      //   }
      // });
    },

    login: function(username, pass, successCb, errorCb) {
      Parse.User.logIn(username, pass, {
        success: function(user) {

          // Set logged in user as current user.
          duckburg.curUser = Parse.User.current();
          duckburg.curUser.setACL(new Parse.ACL(user));
          successCb(user);
        },
        error: function(user, error) {
          errorCb(user, error);
        }
      });
    },

    logout: function() {
      Parse.User.logOut();
      location.reload();
    }
  },


  /*
   * Functionality for upload files
   *
   */
  files: {

    save: function(fileInput, successCb) {

      var fileUploadControl = $("#" + fileInput)[0];

      if (fileUploadControl.files.length > 0) {

        var file = fileUploadControl.files[0];

        var name = 'design_image.jpg';
        var parseFile = new Parse.File(name, file);

        parseFile.save().then(function(url) {
          var msg = 'File saved!';
          duckburg.successMessage(msg);
          duckburg.currentlySavingImage = false;
          successCb(url);
        }, function(error) {
          var msg = 'Something went wrong: ' + error.message;
          duckburg.errorMessage(msg);
          duckburg.currentlySavingImage = false;
        });
      }
    }
  }
};
