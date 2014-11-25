// Global duckburg namespace.
var duckburg = duckburg || {};

/**
 * Shared utilities for all of duckburg.
 * @module Utilities used for all parts of duckburg.
 *
 */
duckburg.utils = {

  // Some page link globals.
  homePage: 'http://localhost:3000',
  loginPage: 'http://localhost:3000/login',

  /**
   * Object for new object callbacks
   *
   * There are many times a new object can be created.  Below is a mapping
   * of strings to actual functions.  This object allows us to pass around a
   * string that can represent a callback function.
   *
   */
  newObjectCallbackFunctions: {
    objectPage: duckburg.objects.newObjectCreated,
  },

  /**
   * Check for an existing user.
   * @event On load of page, confirms that there
   *        is an active user, or forwards to a login
   *        page if not.
   *
   */
  checkForUser: function() {

    // Determine if we're looking at the login page.
    var isLoginPage = window.location.pathname == '/login';

    // While we're here, add a listener to the login button.
    if (isLoginPage) {
      $(document).keypress(function(e) {
          if (e.which == 13) {
              duckburg.utils.login();
          }
      });
    }

    duckburg.curUser = Parse.User.current();

    // Determine if there is a user or not.
    if (duckburg.curUser) {

      // Get user role.
      var role = duckburg.curUser.attributes.role;

      if (isLoginPage) {
        window.location.href = duckburg.utils.homePage;
      }

      // Set username in the UI.
      var userName = duckburg.curUser.attributes.username;
      var userContent = userName + '<i class="fa fa-sign-out"></i>';
      $('#current_user')
        .html(userContent)
        .click(function() {
          duckburg.utils.logout();
        });

      // Load the menu
      duckburg.menu.load();

      // Load the current view.
      duckburg.utils.currentView(role);

    } else {

      if (!isLoginPage) {
        duckburg.utils.logout();
      }
    }
  },

  /**
   * Current view
   * @function loads the current view for the page based on the path.
   * @param role Role of the current user (string)
   *
   */
  currentView: function(role) {

    // Get the current pathname/route.
    var route = window.location.pathname;

    // Keep unauthorized users out of admin areas.
    var adminOnlyRoutes = [
      '/users',
      '/objects'
    ];

    // Send (non admin) user back to the hompage if they're trying to acccess
    // unauthorized routes above.
    if (role != 'admin' && adminOnlyRoutes.indexOf(route) != -1) {
      window.location.href = duckburg.utils.homePage;
    }

    // View handler for routes.
    if (route == '/users') {
      duckburg.users.loadUserView();
    } else if (route == '/objects') {
      duckburg.objects.loadObjectView();
    }
  },

  /**
   * Log a user in.
   * @function logs a user in using Parse API.
   * @param username String, user's name
   * @param pass String, user's password
   *
   */
   login: function(username, pass, successCb, errorCb) {

      // Get username and password.
      username = username || $('#login_form_username').val();
      pass = pass || $('#login_form_pass').val();

      Parse.User.logIn(username, pass, {
        success: function(user) {

          // Set logged in user as current user.
          duckburg.curUser = Parse.User.current();
          duckburg.curUser.setACL(new Parse.ACL(user));
          window.location.href = duckburg.utils.homePage;
        },
        error: function(user, error) {
          duckburg.utils.errorMessage(error.message);
        }
      });
    },

  /**
   * Log an existing user out.
   * @event Automatically logs out user.
   *
   */
  logout: function() {
    Parse.User.logOut();
    window.location.href = duckburg.utils.loginPage;
  },

  /**
   * Popup that allows user to request a password
   * reset email.
   */
  forgotPasswordPopup: function() {

    // Reveal the popup div.
    duckburg.utils.showPopup();

    $('#popupContent')
      .attr('class', 'forgotPasswordPopup')

      // Append a label to confirm the user wants to reset password.
      .append($('<label>')
        .html('Enter your email address to reset your password.'))

      // Append an input where the email address can be entered.
      .append($('<input>')
        .attr('type', 'text')
        .attr('id', 'forgotPasswordEmailAddress')
        .attr('placeholder', 'email address'))

      // Append a button to kick off the action.
      .append($('<button>')
        .html('reset password')
        .click(function() {
          duckburg.utils.resetPassword();
          duckburg.utils.hidePopup();
        }))

      // Link to cancel the action.
      .append($('<em>')
        .html('cancel')
        .click(function() {
          duckburg.utils.hidePopup();
        }));
  },

  /**
   * Send a message to reset a password.
   * @function sends user a password reset email
   */
  resetPassword: function(emailAddress) {

    // Get the email address.
    emailAddress = emailAddress || $('#forgotPasswordEmailAddress').val();

    // Make the request to Parse.
    Parse.User.requestPasswordReset(emailAddress, {
      success: function() {
        var successMessage =
            'Email containting reset information has been sent.'
        duckburg.utils.successMessage(successMessage);
      },
      error: function(error) {
        var errorMessage = 'Error with reset request: ' + error.message
        duckburg.utils.errorMessage(errorMessage);
      }
    });
  },

  /**
   * Show the popup
   * @function reveals the popup div, which contains a content span
   *           that is dynamically styled/filled with content.
   */
  showPopup: function() {
    $('#popupDiv')
      .show();

    $('#popupContent')
      .html('');
  },

  /**
   * Hide the popup div.
   * @function hides the globally used popup div.
   *
   */
  hidePopup: function() {
    $('#popupDiv').hide();
  },

  /**
   * Error message.
   * @function launches error message for user.
   * @param message String message
   *
   */
  errorMessage: function(message) {
    duckburg.utils.messageHandler(message, 'error');
  },

  /**
   * Success message.
   * @function launches success message for user.
   * @param message String message
   *
   */
  successMessage: function(message) {
    duckburg.utils.messageHandler(message, 'success');
  },

  /**
   * Message handler.
   * @param message String message
   * @param type String type of error message.
   *
   */
   messageHandler: function(message, type) {

     // Reveal the message holder, give it the correct type and message.
     $('.messageHolder')
       .attr('class', 'visible messageHolder ' + type)
       .html(message);

     // Hide the message div after a timer expires..
     setTimeout(function() {
        var className = $('.messageHolder').attr('class');
        className = className.replace('visible', 'invisible');
        $('.messageHolder')
          .attr('class', className);
      }, 3000);
   },

   /**
    * Create a form for a new object.
    * @function creates a form for a new object.
    * @param type String type of model for which to create form.
    * @param callbackString String maps to function in object
    *                              newObjectCallbackFunctions
    *
    */
   createNewObjectForm: function(type, callbackString) {

     // Define the current model.
     var model = duckburg.models[type];

     // Show the popup.
     duckburg.utils.showPopup();

     // Set the class of the inner popup to be a form.
     $('#popupContent')
       .attr('class', 'newObjectFormPopup')
       .append($('<h3>')
         .html(model.display_name));

     // Append the form fields.
     duckburg.utils.appendFormFields(model.values);

     // Append the buttons.
     $('#popupContent')
       .append($('<span>')
         .attr('class', 'objectFormButtonHolder')

         // Cancel button.
         .append($('<button>')
           .html('cancel')
           .attr('class', 'cancelNewObjectForm')
           .click(function() {
             duckburg.utils.hidePopup();
           }))

         // Submit button.
         .append($('<button>')
           .html('create')
           .attr('id', callbackString)
           .attr('name', type)
           .attr('class', 'submitNewObjectForm')
           .click(function(e) {
             duckburg.utils.prepareNewObjectForCreation(e);
           })
         )
      );
   },

   /**
    * Prepare a new object for creation.
    * @function takes values from a form to prepare to create a new item.
    * @param event Object dom event of clicked form submit button.
    *
    */
   prepareNewObjectForCreation: function(event) {

     // Get the object function for creating a new object.
     var cbFunctionString = event.currentTarget.id;
     var cbFunc = duckburg.utils.newObjectCallbackFunctions[cbFunctionString];

     // Get the type of object
     var type = event.currentTarget.name;

     // Create an object that will hold all of our values.
     var itemObj = {};

     // Fill the object with the form values.
     $('[name="object_form_item"]').each(function() {
       if (this.type == 'checkbox') {
         itemObj[this.id] = String(this.checked);
       } else {
         itemObj[this.id] = this.value;
       }
     });

     // Send the object, type and callback to another function.
     duckburg.requests.createNewObject(type, itemObj, cbFunc);

   },

   /**
    * Append some form fields to the form.
    * @function appends form fields to an empty form.
    * @params Array a list of parameters and additional details about them.
    *
    */
    appendFormFields: function(params) {

      // Iterate over all params, such as item_name or product_color.
      for (var param in params) {

        // Get the parameter detials, such as is_required, or placeholder
        var fieldDetails = params[param];

        // Get the type of intput
        var typeOfInput = fieldDetails.input == 'date' ?
            'text' : fieldDetails.input;

        if (fieldDetails.input == 'textarea') {

          // Append the texarea.
          $('#popupContent')
            .append($('<textarea>')
              .attr('id', param)
              .attr('name', 'object_form_item')
              .attr('class', fieldDetails.input_size)
              .attr('placeholder', fieldDetails.placeholder));

        } else if (fieldDetails.input == 'checkbox') {

           // Append a label and a checkbox
           $('#popupContent')
             .append('<br>')
             .append($('<label>')
               .attr('class', 'objectFormCheckboxLabel')
               .html(fieldDetails.placeholder))
             .append($('<input>')
               .attr('id', param)
               .attr('name', 'object_form_item')
               .attr('type', typeOfInput));

        } else {

          // Append a regular text/email/etc input.
          $('#popupContent')
            .append($('<input>')
              .attr('id', param)
              .attr('type', typeOfInput)
              .attr('name', 'object_form_item')
              .attr('class', fieldDetails.input_size)
              .attr('placeholder', fieldDetails.placeholder));
        }

        // Create Highsmith calendars for all fields.
        if (fieldDetails.input == 'date') {
           var calConfig = {
             style: {
               disable: true
             },
             killButton: true
           };
           var dueCal = new Highsmith(param, calConfig);
        }
      }
    }
};
