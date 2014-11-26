// Global duckburg namespace.
var duckburg = duckburg || {};

/**
 * Shared utilities for all of duckburg.
 * @module Utilities used for all parts of duckburg.
 *         Also contains main functions for building object forms.
 *
 */
duckburg.utils = {

  /** Globals for different routes/destinations **/
  homePage: 'http://localhost:3000',
  loginPage: 'http://localhost:3000/login',

  /** Globals for sorting orders **/
  defaultSortStatuses: ['quote', 'open', 'approved', 'ordered'],
  defaultSortParam: 'due_date',
  defaultSortDirection: 'asc',


  orderStatusMap: {
    'quote': 'rgb(184, 184, 184)',
    'open': 'rgb(130, 153, 200)',
    'approved': '#66c08d',
    'ordered': 'rgb(195, 202, 87)',
    'received': 'rgb(226, 177, 101)',
    'printing': 'rgb(239, 116, 116)',
    'completed': 'rgb(54, 179, 202)',
   //  'shipped'
  },

  /**
   * Object for new object callbacks
   *
   * There are many times a new object can be created.  Below is a mapping
   * of strings to actual functions.  This object allows us to pass around a
   * string that can represent a callback function.  This is needed because
   * we want to use the same object building methods everywhere, but what
   * needs to be done after the creation of an object varies widely
   * throughout the admin area.
   *
   */
  newObjectCallbackFunctions: {

    // Callback for when a new object is created within the object area.
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
      '/users'
    ];

    // Send (non admin) user back to the hompage if they're trying to acccess
    // unauthorized routes above.
    if (role != 'admin' && adminOnlyRoutes.indexOf(route) != -1) {
      window.location.href = duckburg.utils.homePage;
    }

    // View handler for routes.
    if (route == '/') {

      // Main route, order list.
      duckburg.orderList.load();

    } else if (route == '/users') {

      // for Users route, just load user view.
      duckburg.users.loadUserView();
    } else if (route == '/objects') {

      // For objects route, load the basic object view.
      duckburg.objects.loadObjectView();
    } else if (route.search('/makeObject') != -1) {

      // To make an object, load object view and open an empty form.
      duckburg.objects.loadObjectView();

      // Get object type.
      var pathArray = window.location.pathname.split('/');
      var type = pathArray[pathArray.length - 1];
      duckburg.objects.launchNewObjectFormForType(type);

    } else if (route.search('/viewObject') != -1) {

      // To view an object, open an empty object form and then populate it.
      duckburg.objects.loadObjectView();

      // Get object type.
      var pathArray = window.location.pathname.split('/');
      var type = pathArray[pathArray.length - 2];
      var id = pathArray[pathArray.length - 1];
      duckburg.objects.launchNewObjectFormForType(type);

      duckburg.requests.findById(id, type, function(result) {
        duckburg.objects.populateObjectForm(result, type);
      });
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
             duckburg.objects.currentEditingItem = false;
           }))

         // Submit button.
         .append($('<button>')
           .html('save')
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

        } else if (fieldDetails.input == 'image') {


          $('#popupContent')

            // Append a file picker.
            .append($('<input>')
              .attr('type', 'file')
              .attr('id', param + '_file_picker')
              .attr('class', 'filePicker')
              .change(function(e) {
                duckburg.utils.addImageToNewObjectForm(e);
              }))

            // Append a hidden input.
            .append($('<input>')
              .attr('type', 'hidden')
              .attr('name', 'object_form_item')
              .attr('id', param))

            // Append an image holder div.
            .append($('<div>')
              .attr('id', param + '_img_holder')
              .attr('class', 'formImageHolder'));

        } else {
          duckburg.utils.createFormTextInput(param, fieldDetails);
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
    },

    /**
     * Add an image to the object form
     * @function When a user selects an image using a file picker, save the
     *           file and add it to the images in the form.
     * @param event Object change event from image picker.
     *
     */
    addImageToNewObjectForm: function(event) {

      // Image picker.
      var picker = event.currentTarget;
      var id = picker.id;

      // Elements that will hold the results of the new image being added.
      var elementToHoldUrls = id.replace('_file_picker', '');
      var elementToHoldImages = id.replace('_file_picker', '_img_holder');

      // Upload the file and grab its url.
      duckburg.requests.saveFileFromInput(picker, function(img) {

        // Get the url
        var url = img._url;

        // Get the array of images that exist already.
        var existingImgArray = $('#' + elementToHoldUrls).val().split(',');
        if (existingImgArray.length == 1 && existingImgArray[0] == '') {
          existingImgArray = [];
        }

        // Add the new image to the list.
        existingImgArray.push(url);

        // New list of images.
        var newImgList = existingImgArray.join(',');
        $('#' + elementToHoldUrls).val(newImgList);

        // Append the images to the div.
        var parent = $('#' + elementToHoldImages);
        duckburg.utils.addImagesToObjectFormElement(parent, existingImgArray);
      });
    },

    /**
     * Given a list of images, add them to a parent div.
     * @function takes a list of images and creates spans containing them.
     * @param parent Obj dom element to append images to
     * @param imgArray Array of image urls.
     *
     */
    addImagesToObjectFormElement: function(parent, imgArray) {

      if (typeof parent == 'string') {
        parent = $('#' + parent);
      }

      // Add visible spans containing images to the holder.
      parent.html('');

      for (var i = imgArray.length - 1; i >= 0; i--) {
        var img = imgArray[i];
        parent
          .append($('<span>')
            .css({'background': 'url(' + img + ')',
              'background-size': '100%'})

            .append($('<label>')
              .attr('class', 'delete')
              .html('remove')
              .attr('id', String(img))
              .click(function(e) {

                // Get the id of the img holder, url holder and get url.
                var parent = e.currentTarget.parentElement.parentElement.id;
                var urlHolderId = parent.replace('_img_holder', '');
                var url = e.currentTarget.id;

                // Create an img array, update it, and update the url list value.
                var imgArray = $('#' + urlHolderId).val().split(',');
                var index = imgArray.indexOf(url);
                imgArray.splice(index, 1);
                $('#' + urlHolderId).val(imgArray.join(','));

                // Update the images in the UI.
                duckburg.utils.addImagesToObjectFormElement(parent, imgArray);
              }))

            .append($('<label>')
              .attr('class', 'view')
              .attr('id', String(img))
              .html('view')
              .click(function(e) {

                // Capture the image.
                var img = e.currentTarget.id;
                duckburg.utils.revealImageViewerWithImage(img);

              })
            )
         );
      }
    },

    /**
     * Reveal the image viewer.
     * @function lets user view an image detail.
     * @param img String url of image.
     *
     */
    revealImageViewerWithImage: function(img) {

      // Show the offclicker and assign it click duties.
      $('.offClicker')
        .show()
        .click(function() {
          $('.offClicker').hide();
          $('.imgViewer').hide();
        })

      // Reveal the img viewer.
      $('.imgViewer')
        .show()
        .css({'background': 'url(' + img + ')',
          'background-size': '100%'});
    },

    /**
     * Create a text input for the form.
     * @function creates a text input for a new/existing object form.
     * @param param String paramter for the form item.
     * @param fieldDetails Object contains details about field or is null.
     *
     */
    createFormTextInput: function(param, fieldDetails) {

      // If a dbObject exists, that means this field must be populated by an
      // object that already exists in the database.  For example, if the object
      // being created is a t-shirt, and this field is the t-shirt color, then
      // color must come from the list of colors that already exist in the
      // database.  In this event, we create a hidden field to store that
      // obhect's (parse) ID, and a visible one to reveal the object's readable
      // primary key.  In addition, the visible input will be readonly, and
      // house a click event that allows the user to select the related item.
      if (fieldDetails.dbObject) {

        // Get the primary key off of the dbObject.
        var pKey = fieldDetails.dbObject.primary_key

        // Get the related type.
        var relType = fieldDetails.dbObject.type;

        // Visible input for primary key of object.
        $('#popupContent')
          .append($('<input>')
            .attr('id', pKey)
            .attr('type', 'text')
            .attr('name', 'object_form_item')
            .attr('class', fieldDetails.input_size)
            .attr('placeholder', fieldDetails.placeholder)

            // Set a click event for creating an item popup selector.
            .click(function(e) {
              duckburg.utils.launchRelatedItemSelector(e, pKey, relType, param);
            })

         );

        // Hidden input for parse ID.
        $('#popupContent')
          .append($('<input>')
            .attr('id', param)
            .attr('type', 'hidden')
            .attr('name', 'object_form_item'));

      } else {
        // Append a regular text/email/etc input.
        $('#popupContent')
          .append($('<input>')
            .attr('id', param)
            .attr('type', 'text')
            .attr('name', 'object_form_item')
            .attr('class', fieldDetails.input_size)
            .attr('placeholder', fieldDetails.placeholder));
      }
    },

    /**
     * Launch the related items selector.
     * @function when creating a new item, some form fields must be populated
     *           by existing database items.  The reveals a popup that lets
     *           the user select said related item.
     * @param e Object onclick event that creates the popup.
     * @param pKey String primary key of object being searched for
     * @param relType String type of object being searched for
     * @param origType String type of object being created from original form.
     *
     */
    launchRelatedItemSelector: function(e, pKey, relType, origType) {

      // Remove any existing popups.
      $('.inputPopupSelector').remove();

      // Show offclicker element.
      $('.offClicker')
        .show()
        .click(function() {
          $('.inputPopupSelector').remove();
          $('.offClicker').hide();
        });

      // Get location of mouse click.
      var x = e.pageX + 'px';
      var y = (e.pageY - 50) + 'px';

      // Set CSS styles for div.
      var css = {
          'position': 'absolute',
          'left': x,
          'top': y
        };

      // Conditions for iphones/smaller screens.
      var width = $(window).width();
      if (width < 500) {
        css = {
            'position': 'absolute',
            'left': '30px',
            'right': '30px',
            'top': '75px'
        }
      }

      // Create, style and append the div.
      var div = $('<div>')
        .css(css)
        .attr('class', 'inputPopupSelector');
      $(document.body).append(div);

      // Launch a function that fills in this element.
      duckburg.utils.loadHeaderForRelatedItemSelector(relType, pKey, origType);

      // Fill the div with possible selections.
      duckburg.utils.findRelatedObjectsWithType(relType, pKey, origType);
    },

    /**
     * Create header for related items selector
     * @function that creates header and all elements for related items popup.
     * @param objectType String type of object to search for.
     *
     */
    loadHeaderForRelatedItemSelector: function(objectType, pKey, origType) {

      var type = duckburg.models[objectType].display_name;

      $('.inputPopupSelector')
        .append($('<input>')
          .attr('class', 'filterForRelatedObjectPicker')
          .attr('placeholder', 'Select a ' + type)
          .keyup(function(e) {
            duckburg.utils.relatedObjectFilterSearch(
                objectType, pKey, origType, e);
          }));

      $('.inputPopupSelector')
        .append($('<a>')
          .html('+')
          .attr('href', '/makeObject/' + objectType)
          .attr('target', 'new')
          .attr('class', 'makeNewObjectInNewWindow'));

      $('.inputPopupSelector')
        .append($('<div>')
          .attr('class', 'relatedObjectResultsHolder'));
    },

    /**
     * Filter the results of a related object item search.
     * @function when selecting a related item for a new object, allows
     *           the user to filter the options.
     * @param objectType String type of object being searched for
     * @param pKey String primary key of related object
     * @param origType String original type of object being created
     * @param event Object keyup even of search field
     *
     */
    relatedObjectFilterSearch: function(objectType, pKey, origType, event) {

      // Check for a timer.
      if (duckburg.utils.relatedObjectFilterTimer) {
        window.clearInterval(duckburg.utils.relatedObjectFilterTimer);
      }

      // Set the timeout and perform a search.
      duckburg.utils.relatedObjectFilterTimer = setTimeout(function() {

        // Get search query.
        var search = event.currentTarget.value.toLowerCase();

        duckburg.utils.findRelatedObjectsWithType(
          objectType, pKey, origType, search);
      }, 500);
    },

    /**
     * Find related objects
     * @function find objects with type relType
     * @param relType String type of db object.
     * @param pKey String primary key of that object
     * @param orgType String type of object being created
     * @param filters String filters for search
     *
     */
    findRelatedObjectsWithType: function(relType, pKey, orgType, filters) {

      // Set a searching message.
      $('.relatedObjectResultsHolder')
        .html('')
        .append($('<span>')
          .html('Searching for items'));

      duckburg.requests.findObjects(relType, filters, function(results) {

        // Empty the div.
        $('.relatedObjectResultsHolder')
          .html('');

        if (results.length == 0 || !results) {

          // Set a no results message.
          $('.relatedObjectResultsHolder')
            .append($('<span>')
              .html('No results found'));
        }

        for (var i = 0; i < results.length; i++) {
          var result = results[i];
          var id = result.id
          var key = result.attributes[pKey];

          // Set a no results message.
          $('.relatedObjectResultsHolder')
            .append($('<span>')
              .attr('id', id)
              .attr('class', pKey + '***' + orgType)
              .html(key)
              .click(function(e) {
                duckburg.utils.placeRelatedObjectInForm(e);
              }));
        }
      });
    },

    /**
     * Place a related object into the form.
     * @function place the related object details into the new object form.
     * @param event Object onclick event from selected item.
     *
     */
    placeRelatedObjectInForm: function(event) {

      // Dom element
      var el = event.currentTarget;

      // Details of related object.
      var id = el.id;
      var key = el.innerHTML;

      // Get name of element, it containts original type and primary key.
      var name = el.className;

      // Place these values into the field.
      var idField = name.split('***')[1];
      var keyField = name.split('***')[0];

      // Place the values inside the form.
      $('#' + idField).val(id);
      $('#' + keyField).val(key);

      // Remove the related item popup.
      $('.inputPopupSelector').remove();
      $('.offClicker').hide();
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

     // If an editing item is exposed, update that item.
     if (duckburg.objects.currentEditingItem) {

       // Send the object, type and callback to another function.
       duckburg.requests.createNewObject(
          type, itemObj, cbFunc, duckburg.objects.currentEditingItem);
     } else {

       // Send the object, type and callback to another function.
       duckburg.requests.createNewObject(type, itemObj, cbFunc);
     }
   }
};
