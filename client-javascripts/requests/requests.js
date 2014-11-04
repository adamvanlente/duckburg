// Global duckburg namespace.
var duckburg = duckburg || {};

/*
 * Object containing all requests for duckburg.
 * This will connect with Parse's methods to help
 * create Parse data objects.
 */
duckburg.requests = {

  suppliers: {
    create: function() {
      duckburg.requests.common.genericSave('DuckburgSupplier', 'Supplier');
    }
  },

  colors: {
    create: function() {
      duckburg.requests.common.genericSave('DuckburgColor', 'Color');
    }
  },

  designs: {
    create: function() {
      duckburg.requests.common.genericSave('DuckburgDesign', 'Design');
    }
  },

  products: {

    create: function() {
      duckburg.requests.common.genericSave('DuckburgProduct', 'Product');
    }
  },

  customers: {

    create: function() {
      duckburg.requests.common.genericSave('DuckburgCustomer', 'Customer');
    }
  },

  catalog_item: {

    create: function() {
      duckburg.requests.common.genericSave(
          'DuckburgCatalogItem', 'Catalog Item');
    }
  },

  licensing_type: {

    create: function() {
      duckburg.requests.common.genericSave(
          'DuckburgLicensingType', 'Licensing type');
    }
  },

  shipping_methods: {

    create: function() {
      duckburg.requests.common.genericSave(
          'DuckburgShippingMethod', 'Shipping methods');
    }
  },

  job_status: {

    create: function() {
      duckburg.requests.common.genericSave(
          'DuckburgJobStatus', 'Job status');
    }
  },

  /*
   * Functions for making requests to create/save customers.
   * This inlcudes functionality for determining if customer/email address
   * is already present in the system.  Allows us to check if customer
   * exists is some form, and if we should replace them.
   */
  customers_old: {

    create: function() {

      if (duckburg.parseEditingObject) {

        for (var i = 0; i < duckburg.currentFormFields.length; i++) {
          var field = duckburg.currentFormFields[i];
          var newValue = $('#' + field).val();
          if (field == 'first_name' || field == 'last_name') {
            newValue = duckburg.utils.toTitleCase(newValue);
          }
          duckburg.parseEditingObject.set(field, newValue);
        }

        duckburg.parseEditingObject.save(null, {
          success: function() {
            var name = duckburg.parseEditingObject.attributes.first_name;
            var msg = 'Customer ' + name + ' updated!';
            duckburg.successMessage(msg);
            duckburg.forms.common.closeCurrentForm();
            duckburg.utils.clearSearchFilters();
            duckburg.views.customers.load();
          }
        });
        return false;
      }
      // Set customer properties.
      var custObject = {};
      for (var i = 0; i < duckburg.currentFormFields.length; i++) {
        var field = duckburg.currentFormFields[i];
        var value = $('#' + field).val();

        custObject[field] = value;
      }

      // Extend parse object.
      var Customer = Parse.Object.extend('DuckburgCustomer');

      // New instance of customer.
      var newCust = new Customer();

      // These are the two items needed to save to Parse.  Hold them in memory.
      duckburg.requests.memory = [];
      duckburg.requests.memory.push(newCust);
      duckburg.requests.memory.push(custObject);

      // Confirm that this customer does not already exist in DB.
      this.confirmNew(custObject);
    },

    // Confirm that the customer is new.
    confirmNew: function(custObj) {
      var Customer = Parse.Object.extend("DuckburgCustomer");

      // check if customer with this first/last name is in the system
      var query = new Parse.Query(Customer);
      query.equalTo("first_name", custObj.first_name);
      query.equalTo("last_name", custObj.last_name);

      query.find({
        success: function(results) {
          if (results.length == 0) {

            // If no matches, check for duplicate email address
            query = new Parse.Query(Customer);
            query.equalTo("email_address", custObj.email_address);
            query.find({
              success: function(results) {
                if (results.length == 0) {
                  duckburg.requests.customers.save();
                } else {
                  var msg = 'Found customer(s) with that same email:';
                  duckburg.requests.customers.existingCustomerMessage(
                      msg, results);
                }
              }
            });
          } else {
            var msg = 'Found customer(s) with that same name:';
            duckburg.requests.customers.existingCustomerMessage(msg, results);
          }
        }
      });
    },

    // Let the user know that customers with these details exist, confirm that
    // they want to save the cust.
    existingCustomerMessage: function(msg, results) {

      // Reveal the div that informs user of duplicate customers.
      var messageDiv = $('.existingCustomerMessage');
      messageDiv.attr('class', 'existingCustomerMessage visible');

      // Div for the specific message.
      var contentDiv = $('#existingCustomerMessageContent');
      contentDiv.html(msg);

      // Div for list of existing customers.
      var custDiv = $('#existingCustomerList');
      custDiv.html('');

      // Show the user the list of customers.
      for (var i = 0; i < results.length; i++) {
        var cust = results[i].attributes;
        var firstName = cust.first_name;
        var lastName = cust.last_name;
        var email = cust.email_address;

        custDiv.append($('<span>').html(firstName));
        custDiv.append($('<span>').html(lastName));
        custDiv.append($('<span>').html(email));
      }

      // Add listeners to the form buttons.
      $('.createExistingCustomer').click(function() {
        duckburg.requests.customers.save();
      });

      $('.cancelAddingCustomer').click(function() {
        duckburg.forms.common.closeCurrentForm();
      });

    },

    // Save a customer.
    save: function(parseCust, custObj) {
      parseCust = parseCust || duckburg.requests.memory[0];
      custObj = custObj || duckburg.requests.memory[1];

      // Save the new customer.
      parseCust.save(custObj, {
        success: function(cust) {
          var msg = custObj.first_name + ' is now a customer!  Nice.';
          duckburg.successMessage(msg);
          duckburg.forms.common.closeCurrentForm();
        },
        error: function(cust, error) {
          var errorMsg = 'Something went horribly wrong.  No!! (' +
              error.message + ')'
          duckburg.errorMessage(errorMsg);
        }
      });
    },

    find: function(queryParams, successCb) {

      var Customer = Parse.Object.extend("DuckburgCustomer");

      // check if customer with this first/last name is in the system
      var query = new Parse.Query(Customer);

      if (duckburg.searchFilters) {

        var filter = duckburg.searchFilters;

        var firstNameQuery = new Parse.Query("DuckburgCustomer");
        firstNameQuery.startsWith('first_name',
            duckburg.utils.toTitleCase(filter));

        var lastNameQuery = new Parse.Query("DuckburgCustomer");
        lastNameQuery.startsWith('last_name',
            duckburg.utils.toTitleCase(filter));

        var emailQuery = new Parse.Query("DuckburgCustomer");
        emailQuery.startsWith('email_address', filter);

        query = Parse.Query.or(firstNameQuery, lastNameQuery, emailQuery);
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
    }
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
