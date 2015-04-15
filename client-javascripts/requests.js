// DuckBurg namespace.
var duckburg = duckburg || {};

/**
 * Requests
 * @module main list of Parse requests
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

        // Set value, and remove any $ characters, as there are many currency
        // fields throughout DuckBurg.
        var value = params[param];

        if (typeof value == 'string' && typeof value == 'number') {
          value = String(value);
          value = value.replace(/\$/g, '');
        }

        // Add to the search string.
        if (String(value) != '' && String(value).search('http://') == -1) {
          searchString += value;
        }

        // Set the parameter value of the new items.
        newItem.set(param, value);
      }
    }

    // Assemble a 'full name' if its a customer.
    if (objectType == 'dbCustomer') {
      var firstName = params.first_name || '';
      var lastName = params.last_name || '';
      lastName = lastName == '' ? lastName : ' ' + lastName;
      var fullName = firstName + lastName;
      newItem.set('full_name', fullName);
    }

    // Set search string if it has content.
    newItem.set('parse_search_string', searchString.toLowerCase());

    // Save the dang thing.
    newItem.save(null, {
      success: function(result) {
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
      error: function(error) {
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

  findLedgerItems: function(type, successCb) {

    // Build a query from the object type.
    var DbObject = Parse.Object.extend('dbLedgerItem');
    var query = new Parse.Query(DbObject);

    // Match type.
    query.matches('type', type);

    // Always sort newest first.
    query.descending("createdAt");

    // Perform the queries and continue with the help of the callback functions.
    query.find({
      success: function(results) {
        successCb(results);
      },
      error: function(error) {
        var errorMsg = 'Error gettting ledger items: ' + error.message;
        duckburg.utils.errorMessage(errorMsg);
      }
    });
  },

  /**
   * Fetch an order
   * @function fetches an order using our local, readable id.
   * @param orderId String readable order id
   * @param successCb Object function for success
   *
   */
  fetchOrderById: function(orderId, successCb) {

    // Instantiate an order.
    var Order = Parse.Object.extend('dbOrder');
    var query = new Parse.Query(Order);

    // Refine based on order id.
    query.equalTo("readable_id", orderId);

    // Get the order.
    query.find({
      success: function(order) {
        successCb(order);
      },
      error: function(error) {
        duckburg.utils.errorMessage(error.message);
        successCb([]);
      }
    });
  },

  /**
   * Count objects
   * @function get a count of all objects
   * @param type String type of object to count
   *
   */
   countObjects: function(type, successCb) {

     // Determine type.
     var Obj = Parse.Object.extend(type);
     var query = new Parse.Query(Obj);

     // Get the count.
     query.count({
       success: function(count) {
         successCb(count);
       },
       error: function(error) {
         duckburg.utils.errorMessage(error.message);
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
        successCb(response, fileInput);
      },

      function(reuslt, error) {
        duckburg.errorMessage(error.message);
      });
    } else {

      // Return, but with nothing.
      successCb(false);
    }
  },

  /**
   * Add an entry to the order log.
   * @function adds a log entry showing that the order has been updated.
   * @param orderId String parse id of order.
   * @param orderJson String json string of order details.
   * @param username String name of user who was active in the session
   *
   */
   addOrderLogEntry: function(orderId, orderJson, username) {

     // Instantiate order log.
     var DbObject = Parse.Object.extend('dbOrderLog');
     newItem = new DbObject();

     // Store order id, json and current user.
     newItem.set('order_id', orderId);
     newItem.set('order_json', orderJson);
     newItem.set('user', username);

     // Save the dang thing.
     newItem.save(null, {
       success: function(result) {
         // logged order.
       },

       error: function(result, error) {
         var msg = 'error logging order changes: ' + error.message;
         duckburg.utils.errorMessage(msg);
       }
     });
   },

   /**
    * Make a payment on an order
    * @function Logs an payment.
    * @param orderId String id of order
    * @param amount Float amount to pay.
    * @param method String payment method
    * @param user String username of active user
    * @param orderName String order name
    * @param successCb Object function for success.
    *
    */
    orderPayment: function(
        orderId, amount, method, user, orderName, successCb) {

      // Order Payment item
      var DbPaymentObject = Parse.Object.extend('dbOrderPayment');
      newPayment = new DbPaymentObject();

      // Store order id, json and current user.
      newPayment.set('order_id', orderId);
      newPayment.set('amount', amount);
      newPayment.set('method', method);
      newPayment.set('user', user);

      // Save the dang thing.
      newPayment.save(null, {
        success: function(result) {
          var msg = 'Payment of $' + amount + ' logged.';
          duckburg.utils.successMessage(msg);
          successCb();
        },
        error: function(result, error) {
          var errMsg = 'Error logging payment: ' + error.message;
          duckburg.utils.errorMessage(errMsg);
        }
      });

      // New ledger item.
      var DbLedgerItem = Parse.Object.extend('dbLedgerItem');
      newLedger = new DbLedgerItem();

      // Ledger props.
      var date = new Date();
      newLedger.set('ledger_item_date', date);
      newLedger.set('amount', amount);
      newLedger.set('method', method);
      newLedger.set('name', orderName);
      newLedger.set('type', 'income');

      // Save the dang thing.
      newLedger.save(null, {
        success: function(result) {
          // Saved ledger item
        },
        error: function(result, error) {
          // didn't save ledger item.
        }
      });
    },

    /**
     * Get order payments.
     * @function get all payments for an order.
     * @param orderId String Parse id for order.
     * @param successCb Object function for success
     *
     */
    getOrderPayments: function(orderId, successCb) {

      // Build a query from the object type.
      var DbObject = Parse.Object.extend('dbOrderPayment');
      var query = new Parse.Query(DbObject);
      query.matches('order_id', orderId);

      // Always sort newest first.
      query.descending("updatedAt");

      // Perform the queries and continue with the help of the callback functions.
      query.find({
        success: function(results) {
          successCb(results);
        },
        error: function(error) {
          var errorMsg = 'Error gettting objects: ' + error.message;
          duckburg.utils.errorMessage(errorMsg);
        }
      });
    }

};
