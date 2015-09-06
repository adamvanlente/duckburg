// Global duckburg namespace.
var duckburg = duckburg || {};

/**
 * Shared utilities for all of duckburg.
 * @module Utilities used for all parts of duckburg.
 *         Also contains main functions for building object forms.
 *
 */

/** Base url off of which to build global paths. **/
duckburg.baseUrl = window.location.protocol + '//' + window.location.host;

duckburg.utils = {

  /** Globals for different routes/destinations **/
  homePage: duckburg.baseUrl,
  loginPage: duckburg.baseUrl + '/login',
  orderPage: duckburg.baseUrl + '/order/',

  /** Number of days to automatically set print date ahead of due date **/
  setPrintDateBackAutomatically: -2,

  /** Interval to wait while attempting to save an order. **/
  orderSaveInterval: 1000,

  /** Interal for messages dissapearing. **/
  messageTimeout: 1800,

  /** Globals for sorting orders **/
  defaultSortStatuses: ['quote', 'open', 'approved', 'ordered'],
  defaultSortParam: 'due_date',
  defaultSortDirection: 'asc',

  // Reserved routes.  Strings that cannot be used when creating custom pages.
  reservedRoutes: ['/products', '/myaccount'],

  /** Default order status and order status map. **/
  defaultNewOrderStatus: 'open',

  /** Map a color to each order status **/
  orderStatusMap: {
    'quote': 'rgba(184, 184, 184, 1.0)',
    'open': 'rgba(130, 153, 200, 1.0)',
    'approved': 'rgba(102, 192, 141, 1.0)',
    'ordered': 'rgba(195, 202, 87, 1.0)',
    'received': 'rgba(226, 177, 101, 1.0)',
    'printing': 'rgba(239, 116, 116, 1.0)',
    'completed': 'rgba(54, 179, 202, 1.0)',
    'delivered': 'rgba(160, 115, 239, 1.0)',
    'archived': 'rgba(0, 0, 0, 0.8)'
  },

  /** Desired dimensions for an image intended for use in a slider. **/
  desiredSliderImageDimensions: '600 x 300',

  /** Month dictionary **/
  monthDict: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
              'August', 'September', 'October', 'November', 'December'],

  monthAbbrvDict: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
                   'Sep', 'Oct', 'Nov', 'Dec'],

  /** Day dictionary **/
  dayDict: ['Sunday', 'Monday', 'Tuesday',
            'Wednesday', 'Thursday', 'Friday', 'Saturday'],

  // Standard order sizes.
  standardOrderSizes: {
    'S': 0,
    'M': 0,
    'L': 0,
    'XL': 0,
    '2X': 0
  },

  // Order in which sizes should be displayed.
  orderSizeList: ['1T', '2T', '3T', '4T', '5T', '6T', 'YXS', 'YS', 'YM', 'YL',
                  'YXL', 'YXXL', 'XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', '1X',
                  '2X', '2XL', 'XXL', '3X', '3XL', 'XXXL', '4X', '4XL', 'XXXXL',
                  '5X', 'XXXXXL', '5XL', '6X', '6XL', 'XXXXXXL', '7X', '7XL',
                  'XXXXXXXL', '8X', '8XL', 'XXXXXXXXL'],

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

      // Set user and timeclock status.
      duckburg.utils.setUserAndTimeclockStatus();

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
   * Set the username and timeclock status.
   * @function that set the current user name and their timeclock status.
   *
   */
  setUserAndTimeclockStatus: function() {
    // Set username in the UI.
    var u = duckburg.curUser;
    var userName = u.attributes.username;
    var punchedIn = u.attributes.current_timeclock_status;

    var timeClockContent;
    var timeClockClass;
    if (punchedIn == 'in') {
      timeClockContent = '<i class="fa fa-clock-o"></i>';
      timeClockClass = 'in';
    } else {
      timeClockContent = 'your are not punched in';
      timeClockClass = 'out'
    }
    $('#current_user')
      .html('')

      // Label for user's name.
      .append($('<label>')
        .html(userName)
        .attr('id', u.id)
        .click(function(e) {
          var id = e.currentTarget.id;
          duckburg.utils.showEmployeeHoursWorkedPopup(id);
        }))

      // Button for punching in/out.
      .append($('<button>')
        .html(timeClockContent)
        .attr('class', 'timeClockButton ' + timeClockClass)
        .click(function() {
          duckburg.utils.showTimePuncher();
        }))

      // Logout button.
      .append($('<em>')
        .attr('class', 'logoutButton')
        .html('logout')
        .click(function() {
          duckburg.utils.logout();
        }));
  },

  /**
   * Current view
   * @function loads the current view for the page based on the path.
   * @param role Role of the current user (string)
   *
   */
  currentView: function(role) {

    // Add a mastersearch listener.
    $('.masterSearch').keyup(function(e) {
      duckburg.masterSearch.search(e);
    });

    // Get the current pathname/route.
    var route = window.location.pathname;

    // Keep unauthorized users out of admin areas.
    var adminOnlyRoutes = [
      '/users', '/finances', '/pages', '/assets'
    ];

    // Send (non admin) user back to the hompage if they're trying to acccess
    // unauthorized routes above.
    if (role != 'admin' && adminOnlyRoutes.indexOf(route) != -1) {
      window.location.href = duckburg.utils.homePage;
    }

    // View handler for routes.
    if (route == '/') {

      // Main route, order list.
      duckburg.orderList.createFilterElements();
      duckburg.orderList.load();

    } else if (route == '/dos') {
      duckburg.dos.load();
    } else if (route == '/assets') {
      duckburg.assets.load()
    } else if (route == '/pages') {
      duckburg.pageMaker.load();
    } else if (route == '/finances') {
      duckburg.finances.load();
    } else if (route == '/printing') {
      duckburg.printing.load();
    } else if (route == '/users') {
      duckburg.users.loadUserView();
    } else if (route == '/objects') {
      duckburg.objects.loadObjectView();
    } else if (route == '/socialorder') {
      duckburg.order.load(true);
    } else if (route.search('/order') != -1) {
      duckburg.order.load();
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

    if (duckburg.curUser &&
        duckburg.curUser.attributes.current_timeclock_status == 'in') {
      var msg = 'Please punch out before logging out.';
      duckburg.utils.errorMessage(msg);
      return;
    }

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
    $('.offClicker').hide();
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
      }, duckburg.utils.messageTimeout);
   },

   /**
    * Add Highsmith calendards
    * @function accepts ids of elements to add highsmith calendars to.
    * @param idList Array of element ids.
    *
    */
   addHighsmithCalendars: function(idList, killButton) {

     // Config for calendars.
     var calConfig = {

       // Let me style it myself.
       style: {
         disable: true
       },

       // Allow user to kill the calendar.
       killButton: killButton,

       // If a date is in the input, open the calendar to that month.
       customDate: true
     };

     // Iterate over the ids and assign a calendar to each.
     for (var i = 0; i < idList.length; i++) {
       var elementId = idList[i];
       if (document.getElementById(elementId)) {
         var cal = new Highsmith(elementId, calConfig);
       }
     }
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
           duckburg.utils.addHighsmithCalendars([param], true);
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

      // Correc the image path for old rd images.
      if (img.search('http://') == -1) {

        // If it hasn't already been sanitized.
        if (img.search('jobimages') == -1) {
          img = '/jobimages/' + img;
        }
      }

      // Reveal the img viewer.
      $('.imgViewer')
        .show()
        .css({'background': 'url(' + img + ') #fff',
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
     * @function remove the related item selector.
     *
     */
    removeRelatedItemPopup: function() {

      // Remove the related item popup.
      $('.inputPopupSelector').remove();
      $('.offClicker').hide();
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

          // Clear the variable for the last clicked product.
          duckburg.order.lastClickedProduct = false;
          duckburg.order.lastClickedCategory = false;
          duckburg.order.lastClickedStore = false;
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

      // Product within order clicked.  Assign this product type to the order.
      if (duckburg.order.lastClickedProduct || duckburg.order.lastClickedStore ||
          duckburg.order.lastClickedCategory) {

        // Get name, which will be product_type_visible_(some #).  Place the
        // readable product name in the that field.
        var name;
        if (duckburg.order.lastClickedProduct) {
          name = duckburg.order.lastClickedProduct;
        } else if (duckburg.order.lastClickedStore) {
          name = duckburg.order.lastClickedStore;
        } else if (duckburg.order.lastClickedCategory) {
          name = duckburg.order.lastClickedCategory;
        }

        $('[name="' + name + '"]').each(function() {
          this.value = key;
        });

        // Now store the actual product id in a hidden field, whose name will
        // be product_type_(some #).
        name = name.replace('visible_', '');
        $('[name="' + name + '"]').each(function() {
          this.value = id;
        });

        // Clear the variable for the last clicked product.
        duckburg.order.lastClickedProduct = false;
        duckburg.order.lastClickedCategory = false;
        duckburg.order.lastClickedStore = false;

        // Collect the design details.
        duckburg.order.collectDesignDetails();
      } else {

        // Place these values into the field.
        var idField = name.split('***')[1];
        var keyField = name.split('***')[0];

        // Place the values inside the form.
        $('#' + idField).val(id);
        $('#' + keyField).val(key);
      }

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
   },

   /**
    * Launch a payment module.
    * @function launches payment module that allows users to log payments.
    * @param order String OR Object.  Can either be order id or order object.
    *
    */
    paymentModule: function(order) {

      // Hide a popup if it exists.
      duckburg.utils.hidePopup();

      if (typeof order == 'string') {

        // Order Id has been supplied.  Load the actual order.
        duckburg.requests.findById(order, 'dbOrder', function(orderItem) {
          duckburg.utils.paymentModule(orderItem);
        });

      } else {

        // Reveal the popup div.
        duckburg.utils.showPopup();

        var summary = JSON.parse(order.attributes.order_summary);
        var balance = summary.balance;
        duckburg.utils.balanceForPaymentModule = balance;

        $('#popupContent')
          .attr('class', 'paymentModule')

          // Order anme
          .append($('<h1>')
            .html(order.attributes.order_name))

          // Append a header.
          .append($('<h2>')
            .html('Order No.' + order.attributes.readable_id))

          .append($('<h3>')
            .html('balance: $' + balance))

          // Suggested amount buttons.
          .append($('<label>')
            .html('100%')
            .attr('class', 'payButton')
            .click(function() {
              var bal = duckburg.utils.balanceForPaymentModule;
              $('#payment_module_amount').val(bal);
            }))

          .append($('<label>')
            .html('75%')
            .attr('class', 'payButton')
            .click(function() {
              var bal = duckburg.utils.balanceForPaymentModule;
              var amt = (bal * 0.75).toFixed(2);
              $('#payment_module_amount').val(amt);
            }))

          .append($('<label>')
            .html('50%')
            .attr('class', 'payButton')
            .click(function() {
              var bal = duckburg.utils.balanceForPaymentModule;
              var amt = (bal * 0.5).toFixed(2);
              $('#payment_module_amount').val(amt);
            }))

          .append($('<label>')
            .html('25%')
            .attr('class', 'payButton')
            .click(function() {
              var bal = duckburg.utils.balanceForPaymentModule;
              var amt = (bal * 0.25).toFixed(2);
              $('#payment_module_amount').val(amt);
            }))

          // Payment inout and label.
          .append($('<div>')
            .attr('class', 'paymentAmountAndLabel')
            .append($('<label>')
              .html('amount'))
            .append($('<input>')
              .attr('type', 'text')
              .attr('id', 'payment_module_amount')
              .attr('placeholder', '$0.00')))

          .append($('<label>')
            .attr('class', 'payMethodLabel')
            .html('pay with method:'))

          // Append labels for each allowed method
          .append($('<label>')
            .attr('class', 'payMethodCash')
            .html('<i class="fa fa-money"></i> cash')
            .click(function() {
              var amt = $('#payment_module_amount').val();
              duckburg.utils.createOrderPayment(amt, order, 'cash');
            }))

          .append($('<label>')
            .attr('class', 'payMethodCard')
            .html('<i class="fa fa-credit-card"></i> card')
            .click(function() {
              var amt = $('#payment_module_amount').val();
              duckburg.utils.createOrderPayment(amt, order, 'card');
            }))

          .append($('<label>')
            .attr('class', 'payMethodCheck')
            .html('<i class="fa fa-check-circle"></i> check')
            .click(function() {
              var amt = $('#payment_module_amount').val();
              duckburg.utils.createOrderPayment(amt, order, 'check');
            }))

          .append($('<label>')
            .attr('class', 'payMethodCheck')
            .html('refund')
            .click(function() {
              var amt = $('#payment_module_amount').val();
              duckburg.utils.createOrderPayment(amt, order, 'refund');
            }))

          // Cancel button.
          .append($('<label>')
            .html('cancel')
            .attr('class', 'cancelPaymentButton')
            .click(function() {
              duckburg.utils.hidePopup();
            }))

          // Payment history
          .append($('<div>')
            .attr('class', 'paymentModuleHistory'));

         // Set the order payment history.
         duckburg.utils.showPaymentHistory(order.id);
      }
    },

    /**
     * Show the payment history of an order.
     * @function this function is only called when the payment module is open,
     *           and fills it in with the payment history for an order.
     * @param id String Parse id for an order; the history of which we want.
     *
     */
    showPaymentHistory: function(id) {

      // Clear order history div.
      $('.paymentModuleHistory')
        .html('')
        .append($('<span>')
          .attr('class', 'loadingPaymentHistoryMessage')
          .html('loading payment history'));

      // Set the list of the order payments.
      duckburg.requests.getOrderPayments(id, function(results) {

        if (!results || results.length == 0) {
          $('.paymentModuleHistory')
            .html('')
            .append($('<span>')
              .attr('class', 'loadingPaymentHistoryMessage')
              .html('no payments made on this order'));
          return
        }

        // Clear payment module.
        $('.paymentModuleHistory')
          .html('')

        for (var i = 0; i < results.length; i++) {
          var result = results[i].attributes;
          var amount = parseFloat(result.amount).toFixed(2);
          var date = String(results[i].createdAt).split('GMT')[0];
          date += ' - ' + result.user;

          $('.paymentModuleHistory')
            .append($('<span>')
              .append($('<label>')
                .attr('class', 'amtLabel')
                .html('$' + amount))
              .append($('<label>')
                .attr('class', 'methodLabel')
                .html(result.method))
              .append($('<label>')
                .attr('class', 'deleteButton')
                .attr('id', results[i].id)
                .html('delete')
                .click(function(e) {
                  var id = e.currentTarget.id;
                  duckburg.utils.deletePayment(id)
                }))
              .append($('<em>')
                .html(date))
            );
        }
      });
    },

    /**
     * Make an order payment.
     * @function make the request to create a payment entry
     * @param amount Float amount for payment
     * @param order Object parse order object
     * @param method String method payment
     *
     */
    createOrderPayment: function(amount, order, method) {

      // Get current user.
      var user = duckburg.curUser.attributes.username;
      var name = order.attributes.order_name;
      if (amount && amount != '') {
        duckburg.requests.orderPayment(order.id, amount, method, user, name,
          function() {

            // Hide the popup.
            duckburg.utils.hidePopup();

            // If this is the order page, update the order total.
            if (window.location.pathname.search('/order') != -1) {
              duckburg.order.getAllPayments();
            } else {
              duckburg.orderList.updateOrderTotals(order.id, amount);
            }
         });
      } else {
        var msg = 'You must enter an amount';
        duckburg.utils.errorMessage(msg);
      }
    },

    /**
     * Delete an order payment.
     * @function deletes a payment for an order.
     * @param paymentId String parse id for the payment.
     *
     */
    deletePayment: function(id) {

      duckburg.requests.findById(id, 'dbOrderPayment', function(result) {
        result.destroy({
          success: function(deletedObj) {

            // Hide the popup.
            duckburg.utils.hidePopup();

            // If this is the order page, update the order total.
            if (window.location.pathname.search('/order') != -1) {
              duckburg.order.getAllPayments();
            } else {
              var id = deletedObj.attributes.order_id;
              var deletedAmount = deletedObj.attributes.amount;
              var amount = (0 - parseFloat(deletedAmount)).toFixed(2);
              duckburg.orderList.updateOrderTotals(id, amount);
            }
          },
          error: function(myObject, error) {
            // The delete failed.
            var msg = 'failed to remove payment';
            duckburg.utils.errorMessage(msg);
          }
        });
      });
    },

    /**
     * Launches the time clock puncher.
     * @function that shows a screen for users to login by.
     *
     */
    showTimePuncher: function() {

      // Show the popup.
      duckburg.utils.showPopup();

      // Get order attributes.
      var u = duckburg.curUser.attributes;

      // Initialize a status, button class and content for button.
      var status;
      var buttonClass;
      var buttonContent;

      // Set the above vars depending on whether user is punching in/out.
      if (u.current_timeclock_status && u.current_timeclock_status == 'in') {
        status = 'out';
        buttonClass = 'punchOut';
        buttonContent = 'punch out';
      } else {
        status = 'in';
        buttonClass = 'punchIn';
        buttonContent = 'punch in';
      }

      // Set up time puncher.
      $('#popupContent')
        .attr('class', 'timeclockPopup')
        .append($('<h1>')
          .html(buttonContent))
        .append($('<em>')
          .attr('class', 'timeClockLastPunch'))
        .append($('<button>')
          .attr('class', buttonClass)
          .attr('name', status)
          .html('go')

          // Create a time punch when user clicks button.
          .click(function(e) {
              duckburg.utils.createTimePunch(status);
          }))
         .append($('<label>')
           .html('cancel')

           // Hide the timeclock
           .click(function() {
             duckburg.utils.hidePopup();
           }));

        // Load the last punch and show the user when they last punched in/out.
        duckburg.utils.showLastPunch(function(results) {
          if (results[0] && results[0].createdAt) {
            var time = results[0].createdAt;
            var msg = results[0].attributes.status == 'in' ?
              'Last punched in ' + String(time).split('GMT')[0] :
              'Last punched out ' + String(time).split('GMT')[0];
            $('.timeClockLastPunch').html(msg);
          }
        });
    },

    /**
     * Create a time punch
     * @function that punches a user in/out.
     * @param status String status to update to (in/out)
     *
     */
    createTimePunch: function(status) {

      // Set the Parse user object's status.
      duckburg.curUser.set('current_timeclock_status', status);
      duckburg.curUser.save();

      // Get name and time (right now).
      var u = duckburg.curUser;
      var name = u.attributes.username;
      var time = new Date();

      // Create an object to send to parse and create a new time punch item.
      var tcObj = {
        status: status,
        name: name,
        user_id: u.id,
        time: time
      };

      // If user is punching in, we simply want to create a new time punch that
      // lets us know when they punched in.
      if (status == 'in') {
        duckburg.requests.createNewObject('dbTimePunch', tcObj,
            function(result) {

              // Successfully punched in.  Close timeclock and update status.
              duckburg.utils.hidePopup();
              duckburg.utils.setUserAndTimeclockStatus();
            });
      } else {

        // If user is punching out, there is a different flow.  We need to
        // punch them out, and create a new 'work session'.  This is an piece
        // of data that represents two corresponding in/out time punches, and
        // represents a set of minutes/hours worked by someone.  This leverages
        // timePunch class and allows us to easily calculate payroll, as well
        // as show the user their hours worked.
        duckburg.utils.showLastPunch(function(results) {

          // If there are results (eg, if there is a previous punch in).  There
          // should be expect for the first time a user punches in.
          if (results[0] && results[0].createdAt) {

            // Get last punch in and determine how long ago it was in minutes.
            var lastPunch = results[0].createdAt;
            var diff = time - lastPunch;
            var mins = Math.floor(diff / 1000 / 60);

            // Create a work date object to send to parse.
            var workDayObj = {
              employee: name,
              employee_id: u.id,
              minutes: mins,
              punched_in: lastPunch,
              punched_out: time
            };

            // Create the new work session object.
            duckburg.requests.createNewObject('dbWorkSession', workDayObj,
              function(result) {

                // Successfully logged work session.  Close time clock and
                // update status.
                duckburg.utils.hidePopup();
                duckburg.utils.setUserAndTimeclockStatus();
              });

            // Update the user's status in the database to 'punched out'.
            duckburg.requests.createNewObject('dbTimePunch', tcObj,
              function(result) {
                // Punch out.
              });
           }
        });
      }
    },

    /**
     * Show an employee their hours.
     * @function that loads a popup and populates it with an employees hours.
     * @param id String parse id of user.
     *
     */
    showEmployeeHoursWorkedPopup: function(id) {

      // Setup the holder for recent hours worked.
      duckburg.utils.setupEmployeeHoursPopup();

      // Get the current pay week's dates.
      var lastSunday = new Date();
      lastSunday.setDate(lastSunday.getDate() - (lastSunday.getDay() + 7));

      var lastWeeksDates = {};
      var currentWeeksDates = {};
      var lastWeeksTotalHours = 0;
      var currentWeeksTotalHours = 0;
      for (var i = 0; i < 14; i++) {
        var date = duckburg.utils.formatDate(lastSunday);
        if (i < 7) {
          lastWeeksDates[date] = true;
        } else {
          currentWeeksDates[date] = true;
        }
        lastSunday.setDate(lastSunday.getDate() + 1);
      }

      // Get work sessions.
      var WS = Parse.Object.extend('dbWorkSession');
      var query = new Parse.Query(WS);

      // Refine based on employee id.
      query.equalTo('employee_id', id);
      query.descending("createdAt");

      query.find({
        success: function(workSessions) {

          // No results message.
          if (!workSessions || workSessions.length == 0) {
            $('.loadingMessage').html('no hours found');
            return;
          } else {
            $('.employeeHoursWorkedDetail').html('');
          }

          // Get all the times the employee has successfully punched in/out.
          for (var i = 0; i < workSessions.length; i++) {
            var item = workSessions[i];
            var att = item.attributes;
            var hrs = duckburg.utils.minsToPayrollHours(att.minutes);

            // Get in/out timestamps.
            var punchedOut = item.createdAt;
            var punchedIn = att.punched_in;

            var formattedPunchedIn = duckburg.utils.formatDate(punchedIn);
            if (lastWeeksDates[formattedPunchedIn]) {
              lastWeeksTotalHours += parseFloat(hrs);
            }

            if (currentWeeksDates[formattedPunchedIn]) {
              currentWeeksTotalHours += parseFloat(hrs);
            }

            // Get in/out day strings.
            var punchedOutDay =
                String(punchedOut).split(String(punchedOut.getFullYear()))[0] +
                punchedOut.getFullYear();
            var punchedInDay =
                String(punchedIn).split(String(punchedIn.getFullYear()))[0] +
                punchedIn.getFullYear();

            // Get the readable time for punch in/out.
            var punchedInTime =
                duckburg.utils.redableTimeFromTimestamp(punchedIn);
            var punchedOutTime =
                duckburg.utils.redableTimeFromTimestamp(punchedOut);

            $('.employeeHoursWorkedDetail')
              .append($('<span>')
                .attr('class', 'itemEntry')

                .append($('<label>')
                  .attr('class', 'piDateLeft')
                  .html('punched in'))
                .append($('<label>')
                  .attr('class', 'piDateRight')
                  .html(punchedInDay + ' @ ' + punchedInTime))

                .append($('<label>')
                  .attr('class', 'poDateLeft')
                  .html('punched out'))
                .append($('<label>')
                  .attr('class', 'poDateRight')
                  .html(punchedOutDay + ' @ ' + punchedOutTime))

                .append($('<label>')
                  .attr('class', 'minsLeft')
                  .html('minutes'))
                .append($('<label>')
                  .attr('class', 'minsRight')
                  .html(att.minutes))

                .append($('<label>')
                  .attr('class', 'hrsLeft')
                  .html('hours'))
                .append($('<label>')
                  .attr('class', 'hrsRight')
                  .html(hrs))
            );
          }

          // Append week's totals
          $('.employeeHoursPayPeriod')
            .append($('<label>')
              .html('Last week\'s hours'))
            .append($('<em>')
              .html(lastWeeksTotalHours.toFixed(2)))
            .append($('<label>')
              .html('Current week\'s hours'))
            .append($('<em>')
              .html(currentWeeksTotalHours.toFixed(2)));
        },
        error: function(error) {
          duckburg.utils.errorMessage(error.message);
        }
      });
    },

    // Setup the holder for the employee hours.
    setupEmployeeHoursPopup: function() {

      // Get employee pay rate
      var payRate = '$' + duckburg.curUser.attributes.pay_rate  + '/hr';

      // Show the popup.
      duckburg.utils.showPopup();
      $('#popupContent')
        .attr('class', 'employeeHoursWorked')
          .append($('<em>')
            .attr('class', 'closeButton')
            .html('<i class="fa fa-times"></i>')
            .click(function() {
              duckburg.utils.hidePopup();
            }))
          .append($('<h1>')
            .html('Past time punches'))
          // .append($('<h2>')
          //   .html('your pay rate: ' + payRate))
          .append($('<div>')
            .attr('class', 'employeeHoursPayPeriod'))
          .append($('<div>')
            .attr('class', 'employeeHoursWorkedDetail')
            .append($('<span>')
              .attr('class', 'loadingMessage')
              .html('loading your hours')));
    },

    /**
     * Calculate how long it will take to print an order.
     * @function get print time for an order.
     * @param items Int number of items in an order.
     * @param totalColors Int total number of colors on the item
     * @param returnType String format to return in, mins or hrs (default hrs)
     *
     */
    calculatePrintTime: function(items, totalColors, returnType) {

      // Make total colors at least 1.  The order list will throw a warning
      // if it is invalid, but we'll bluff the estimate here if its wrong.
      if (isNaN(totalColors) || !totalColors || totalColors == 0) {
        totalColors = 1;
      }

      // Setup time for every job
      var setupTime = 30;

      // For every 100 (about) shirts, add an extra 15 mins.
      var extraTime = parseInt(items / 100);
      extraTime = extraTime * 15;

      // Get number of minutes to print project.
      var time = (parseInt(items)/(2/parseInt(totalColors)));

      // Add extra time and setup time to job.
      time = time + extraTime + setupTime;

      // Return time in minutes if the call specifies.
      if (returnType == 'mins') {
        return time;
      } else {

        // Return hours format by default.
        return parseFloat(time / 60).toFixed(2);
      }
    },

    /** Turn a timestamp into a digital time anyone can read **/
    redableTimeFromTimestamp: function(ts) {
      var hrs = ts.getHours();
      var timeSuffix = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs > 12 ? hrs - 12 : hrs;
      var mins = ts.getMinutes();
      mins = '0' + mins;
      mins = mins.slice(mins.length - 2)
      return hrs + ':' + mins + ' ' + timeSuffix;
    },

    /**
     * Format a date string.
     * @function takes a javascript Date string and formats it for an input.
     * @param date String javascript date string eg Tue Dec 2 2014 GMT...
     *
     */
    formatDate: function(date) {
      var newDate = new Date(date);

      // Return blank string for invalid dates.
      if (typeof date == 'undefined') {
        return ''
      }

      var month = '0' + String(newDate.getMonth() + 1);
      month = month.slice(month.length - 2, month.length);
      var day = '0' + String(newDate.getDate());
      day = day.slice(day.length - 2, day.length);
      var year = String(newDate.getFullYear());
      return month + '/' + day + '/' + year;
    },

    /** Return a given date with days added to it **/
    addDaysToDate: function(date, days) {
      date = date || new Date();
      return new Date(date.getTime() + days*24*60*60*1000);
    },

    /** Return array of cookies. **/
    getCookies: function() {
      var cookie = String(document.cookie);
      return cookie.split(';');
    },

    /** Check if cookies have a property. **/
    cookieHasProp: function(propToMatch) {
      var cookie = String(document.cookie);
      var cookies = cookie.split(';');
      var cookieObj = {};
      for (var i = 0; i < cookies.length; i++) {
        var prop = cookies[i].split('=')[0];
        prop = prop.replace(/ /g, '');
        if (prop == propToMatch) {
          return true;
        }
      }
      return false;
    },

    /** Get a cookie's value. **/
    getOneCookie: function(propToMatch) {
      var cookie = String(document.cookie);
      var cookies = cookie.split(';');
      var cookieObj = {};
      for (var i = 0; i < cookies.length; i++) {
        var prop = cookies[i].split('=')[0];
        prop = prop.replace(/ /g, '');
        if (prop == propToMatch) {
          if (cookies[i].split('=')[1]) {
            var val = cookies[i].split('=')[1];
            return val;
          }
        }
      }
      return false;
    },

    /** Set a cookie value. **/
    setCookie: function(prop, value) {
      var newCookie = String(prop) + '=' + String(value);
      document.cookie = newCookie + ';';
    },

    /** Show previous time clock punch **/
    showLastPunch: function(successCb) {
      // Build a query from the object type.
      var DbObject = Parse.Object.extend('dbTimePunch');
      var query = new Parse.Query(DbObject);

      // Match type.
      query.matches('user_id', duckburg.curUser.id);

      // Always sort newest first.
      query.descending("createdAt");
      query.limit(1);

      // Perform the queries and continue with the help of the callback functions.
      query.find({
        success: function(results) {
          successCb(results);
        },
        error: function(error) {
          var errorMsg = 'Error getting timepunches: ' + error.message;
          duckburg.utils.errorMessage(errorMsg);
        }
      });
    },

    /** Convert minutes (ex 90) to payroll hours (ex 1.5) **/
    minsToPayrollHours: function(hrs) {
      var totalHours = parseInt(hrs / 60);
      var mins = hrs % 60;
      mins = parseFloat(mins) / 60;
      return (parseFloat(totalHours) + parseFloat(mins)).toFixed(2);
    },

    /** Sort a dictionary by param **/
    sortDict: function(array, param) {

      // Sort the array based on a parameter contained within its
      // items.
      return array.sort(function(a,b) {
        if (a[param] < b[param]) {
          return -1;
        }
        if (a[param] > b[param]) {
          return 1;
        }
        return 0;
      });
    }
};

// Shortcut key listeners.
$('body').keypress(function(e) {

  // Shortcut to home page.
  if (e.ctrlKey && e.charCode == 8) {
    window.location.href = '/';
  }

  // Shortcut to printing page.
  if (e.ctrlKey && e.charCode == 16) {
    window.location.href = '/printing';
  }
});
