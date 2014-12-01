// Global duckburg namespace.
var duckburg = duckburg || {};

/**
 * Order view
 * @module the view in which a user can create or update an order.
 *
 */
duckburg.order = {


  /** Global vars that help keep state/sanity in this view. **/
  customerListener    : false,
  itemListener        : false,
  designListener      : false,
  orderListener       : false,

  currentOrder        : false,
  currentDesigns      : {},
  currentItems        : {},
  currentCustomers    : {},

  /**
   * Load order view
   * @function loads the initial view for order.  Scans url to see if an order
   *           is being requested.  If not, this is simply a new order form.
   *
   */
  load: function() {

    // Look in the url path for an order id.
    var urlArray = window.location.pathname.split('/');
    if (urlArray.length == 3 && urlArray[2] != '') {

      // Get order id and make a request for the order using it.
      var orderId = urlArray[2];
      duckburg.requests.fetchOrderById(orderId, function(order) {

        // Check if there are results, or if it is an empty set.
        if (!order || order.length == 0) {
          duckburg.order.errorLoadingOrderMessage(orderId);
        } else {
          duckburg.order.loadOrderForm(order);
        }
      });

      // Set a message letting the user know the order is loading.
      duckburg.order.setOrderLoadingMessageForId(orderId);

    } else {
      duckburg.order.loadOrderForm();
    }
  },

  /**
   * Load order form
   * @function loads order form and, if available, loads the information
   *           of an existing order that is passed as an argument.
   * @param order Object parse object
   *
   */
  loadOrderForm: function(order) {

    // Clear out the order wrapper.
    $('.orderWrapper').html('');

    // Create the top details div.
    duckburg.order.createOrderDetailsSection();

    // Create the customer section.
    duckburg.order.createCustomerSection();

    // Create the design section
    duckburg.order.createDesignSection();

    // Lastly, if an order was passed, populate the form with its details.
    if (order) {

      // Assign the order as the current order onload.
      duckburg.order.currentOrder = order;

      // BE SURE when add order to customer, get the isShip/isBill params
      // from the cust collection and be sure to send them as the optional
      // args in the add customer to order func.

    } else {
      duckburg.order.loadNewOrderValues();
    }
  },

  /**
   * Create order details section
   * @function creates the area of the order form that contains general details.
   *
   */
  createOrderDetailsSection: function() {

    $('.orderWrapper')

      // Append a holderDiv
      .append($('<div>')
        .attr('class', 'orderDetailsHolder')

        // Create main holder.
        .append($('<div>')
          .attr('class', 'orderFormOrderDetailsDiv')

          // Readable order ID field.
          .append($('<span>')
            .attr('class', 'orderFormReadableOrderId')
            .attr('id', 'readable_id')
            .attr('name', 'order_form_field'))

          // Due Date label & input.
          .append($('<label>')
            .html('due date')
            .attr('class', 'dueDateLabel'))

          .append($('<input>')
            .attr('type', 'text')
            .attr('id', 'due_date')
            .attr('class', 'dueDateInput')
            .attr('placeholder', '00/00/00')
            .attr('name', 'order_form_field')
            .click(function() {

              // After a breif wait, set a function to update the due date
              // after any document click.
              setTimeout(function() {
                $(document).bind('click', duckburg.order.updateDueDate);
              }, 200);
            }))

          // Print Date label & input.
          .append($('<label>')
            .html('print date')
            .attr('class', 'printDateLabel'))

          .append($('<input>')
            .attr('type', 'text')
            .attr('id', 'print_date')
            .attr('class', 'printDateInput')
            .attr('placeholder', '00/00/00')
            .attr('name', 'order_form_field')
            .click(function() {

              // After a breif wait, set a function to update the print date
              // after any document click.
              setTimeout(function() {
                $(document).bind('click', duckburg.order.updatePrintDate);
              }, 200);
            }))

          // Job name input
          .append($('<input>')
            .attr('type', 'text')
            .attr('id', 'order_name')
            .attr('placeholder', 'order name')
            .attr('class', 'orderNameInput')
            .attr('name', 'order_form_field')
            .keyup(function(e) {
              duckburg.order.updateObjectParameter(e, 'dbOrder');
            }))

          // Order Status label
          .append($('<span>')
            .attr('class', 'orderFormOrderStatusLabel')
            .attr('id', 'order_status')
            .attr('name', 'order_form_field')
            .click(function() {
              duckburg.order.launchOrderStatusSelector();
            }))

          // Append a status selector div.
          .append($('<div>')
            .attr('class', 'statusSelector'))
        )
    );

    // Add highsmith calendars to due date and print date.
    duckburg.utils.addHighsmithCalendars(['due_date', 'print_date']);
  },

  /**
   * Updates due date.
   * @function updates the due date of an order in the database.  Since our
   *           Highsmith picker autofills the input, attaching a listener
   *           event is difficult to do.  Instead, we bind a listener to the
   *           document so that after the calendar is launched, any click in
   *           the doc will kick off this function.  If there is no order, or
   *           no update has been made, no harm is done by this function.
   *
   */
  updateDueDate: function() {

    // If the click has closed the calendar, remove listener.
    if (!$('#highsmithCal').length) {

      // Only update if an order exists.
      if (duckburg.order.currentOrder) {

        // Get due date.
        var dueDate = $('#due_date').val();

        // Update and save.
        duckburg.order.currentOrder.set('due_date', dueDate);
        duckburg.order.currentOrder.save();
      }

      // Remove the listener that kicked off this function.
      $(document).unbind('click', duckburg.order.updateDueDate);
    }
  },

  /** Identical to updateDueDate method, but used for print date. **/
  updatePrintDate: function() {

    // If the calendar is still visible, then don't do anything.
    if (!$('#highsmithCal').length) {

      // Only update if an order exists.
      if (duckburg.order.currentOrder) {

        // Get due date.
        var printDate = $('#print_date').val();

        // Update and save.
        duckburg.order.currentOrder.set('print_date', printDate);
        duckburg.order.currentOrder.save();
      }

      // Remove the listener that kicked off this function.
      $(document).unbind('click', duckburg.order.updatePrintDate);
    }
  },

  /**
   * Load new order values
   * @function Populate a new order form with some default values.  A new order
   *           needs to have an order number and status assigned to it.
   *
   */
   loadNewOrderValues: function() {

     // Get the count of orders and assign an id.
     duckburg.requests.countObjects('dbOrder', function(count) {
       count++;
       var orderId = '000000' + count;
       orderId = orderId.slice(orderId.length - 6, orderId.length);
       $('#readable_id').html(orderId);
     });

     // Assign an initial status.
     var status = duckburg.utils.defaultNewOrderStatus;
     var bgColor = duckburg.utils.orderStatusMap[status];
     duckburg.order.updateOrderStatus(status, bgColor);

     // Collect the order values - save the order as a new order automatically.
     // Though this will fill the database will potentially empty/incomplete
     // orders, it will prevent two orders from being opened at once and being
     // assigned the same 'readable' order number.  Delay this activity by
     // a second.
     setTimeout(function() {
       duckburg.order.collectOrderInformation();
     }, 1500);
   },

   /**
    * Updates the status in the order, in the ui and in database.
    * @function updates the value and view of status.
    * @param status String status of the order
    * @param bgColor String color/background for status & status div
    *
    */
    updateOrderStatus: function(status, bgColor) {
      $('#order_status')
        .html(status)
        .css({'background': bgColor});

      if (duckburg.order.currentOrder) {
        duckburg.order.currentOrder.set('order_status', status);
        duckburg.order.currentOrder.save();
      }
    },

   /**
    * Status selector
    * @function launches a div that lets the user select/update order status.
    *
    */
  launchOrderStatusSelector: function() {

    // Launch status selector and offclicker.
    $('.statusSelector')
      .html('')
      .show();

    // Create a label for each status.
    var statuses = duckburg.utils.orderStatusMap;
    for (var status in statuses) {
      var bgColor = statuses[status];

      $('.statusSelector')
        .append($('<label>')
          .html(status)
          .attr('id', bgColor)
          .css({'background': bgColor})
          .click(function(e) {

            // Update order status on click.
            var el = e.currentTarget;
            var color = el.id;
            var orderStatus = el.innerHTML;
            duckburg.order.updateOrderStatus(orderStatus, color);
         }));
    }

    setTimeout(function() {
      duckburg.order.statusHider = function() {
        $('.statusSelector').hide();
        $(document).unbind('click', duckburg.order.statusHider);
      };
      $(document).bind('click', duckburg.order.statusHider);
    }, 50);
  },

  /**
   * Create customer details section
   * @function creates an area of the order form that lets the user
   *           add/remove/edit customers.
   *
   */
  createCustomerSection: function() {

    $('.orderWrapper')

      // Append the main wrapper.
      .append($('<div>')
        .attr('class', 'orderFormCustomerDetailsHolder')

        // Append a holder for the title and the 'add new button'.
        .append($('<div>')
          .attr('class', 'customerDetailsTitle')

          // Append header and button for div.
          .append($('<h3>')
            .html('Customers')
            .attr('class', 'customerDetailsHeading'))
          .append($('<label>')
            .html('add customer <i class="fa fa-user"></i>')
            .attr('class', 'customerDetailsAddNewButton')
            .click(function() {
              duckburg.order.launchCustomerSelector();
            }))
         )

        // Append a holder for customers that will be added.
        .append($('<div>')
          .attr('class', 'customerDetailsCustomerHolder'))
      );
  },

  /**
   * Create design details section
   * @function creates an area of the order form that lets the user
   *           add/update/remove designs.
   *
   */
  createDesignSection: function() {

    $('.orderWrapper')

      // Append the main wrapper.
      .append($('<div>')
        .attr('class', 'orderFormDesignDetailsHolder')

        // Append a holder for the title and the 'add new button'.
        .append($('<div>')
          .attr('class', 'designDetailsTitle')

          // Append header and button for div.
          .append($('<h3>')
            .html('Designs')
            .attr('class', 'designDetailsHeading'))
          .append($('<label>')
            .html('add design <i class="fa fa-file-image-o"></i>')
            .attr('class', 'designDetailsAddNewButton')
            .click(function() {
              duckburg.order.addDesignFormToOrder();
            }))

         )

        // Append a holder for customers that will be added.
        .append($('<div>')
          .attr('class', 'designsDetailsCustomerHolder'))
      );
  },

  /**
   * Launch customer selector.
   * @function launches area where a customer can be added to the order.
   *
   */
  launchCustomerSelector: function() {

    // Show popup div.
    duckburg.utils.showPopup();

    // Assign class to popup content
    $('#popupContent')
      .attr('class', 'orderFormCustomerSelector')

      .append($('<div>')
        .attr('class', 'customerPopupCreateNewCustomerForm')
        .append($('<h3>')
          .html('create a new customer')))

      .append($('<div>')
        .attr('class', 'customerPopupSelectExistingHolder')
        .append($('<h3>')
          .html('select an existing customer'))
        .append($('<input>')
          .attr('type', 'text')
          .attr('placeholder', 'search for customer')
          .keyup(function(e) {
            duckburg.order.customerPopupSearch(e);
          }))
        .append($('<span>')
          .attr('class', 'existingUserSearchResultsSpan')))

       .append($('<span>')
         .attr('class', 'searchExistingCustomersCancelButton')
         .html('cancel')
         .click(function() {
           $('.popupDiv').hide();
         }));

      // Now that selector exists, create the new customer form within it.
      duckburg.order.createNewCustomerForm();
  },

  /**
   * Create new customer form.
   * @function within the popup to create/select a customer, create a form
   *           allowing the user to make a new customer.
   *
   */
   createNewCustomerForm: function() {

     // Get the model.
     var model = duckburg.models.dbCustomer;

     // Create an input for each item.
     for (var value in model.values) {

       // Collect values needed to make inputs.
       var vals = model.values[value];
       var type = vals.input;
       var size = vals.input_size;
       var ph = vals.placeholder;

       // Determine which type of input to make.
       if (type == 'textarea') {
         $('.customerPopupCreateNewCustomerForm')
           .append($('<textarea>')
             .attr('id', value)
             .attr('name', 'customer_form_field')
             .attr('placeholder', ph)
          );
       } else if (type == 'checkbox') {
         // pass
       } else {
         $('.customerPopupCreateNewCustomerForm')
           .append($('<input>')
             .attr('type', type)
             .attr('id', value)
             .attr('class', size)
             .attr('name', 'customer_form_field')
             .attr('placeholder', ph)
          );
       }
     }

     // Add a 'create' button.
     $('.customerPopupCreateNewCustomerForm')
       .append($('<span>')
         .attr('class', 'createNewCustomerFromForm')
         .html('create customer')
         .click(function() {

           // Create a new object and add it to the form.
           var params = {};
           $('[name="customer_form_field"]').each(function() {
             params[this.id] = this.value;
           });
           duckburg.requests.createNewObject('dbCustomer', params, function(c) {
             duckburg.order.addCustomerToOrder(c);
             $('.popupDiv').hide();
           });
         }));
   },

  /**
   * Search for existing customers
   * @function a search that occurs within the customer popup, which allows
   *           the user to add an existing customer to the order.
   * @param event Object dom event of keyup on the search input
   *
   */
  customerPopupSearch: function(event) {

    // Clear timer for customer search
    if (duckburg.order.searchForExistingCustomerTimer) {
      window.clearInterval(duckburg.order.searchForExistingCustomerTimer);
    }

    // Set a timer after which a search should be performed.
    duckburg.order.searchForExistingCustomerTimer = setTimeout(function() {

      // Set a note that search is in progress.
      $('.existingUserSearchResultsSpan')
        .html('')
        .append($('<label>')
          .html('searching for customers')
          .attr('class', 'progressMsg'))

      // Capture search term and perform search.
      var val = event.currentTarget.value.toLowerCase();

      if (val == '') {
        $('.existingUserSearchResultsSpan')
          .html('');
        return;
      }

      duckburg.requests.findObjects('dbCustomer', val, function(customers) {

        // Clear the result div.
        $('.existingUserSearchResultsSpan')
          .html('')

        // Condition for no/bad results.
        if (!customers || customers.length == 0) {
          $('.existingUserSearchResultsSpan')
            .append($('<label>')
              .html('searching for customers')
              .attr('class', 'progressMsg'))
        } else {

          // Hang on to these results
          duckburg.order.existingCustomerSearchResults = customers;

          // Iterate over the customers and display them.
          for (var i = 0; i < customers.length; i++) {
            var cust = customers[i];
            var fName = cust.attributes.first_name;
            var lName = cust.attributes.last_name;
            var name = fName + ' ' + lName;
            $('.existingUserSearchResultsSpan')
              .append($('<label>')
                .html(name)
                .attr('id', i)
                .attr('class', 'existingCustomerResult')
                .click(function(e) {
                  var index = e.currentTarget.id;
                  var customer = duckburg.order.existingCustomerSearchResults[index];
                  duckburg.order.addCustomerToOrder(customer);
                  $('.popupDiv').hide();
                })
             );
          }
        }
      });
    }, 350);
  },

  /**
   * Add a customer
   * @function given a Parse object, add the customer to the order.
   * @param customer Object parse customer object
   *
   */
  addCustomerToOrder: function(customer, isShip, isBill) {

    // As long as we're not already using this customer.
    if (!duckburg.order.currentCustomers[customer.id]) {

      // Add customer to list of current customers.
      duckburg.order.currentCustomers[customer.id] = customer;

      // Update the current customer's length property.
      if (duckburg.order.currentCustomers.length) {
        duckburg.order.currentCustomers.length++;
      } else {
        duckburg.order.currentCustomers.length = 1;
      }

      // Alias for customer details.
      var c = customer.attributes;
      var custCount = $('.customerRecordWithinDetailsHolder').length;
      isShip = custCount == 0 ? true : isShip;
      isBill = custCount == 0 ? true : isBill;

      // Create a div in the list of customers for this customer.
      $('.customerDetailsCustomerHolder')
        .append($('<div>')
          .attr('class', 'customerRecordWithinDetailsHolder')
          .attr('id', customer.id)

          // Customer Name inputs
          .append($('<input>')
            .attr('class', 'firstNameField')
            .attr('placeholder', 'first name')
            .attr('type', 'text')
            .attr('title', customer.id)
            .attr('id', 'first_name')
            .val(c.first_name)
            .keyup(function(e) {
              duckburg.order.updateCustomerObject(e);
            }))
          .append($('<input>')
            .attr('class', 'lastNameField')
            .attr('type', 'text')
            .attr('placeholder', 'last name')
            .attr('title', customer.id)
            .attr('id', 'last_name')
            .val(c.last_name)
            .keyup(function(e) {
              duckburg.order.updateCustomerObject(e);
            }))

          // Phone number
          .append($('<i>')
            .attr('class', 'phoneLabel')
            .html('<i class="fa fa-phone"></u>'))
          .append($('<input>')
            .attr('class', 'phoneNumberField')
            .attr('type', 'text')
            .attr('placeholder', 'phone')
            .attr('title', customer.id)
            .attr('id', 'phone_number')
            .val(c.phone_number)
            .keyup(function(e) {
              duckburg.order.updateCustomerObject(e);
            }))

          // Email
          .append($('<i>')
            .attr('class', 'emailLabel')
            .html('<i class="fa fa-envelope"></u>'))
          .append($('<input>')
            .attr('class', 'emailAddressInput')
            .attr('type', 'text')
            .attr('placeholder', 'email')
            .attr('title', customer.id)
            .attr('id', 'email_address')
            .val(c.email_address)
            .keyup(function(e) {
              duckburg.order.updateCustomerObject(e);
            }))

          // Ship checkbox
          .append($('<label>')
            .attr('class', 'shipToLabel')
            .html('ship to?'))
          .append($('<input>')
            .attr('type', 'radio')
            .attr('name', 'isShippingCustomer')
            .attr('class', 'isShippingCustomer')
            .attr('id', 'is_ship')
            .attr('checked', isShip)
            .click(function() {
              duckburg.order.collectOrderInformation();
            }))

          // Bill checkbox
          .append($('<label>')
            .attr('class', 'billToLabel')
            .html('bill to?'))
          .append($('<input>')
            .attr('type', 'radio')
            .attr('name', 'isBillingCustomer')
            .attr('class', 'isBillingCustomer')
            .attr('id', 'is_bill')
            .attr('checked', isBill)
            .click(function() {
              duckburg.order.collectOrderInformation();
            }))

          // Add button to remove item.
          .append($('<label>')
            .attr('class', 'removeCustomerFromOrderButton')
            .html('remove')
            .attr('id', customer.id)
            .click(function(e) {
              var custId = e.currentTarget.id;
              duckburg.order.removeCustomerFromOrder(custId);
            }))
        );

      // Update the order information.
      duckburg.order.collectOrderInformation();
    }
  },

  /**
   * Remove a customer
   * @function remove a customer from the current order.
   * @param custId String customer id from Parse object.
   *
   */
  removeCustomerFromOrder: function(custId) {

    // Remove the object from the holder.
    if (duckburg.order.currentCustomers[custId]) {
      delete duckburg.order.currentCustomers[custId];
      duckburg.order.currentCustomers.length--;
    }

    // Remove the dom element.
    $('.customerRecordWithinDetailsHolder').each(function() {
      if (this.id == custId) {
        $(this).remove();
      }
    });

    // Update which customer is shipping and billing
    duckburg.order.updateBillingAndShippingRadios();

    // Update the order information.
    duckburg.order.collectOrderInformation();
  },

  /**
   * Update which customer is billing/shipping customer.
   * @function checks that, if there is only one customer showing, that they
   *           are automatically assigned as shipping & billing cust.
   *
   */
  updateBillingAndShippingRadios: function() {

    // Get the number of customers.
    var numCust = $('.customerRecordWithinDetailsHolder').length;

    // If all customers have been removed, we don't care whats going on.
    if (numCust == 0) {
      return;
    }

    // Capture the collection of radios.
    var billRadios = $('.isBillingCustomer');
    var shipRadios = $('.isShippingCustomer');

    // If only one customer is visible, simply ensure they are assigned as both
    // the billing and shipping customer.
    if (numCust == 1) {
      shipRadios.prop('checked', true);
      billRadios.prop('checked', true);
    } else {

      // In this condition, we are going to check that some customer (any
      // of the > 1 selected customers) is assigned as the shipping/billing
      // customer.  If no one is assigned to those roles, we'll simply assign
      // the first customer.

      // Remember if billing/shipping customers are selected.
      var billingCustomerSelected;
      var shippingCustomerSelected;

      // Check if the roles have been defined.
      for (var i = 0; i < billRadios.length; i++) {
        if (billRadios[i].checked) {
          billingCustomerSelected = true;
        }
        if (shipRadios[i].checked) {
          shippingCustomerSelected = true;
        }
      }

      // If the user hasn't selected a billing/shipping user, pick one for them!
      if (!billingCustomerSelected) {
        $(billRadios[0]).prop('checked', true);
      }
      if (!shippingCustomerSelected) {
        $(shipRadios[0]).prop('checked', true);
      }
    }
  },

  /**
   * Update one parameter of an object on Parse
   * @function update a single parameter of an object from parse.
   * @param event Object event that contains the target element, which includes
   *        all we need to perform the operation.
   * @param type String type of parse object.
   *
   */
   updateObjectParameter: function(event, type) {

     // Get the element containing the information.
     var element = event.currentTarget;

     // The parameter of the object that will be updated, for instance
     // 'job_name' or 'first_name' on a customer.
     var param = element.id
     var newVal = '';

     // Some elements may be inputs, some divs or spans, so just get the best
     // possible value.
     if (element.value && element.value != '') {
       newVal = element.value;
     }
     if (element.innerHTML && element.innerHTML != '') {
       newVal = element.innerHTML;
     }

     // Update the current order, if it exists
     if (type == 'dbOrder') {
       if (duckburg.order.currentOrder) {

         // Update this param.
         duckburg.order.currentOrder.set(param, newVal);
         duckburg.order.currentOrder.save();
       }

     // Update a customer item.
     } else if (type == 'dbCustomer') {
       var customer = duckburg.order.currentCustomers[element.title];
       customer.set(param, newVal);
       customer.save();
     }
   },

  /**
   * Update a parameter on a dbCustomer object.
   * @function update a parameter on a Parse dbCustomer object.
   * @param event Object that contains a dom element, the id of which bears
   *              the parse id, id of which is the param key, and value of
   *              which is the value to be updated.
   *
   */
  updateCustomerObject: function(event) {
    duckburg.order.updateObjectParameter(event, 'dbCustomer');
  },

  /**
   * Creates an order
   * @function create an order from the information provided.  This requires
   *           only an order number and job name.  If no job name exists,
   *           create one from the order number.
   *
   */
  createOrder: function() {

    // Order number.
    var orderNumber = $('#readable_id').html();

    // Order name.
    var orderName = $('#order_name').val();

    // Dates.
    var dueDate = $('#due_date').val();
    var printDate = $('#print_date').val();

    // Order status.
    var orderStatus = $('#order_status').html();

    // If order name is empty, create a generic one.
    if (orderName == '') {
      orderName = 'Order No. ' + orderNumber;
      $('#order_name').val(orderName);
    }

    // Store these params with their Parse keys.
    var params = {
      readable_id: orderNumber,
      order_name: orderName,
      due_date: dueDate,
      print_date: printDate,
      order_status: orderStatus
    };

    // Create an order item.
    duckburg.requests.createNewObject('dbOrder', params, function(order) {
      duckburg.order.currentOrder = order;
      duckburg.order.collectOrderInformation();
    });
  },

  /**
   * Add an empty form so that a new design can be added to the screen.
   * @function adds form to order form so that new design details can be added.
   *
   */
  addDesignFormToOrder: function(sizes) {

    sizes = sizes || duckburg.utils.standardOrderSizes;

    // Number of designs
    var numDesigns = $('.designFormWithinOrder').length;
    var newDesignId = 'Design No.' + (numDesigns + 1);

    // create a new form.
    var newForm = $('<div>')
      .attr('class', 'designFormWithinOrder')
      .attr('id', numDesigns)
        .append($('<span>')
          .attr('class', 'designFormIdSpan')
          .attr('title', '')
          .html(newDesignId)
          .append($('<label>')
            .html('<i class="fa fa-times"></i>')
            .attr('id', numDesigns)
            .click(function(e) {
              duckburg.order.removeDesignFromOrder(e);
            })));

    // Add the main design details inputs to the form.
    duckburg.order.addDesignDetailInputsToDesignForm(newForm);

    // Add the pricing input fields to the form.
    duckburg.order.addDesignPriceInputsToDesignForm(newForm);

    // Append size holder and sizes.
    duckburg.order.addDesignSizeHolderToForm(newForm, sizes);

    // Add the image fields (design)/
    duckburg.order.addDesignImageHolderToDesignForm(newForm);

    // Add advanced settings to the design.
    duckburg.order.addAdvancedDesignSettings(newForm);

    // Append the new form.
    $('.designsDetailsCustomerHolder').append(newForm);

    // Update the design globals in memory.
    duckburg.order.collectDesignDetails();
  },

  /**
   * Remove a design from the order.
   * @function lets user remove design, after confirming the action.
   * @param event Object dom element for the action
   *
   */
   removeDesignFromOrder: function(event) {
     var el = event.currentTarget;
     var idx = el.id;
     duckburg.utils.showPopup();

     $('#popupContent')
       .attr('class', 'confirmRemoveDesignPopup')

       .append($('<span>')
         .html('Are you sure you want to remove this design?'))

       .append($('<label>')
         .html('cancel')
         .attr('class', 'cancel')
         .click(function() {
           duckburg.utils.hidePopup();
         }))

       .append($('<label>')
         .html('remove')
         .attr('class', 'remove')
         .attr('id', idx)
         .click(function(e) {
           var index = e.currentTarget.id;
           $('.designFormWithinOrder').each(function() {
             if (this.id == index) {
               $(this).remove();
               duckburg.utils.hidePopup();
               duckburg.order.collectDesignDetails();
             }
           })
         }));
   },

  /**
   * Add main detail inputs to a design form.
   * @function when creating a new design form, add the inputs for product
   *           type, color and pricing inputs.
   * @param form Object dom element for form.
   *
   */
  addDesignDetailInputsToDesignForm: function(form) {

    var numDesigns = $('.designFormWithinOrder').length;

    // Append input for the item name.
    form
      .append($('<input>')
        .attr('type', 'text')
        .attr('id', 'item_name')
        .attr('class', 'designFormItemNameInput')
        .attr('placeholder', 'name of design'))
      .append($('<label>')
        .attr('class', 'itemTotalPriceLabel')
        .html('total price'))
      .append($('<input>')
        .attr('class', 'itemTotalPriceInput')
        .attr('name', 'item_total_price_input_' + numDesigns)
        .attr('placeholder', '0.00')
        .attr('readonly', true));

    // Append a product detail holder.
    form
      .append($('<div>')
        .attr('class', 'designProductDetailInputs')
        .attr('id', numDesigns)

        // Product type label and input.
        .append($('<label>')
          .html('product type')
          .attr('class', 'productTypeLabel'))
        .append($('<input>')
          .attr('type', 'text')
          .attr('id', 'product_type')
          .attr('class', 'productTypeInputField'))

        // Product type label and input.
        .append($('<label>')
          .html('product color')
          .attr('class', 'productColorLabel'))
        .append($('<input>')
          .attr('type', 'text')
          .attr('id', 'product_color')
          .attr('class', 'productColorInputField'))
      );
  },

  /**
  * Add pricing detail inputs to a design form.
  * @function when creating a new design form, add the inputs for product
  *           pricing to the form.
  * @param form Object dom element for form.
  *
  */
  addDesignPriceInputsToDesignForm: function(form) {

    // Get number of designs.
    var numDesigns = $('.designFormWithinOrder').length;

    // Append a product detail holder.
    form
      .append($('<div>')
        .attr('class', 'designPriceDetailInputs')

        // Product type label and input.
        .append($('<label>')
          .html('piece price')
          .attr('class', 'productPriceLabel'))
        .append($('<input>')
          .attr('type', 'text')
          .attr('id', 'product_price')
          .attr('name', 'product_price_' + numDesigns)
          .attr('class', 'productPriceInputField')
          .attr('placeholder', '0.00')
          .keyup(function() {
            duckburg.order.collectDesignDetails();
          }))

        // Product type label and input.
        .append($('<label>')
          .html('sale price')
          .attr('class', 'productSalePriceLabel'))
        .append($('<input>')
          .attr('type', 'text')
          .attr('id', 'product_saleprice')
          .attr('name', 'product_saleprice_' + numDesigns)
          .attr('class', 'productSalePriceInputField')
          .attr('placeholder', '0.00')
          .keyup(function() {
            duckburg.order.collectDesignDetails();
          }))

        // Product type label and input.
        .append($('<label>')
          .html('social price')
          .attr('class', 'productSocialPriceLabel'))
        .append($('<input>')
          .attr('type', 'text')
          .attr('id', 'product_socialprice')
          .attr('name', 'product_socialprice_' + numDesigns)
          .attr('class', 'productSocialPriceInputField')
          .attr('placeholder', '0.00')
          .keyup(function() {
            duckburg.order.collectDesignDetails();
          }))
     );
   },

   /**
    * Add image holder to form.
    * @function adds an image holder so that images can be added to a new
    *           item.  This manages 'designs' associated with items.
    * @param form Object the dom element for the design form.
    *
    */
  addDesignImageHolderToDesignForm: function(form) {

    // Append the holder element.
    form
      .append($('<div>')
        .attr('class', 'designImageSelectorDiv')
        .append($('<h3>')
          .html('images'))
        .append($('<input>')
          .attr('class', 'designImagesFilePicker')
          .attr('type', 'file'))
        .append($('<em>')
          .html('or'))
        .append($('<button>')
          .html('select existing design'))
        .append($('<div>')
          .attr('class', 'imagesWithinImageHolder'))
    );
  },

  /**
   * Add a holder for the design sizes.
   * @function adds holder for the design sizes and, if no order exists,
   *           adds default sizes to the holder.
   * @param form Object dom element of form to append to.
   *
   */
   addDesignSizeHolderToForm: function(form, sizes) {

     // Get number of designs.
     var numDesigns = $('.designFormWithinOrder').length;

     // Create the holder.
     var sizeHolder = $('<div>')
       .attr('class', 'designFormSizeHolder')
       .attr('id', 'design_sizes_' + numDesigns);

     // Append the sizeholder.
     form.append(sizeHolder);

     // If this is a new, blank order, append default size inputs.
     duckburg.order.addSizeInputsToSizeHolder(sizeHolder, sizes);

   },

   /**
    * Given a target element and list of sizes, create size inputs.
    * @function adds size inputs to a design item.
    * @param parent Object dom element to append size inputs to.
    * @param sizes Object (optional) sizes to create inputs for.
    *
    */
  addSizeInputsToSizeHolder: function(parent, sizes) {

    // Get the current design index.
    var index = parent.parent()[0].id;

    // Clear out the parent div.
    parent.html('');

    // Append the inputs.
    for (var i = 0; i < duckburg.utils.orderSizeList.length; i++) {
      var size = duckburg.utils.orderSizeList[i];

      if (sizes[size] || sizes[size] == 0) {
        var quantity = sizes[size] == 0 ? '' : sizes[size];
        duckburg.order.addSizeInputFieldToForm(size, quantity, index, parent);
      }
    }

    // Find odd sizes, as in non standard sizes, eg OSFA.
    for (var sizeLabel in sizes) {
      var isOddSize = duckburg.utils.orderSizeList.indexOf(sizeLabel) == -1;
      if (isOddSize && sizeLabel != '') {
        duckburg.order.addSizeInputFieldToForm(
            sizeLabel, sizes[sizeLabel], index, parent);
      }
    }

    // Add an additional input for creating new sizes.
    parent
      .append($('<span>')
        .attr('class', 'sizeLabelAndInputHolder')
        .append($('<label>')
          .attr('class', 'addSizeLabel')
          .html('add size'))
        .append($('<input>')
          .attr('class', 'addSizeInput'))
        .append($('<label>')
          .attr('class', 'addSizeButton')
          .attr('id', index)
          .html('<i class="fa fa-plus"></i>')
          .click(function(e) {
            var el = e.currentTarget;
            var size = $(el).prev().val();
            duckburg.order.addSizeToDesignForm(size, el.id);
          }))
      );
  },

  /**
   * Add an input for a size field to the design form.
   * @function helper function that creates label, input and remove button for
   *           a size for a particular design.
   * @param size String size name
   * @param quantity Int number of items for this size
   * @param designIndex Int index of design among other designs
   * @param parent Object dom element of parent holder object.
   *
   */
  addSizeInputFieldToForm: function(size, quantity, designIndex, parent) {
    parent
      .append($('<span>')
        .attr('class', 'sizeLabelAndInputHolder')
        .attr('id', size + '_' + quantity)
      .append($('<label>')
        .attr('class', 'sizeLabel')
        .html(size))
      .append($('<input>')
        .attr('type', 'text')
        .attr('id', size)
        .attr('name', 'size_for_item_' + designIndex)
        .attr('placeholder', '0')
        .attr('class', 'sizeInput')
        .val(quantity)
        .keyup(function(e) {
          duckburg.order.collectDesignDetails();
        }))
      .append($('<label>')
        .attr('class', 'removeSizeButton')
        .html('<i class="fa fa-times"></i>')
        .click(function(e) {
          var el = e.currentTarget.parentElement;
          $(el).remove();
          duckburg.order.collectDesignDetails();
        }))
      );
  },

  /**
   * Add a size option to the list of available.
   * @function let a user add a size to the list of sizes currently shown.
   * @param size String size to add to the list.
   * @param index Int design index to insert size to.
   *
   */
   addSizeToDesignForm: function(size, index) {

     var parent = $('#design_sizes_' + index);
     var children = parent.children();

     // Make sure the size is a uppercase string.
     size = size.toUpperCase();

     // Collect the current list of sizes.
     var sizeObj = {};
     for (var i = 0; i < children.length; i++) {
       var child = children[i];
       var id = child.id;
       var oldSize = id.split('_')[0];

       var quantity = 0;
       var labels = $(child).children();
       for (var j = 0; j < labels.length; j++) {
         var label = labels[j];
         if (label.className == 'sizeInput') {
           var val = label.value;
           quantity = val;
         }
       }

       sizeObj[oldSize] = quantity;
     }

     // Add the new size to the list.
     if (!sizeObj[size]) {
       sizeObj[size] = '';
     }

     // Reset the list in the UI.
     duckburg.order.addSizeInputsToSizeHolder(parent, sizeObj);
   },

  /**
   * Add advanced design settings.
   * @function adds a dom element to a design form displaying advanced settings.
   * @param form Object dom element, form to append to.
   *
   */
   addAdvancedDesignSettings: function(form) {

     var settings = {
          'product_category': 'Category',
          'product_store': 'Store',
          'product_ishidden': 'Is hidden',
          'product_isindexed': 'Is indexed'
     };

     // Make a div for the details
     var settingsDetail = $('<span>')
        .attr('class', 'advancedSettingsDetail');

     // Add the holder div.
     form
       .append($('<div>')
         .attr('class', 'advancedSettingsHolder')

         .append($('<span>')
           .attr('class', 'advancedSettingsHeader')
           .html('advanced settings')
           .click(function(e) {
             duckburg.order.toggleAdvancedSettingsVisibility(e);
           }))

         .append(settingsDetail)
        );

     for (var setting in settings) {
       var displayName = settings[setting];
       settingsDetail
         .append($('<label>')
           .html(displayName))
         .append($('<input>')
           .attr('type', 'text')
           .attr('id', setting));
     }
   },

  /**
   * Toggle visiblity of advanced settings div.
   * @function toggles the visiblity of the advanced settings for an item.
   * @param event Object dom element - advanced settings header.
   *
   */
   toggleAdvancedSettingsVisibility: function(event) {

     // Get the advanced settings details div.
     var next = $(event.currentTarget).next()[0];

     if (next.style.display != 'block') {
       next.style.display = 'block';
     } else {
       next.style.display = 'none';
     }
   },

  /**
   * COLLECTING ORDER INFORMATION
   *
   * @module (of sorts)
   * Area of order namespace where information is collected prior
   * to making a request to parse.
   *
   */

   /**
   * Collects order details
   * @function to collect order information away from keyup events.  This
   *           includes customer and item information.
   *
   */
   collectOrderInformation: function() {

     // Create an order if there isn't one
     if (!duckburg.order.currentOrder) {
       duckburg.order.createOrder();
     } else {

       // Build the current customer object.
       var customers = [];
       for (var customer in duckburg.order.currentCustomers) {

         if (customer != 'length') {
           var custObject = {};
           custObject.id = customer;
           custObject.isShip = false;
           custObject.isBill = false;

           // Set the first one as the 'primary customer'.
           if (customers.length == 0) {
             var cust = duckburg.order.currentCustomers[customer];
             var a = cust.attributes;
             var name = a.first_name + ' ' + a.last_name;
             duckburg.order.currentOrder.set('cust_name', name);
             duckburg.order.currentOrder.set('cust_phone', a.phone_number);
             duckburg.order.currentOrder.set('cust_email', a.email_address);
           }

           customers.push(custObject);
         }
       }

       // If there are no customers currently, make sure the quick customer
       // parameters are cleared out.
       if (customers.length == 0) {
         duckburg.order.currentOrder.set('cust_name', '');
         duckburg.order.currentOrder.set('cust_phone', '');
         duckburg.order.currentOrder.set('cust_email', '');
       }


       $('.isShippingCustomer').each(function(item) {
         customers[item].isShip = this.checked;
       });

       $('.isBillingCustomer').each(function(item) {
         customers[item].isBill = this.checked;
       });

       // Stringify the customer info and save the item.
       duckburg.order.currentOrder.set('customers', JSON.stringify(customers));
       duckburg.order.currentOrder.save();
     }
   },

   /**
    * Collect design details.
    * @function iterate over all the visible designs, collecting their sizes,
    *           item ids and total price (even if its 0.00).
    *
    */
   collectDesignDetails: function() {

    // Get number of designs.
    var numDesigns = $('.designFormWithinOrder').length;

    // Holder for the designs.
    var items = [];

    // For each item that exists, look for the design details.
    for (var i = 0; i < numDesigns; i++) {
      var item = {};

      // Get size counts and total items.
      var name = 'size_for_item_' + i;
      item.sizes = {};
      item.total_items = 0
      $('[name="' + name + '"]').each(function() {
        var sizeName = this.id;
        var quantity = this.value == '' ? 0 : this.value;
        item.total_items += parseInt(quantity);
        item.sizes[sizeName] = quantity;
      });

      // Get pricing info and format it properly.
      var price = $('[name="product_price_' + i + '"]').val();
      price = price == '' ? 0 : price;
      var totalCost = price * item.total_items;
      costArray = String(totalCost).split('.');
      var dollars = costArray[0];
      var cents = costArray[1] ? costArray[1].substr(0, 2) : '00';
      cents = cents.length == 1 ? cents + '0' : cents;
      totalCost = dollars + '.' + cents;

      // Set the total price in the ui and on the object.
      item.totalCost = totalCost;
      $('[name="item_total_price_input_' + i + '"]').val('$' + item.totalCost);
    }

    items.push(item);

    if (duckburg.order.currentOrder) {
      items = JSON.stringify(items);
      duckburg.order.currentOrder.set('items', items);
      duckburg.order.currentOrder.save();
    }
   },


  /**
   * Set a loading message
   * @function inform the user that an order is being fetched.
   * @param orderId String id of the order
   *
   */
  setOrderLoadingMessageForId: function(orderId) {
    $('.orderWrapper')
      .html('')
      .append($('<div>')
        .html('currently loading order No.' + orderId)
        .attr('class', 'orderFormLoadingOrderNote'));
  },

  /**
   * Error loading order
   * @function error message for loading an order with provided order id.
   * @param orderId String id of order
   *
   */
  errorLoadingOrderMessage: function(orderId) {
    $('.orderWrapper')
      .html('')
      .append($('<div>')
        .html('error loading order No.' + orderId)
        .attr('class', 'orderFormLoadingOrderErrorNote'));
  }
};
