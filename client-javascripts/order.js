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
              console.log('clicked print date')
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
            .attr('class', 'designDetailsAddNewButton'))

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
         console.log('updating current order w', param, newVal);
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
          customers.push(custObject);
        }
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
