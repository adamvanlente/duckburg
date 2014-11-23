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

  saveObject: function(objectType, fields, successCb, errorCb) {

    // New item is the object bring created or updated.  Verb is one of those
    // two words to describe what is happening to the item.
    var newItem;
    var verb;

    // Function will update an existing object.
    if (duckburg.forms.currentlyEditingObject) {
      newItem = duckburg.forms.currentlyEditingObject;
      verb = 'updated';
    // Function will update an existing object.
    } else {
      var DbObject = Parse.Object.extend(objectType);
      newItem = new DbObject();
      verb = 'created';
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
    newItem.set('parse_search_string', searchString.toLowerCase());

    // Save the dang thing.
    newItem.save(null, {
      success: function(result) {
        successCb(result, verb)
      },
      error: function(result, error) {
        errorCb(error.message);
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
      query.matches('parse_search_string', filters.toLowerCase());
    }

    // Always sort newest first.
    query.descending("createdAt");

    // Perform the queries and continue with the help of the callback functions.
    query.find({
      success: function(results) {
        successCb(results);
      },
      error: function(result, error) {
        errorCb(error.message);
      }
    });
  },

  // Find an order.  First check for readable id, then for the actual id.
  findOrder: function(id) {

    // Build query using readable id as search param.
    var DbObject = Parse.Object.extend('dbOrder');
    var query = new Parse.Query(DbObject);

    query.matches('readable_id', id);

    // Look for the order with the readable id.
    query.find({
      success: function(order) {

        // Id was readable order id.
        if (order.length == 1) {
          duckburg.fillOrder.begin(order[0]);
        } else {

          // Order not found with this id as readable id.  Perform an additional
          // search using the parse ID.
          var DbObject = Parse.Object.extend('dbOrder');
          var query = new Parse.Query(DbObject);

          // Use Parse ID.
          query.get(id, {
            success: function(result) {
              if (result) {
                  duckburg.fillOrder.begin(result);
              } else {

                // No order exists with this parse id.
                var msg = 'Unable to locate this order.  Check the number.';
                duckburg.errorMessage(msg);
              }
            },
            error: function(result, error) {

              // No order exists with this parse id.
              duckburg.errorMessage('Order not found.  Check the number.');
            }
          });
        }

      },
      error: function(result, error) {
        duckburg.errorMessage(error.message);
      }
    });
  },

  // Quickly get an item using its id.
  quickFind: function(objectType, successCb, id, itemId, pKey) {

    // Build a query from the object type.
    var DbObject = Parse.Object.extend(objectType);
    var query = new Parse.Query(DbObject);

    // Perform the queries and continue with the help of the callback functions.
    query.get(id, {
      success: function(results) {
        if (!itemId || !pkey) {
          successCb(results);
        } else {
          successCb(results, itemId, pKey);
        }
      },
      error: function(result, error) {
        duckburg.errorMessage(error.message);
      }
    });
  },

  // Quickly get a customer using its id.
  findCustomer: function(customer, successCb) {

    // Customer can be object or string id.
    var id = typeof customer == 'object' ? customer.id : customer;

    // Get a customer record.  Return along with the response the customer
    // params sent for search.
    var DbObject = Parse.Object.extend('dbCustomer');
    var query = new Parse.Query(DbObject);

    // Perform the queries and continue with the help of the callback functions.
    query.get(id, {
      success: function(results) {
        successCb(results, customer);
      },
      error: function(result, error) {
        var msg = ' Issue fetching customer from DB (' + id + ')';
        duckburg.errorMessage(error.message + msg);
      }
    });
  },

  // Get a product.
  findProduct: function(id, successCb, element) {

    var DbObject = Parse.Object.extend('dbProduct');
    var query = new Parse.Query(DbObject);

    query.get(id, {
      success: function(results) {
        successCb(results, element);
      },
      error: function(result, error) {
        var msg = ' Issue fetching product from DB (' + id + ')';
        duckburg.errorMessage(error.message + msg);
      }
    });
  },

  // Get a Store
  findStore: function(id, successCb, element) {

    var DbObject = Parse.Object.extend('dbStorefront');
    var query = new Parse.Query(DbObject);

    query.get(id, {
      success: function(results) {
        successCb(results, element);
      },
      error: function(result, error) {
        var msg = ' Issue fetching store from DB (' + id + ')';
        duckburg.errorMessage(error.message + msg);
      }
    });
  },

  // Quickly get a customer using its id.
  findCatalogItem: function(item, successCb) {

    // Customer can be object or string id.
    var id = typeof item == 'object' ? item.id : item;

    // Get a customer record.  Return along with the response the customer
    // params sent for search.
    var DbObject = Parse.Object.extend('dbCatalogItem');
    var query = new Parse.Query(DbObject);

    // Perform the queries and continue with the help of the callback functions.
    query.get(id, {
      success: function(results) {
        successCb(results, item);
      },
      error: function(result, error) {
        var msg = ' Issue fetching item from DB (' + id + ')';
        duckburg.errorMessage(error.message + msg);
      }
    });
  },

  // Quickly update a design's details.
  updateDesign: function(id, newDetails) {

    // Build a query from the object type.
    var DbObject = Parse.Object.extend('dbDesign');
    var query = new Parse.Query(DbObject);

    // Perform the queries and continue with the help of the callback functions.
    query.get(id, {
      success: function(result) {

        for (var detail in newDetails) {
          result.set(detail, newDetails[detail]);
        }
        result.save(null, {
          success: function(savedItem) {

            // Design was saved.
            var item = savedItem.attributes;
            item.id = savedItem.id;
          },
          error: function(result, error) {
            // pass
          }
        });
      },
      error: function(result, error) {
        duckburg.errorMessage(error.message);
      }
    });
  },

  // Get a list of orders with specific filters.
  fetchOrders: function(statuses, sortBy, sortOrder, filters, successCb) {

    // Build a query from the object type.
    var DbObject = Parse.Object.extend('dbOrder');
    var query = new Parse.Query(DbObject);

    if (filters) {
      query.matches('parse_search_string', filters.toLowerCase());
    }

    if (sortOrder == 'asc') {
      query.descending(sortBy);
    } else {
      query.ascending(sortBy);
    }

    query.containedIn("order_status", statuses);

    // Perform the queries and continue with the help of the callback functions.
    query.find({
      success: function(results) {
        successCb(results);
      },
      error: function(result, error) {
        duckburg.errorMessage(error.message);
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

    // Save a file.
    save: function(fileInput, successCb) {

      // Get the list of files.
      if (fileInput.files.length > 0) {

        // Get the file, give it a name and a Parse instance.
        var file = fileInput.files[0];
        var name = 'design_image.jpg';
        var parseFile = new Parse.File(name, file);

        // Save the file and send it back, or throw error.
        parseFile.save().then(function(response) {
          successCb(response, fileInput);
        },

        function(reuslt, error) {
          duckburg.errorMessage(error.message);
        });
      } else {

        // Return, but with nothing.
        successCb(false);
      }
    }
  }
};
