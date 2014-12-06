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

  // Set is taxed to true.
  isTaxed             : true,

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

    // Populate the summary section.
    duckburg.order.populateSummarySection();

    // Lastly, if an order was passed, populate the form with its details.
    if (order) {
      duckburg.order.fillOrder(order);
    } else {
      duckburg.order.loadNewOrderValues();
    }
  },


  /**
   * Fill order with existing order details.
   * @function fills order form with information about an order.
   * @param order Object parse order object.
   *
   */
  fillOrder: function(order) {

    // Assign the order as the current order onload.
    duckburg.order.currentOrder = order[0];
    var o = duckburg.order.currentOrder.attributes;

    // Fill print date and due date.
    var due_date = duckburg.utils.formatDate(o.due_date);
    $('#due_date').val(due_date);
    var print_date = duckburg.utils.formatDate(o.print_date);
    $('#print_date').val(print_date);

    // Fill in the order name.
    $('#order_name').val(o.order_name);

    // Set the readable id.
    $('#readable_id').html(o.readable_id);

    // Set the global taxed var.
    duckburg.order.isTaxed = o.is_taxed;

    // Set the initial status.
    var bgColor = duckburg.utils.orderStatusMap[o.order_status];
    duckburg.order.updateOrderStatus(o.order_status, bgColor);

    // Set the customers.
    if (o.customers) {
      var customers = JSON.parse(o.customers);
      for (var i = 0; i < customers.length; i++) {
        var customer = customers[i];
        duckburg.order.populateOrderCustomer(customer);
      }
    }

    // Set the designs.
    if (o.items) {
      var items = JSON.parse(o.items);
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        duckburg.order.fetchAndSetDesign(item.id);
        duckburg.order.populateOrderDesigns(item, i);
      }
    }
  },

  /**
   * When deailing with an order, we want to store all parse catalog item
   * objects.  This function fetches the objects as a design is loading
   * and stores them.
   * @function fetches a parse catalog item object and stores it.
   * @param id String parse id for catalog item.
   *
   */
  fetchAndSetDesign: function(id) {
    duckburg.requests.findById(id, 'dbCatalogItem', function(item) {
      if (item && item.id) {
        duckburg.order.currentItems[item.id] = item;
      }
    });
  },

  /**
   * Fill in the order with a customer.
   * @function takes an order object (id, isShip, isBill), then fetches the
   *           customer from Parse and fills in the ui.
   * @param customer Object that contains id (parse id), isShip and isBill
   *
   */
  populateOrderCustomer: function(customer) {

    // Get shipping and billing params.
    var isShip = customer.isShip;
    var isBill = customer.isBill;

    // Fetch the customer and, if found, add them to the order.
    duckburg.requests.findById(customer.id, 'dbCustomer', function(cust) {
      if (cust && cust.id && cust.attributes) {

        // Add the customer in the UI.
        duckburg.order.addCustomerToOrder(cust, isShip, isBill);
      }
    });
  },

  /**
   * Populate the order with information about a design.
   * @function takes a design id and details and fills the order with details.
   * @param design Object internal object format for a design.
   * @param index Int index of design among list of design.
   *
   */
  populateOrderDesigns: function(design, index) {

    // Add the design form.
    duckburg.order.addDesignFormToOrder(design.sizes);

    // Set the design id.
    $('.designFormWithinOrder').each(function() {
      if (this.id == index) {
        $(this).attr('name', design.id);
      }
    });

    // Set design images list.
    $('#design_images_list_' + index).val(design.design_images_list);

    // Set the design name.
    $('[name="item_name_' + index + '"]').val(design.item_name);

    // Product type and color.
    $('[name="product_type_visible_' + index + '"]').val(
        design.product_type_visible);
    $('[name="product_type_' + index + '"]').val(design.product_type);
    $('[name="product_color_' + index + '"]').val(design.product_colors);

    // Set prices.
    $('[name="product_price_' + index + '"]').val(design.product_price);
    $('[name="product_saleprice_' + index + '"]').val(design.product_saleprice);
    $('[name="product_socialprice_' + index + '"]').val(
        design.product_socialprice);

    // Advanced settings.
    $('[name="product_category_' + index + '"]').val(design.product_category);
    $('[name="product_category_visible_' + index + '"]').val(
        design.product_category_visible);
    $('[name="product_store_' + index + '"]').val(design.product_store);
    $('[name="product_store_visible_' + index + '"]').val(
        design.product_store_visible);
    $('[name="product_ishidden_' + index + '"]').val(design.product_ishidden);
    $('[name="product_isindexed_' + index + '"]').val(design.product_isindexed);

    // Description/notes.
    $('[name="design_notes_' + index + '"]').val(design.product_description);

    // Fetch the actual designs and add them to the UI.
    if (design.design_id && design.design_id != '') {
      duckburg.order.fetchAndPlaceExistingDesigns(design.design_id, index);
    }

    // Now, collect the design info once more.
    duckburg.order.collectDesignDetails();
  },

  /**
   * Fetch a design and load its details to the UI.
   * @function for an existing order, fetch its design and load it.
   * @param designId String parse id of design.
   * @param index Int index of item to apply design to.
   *
   */
  fetchAndPlaceExistingDesigns: function(designId, index) {

    // Fetch the design from the database and place it in the UI.
    duckburg.requests.findById(designId, 'dbDesign', function(design) {
      duckburg.order.addDesignToOrder(design, index);
    });
  },

  /**
   * Populate the order summary details.
   * @function populates an area of the UI that shows order totals.
   * @param itemCount Int number of items.
   * @param totalPieces Int number of pieces being printed
   * @param orderTotal Float total cost of order.
   *
   */
  populateSummarySection: function(itemCount, totalPieces, orderTotal) {
    itemCount = itemCount || 0;
    totalPieces = totalPieces || 0;
    orderTotal = orderTotal || 0.00;
    orderTotal = orderTotal == 0 ? '0.00' : orderTotal;

    // Set some labels.
    var itemLabel = itemCount == 1 ? 'design' : 'designs';
    var piecesLabel = totalPieces == 1 ? 'piece' : 'pieces';

    // Determine if order is taxed.
    var taxed = duckburg.order.isTaxed;
    if (duckburg.order.currentOrder) {
      duckburg.order.currentOrder.set('is_taxed', taxed);
      duckburg.order.currentOrder.save();
    }

    // Calculate the tax amount.
    var taxAmt = taxed ? (orderTotal * 0.06).toFixed(2) : '0.00';

    // Get order final Total.
    var finalTotal = (parseFloat(orderTotal) + parseFloat(taxAmt)).toFixed(2);

    // Get payments
    var payments = duckburg.order.totalPayments || '0.00';

    // Get final balance.
    var balance = (parseFloat(finalTotal) - parseFloat(payments)).toFixed(2);

    // Save these order summary details.
    var orderSummary = {
      order_total: orderTotal,
      tax_amount: taxAmt,
      final_total: finalTotal,
      payments: payments,
      balance: balance,
      total_pieces: totalPieces
    };

    // Save these summary details to the order object.
    if (duckburg.order.currentOrder) {
      duckburg.order.currentOrder.set(
        'order_summary', JSON.stringify(orderSummary));
        duckburg.order.currentOrder.save();
    }

    // Clear order summary div.
    $('.orderSummary')
      .html('')

      // Heading for order summary.
      .append($('<h2>')
        .html('order summary')
        .click(function() {
          var className = $('.orderSummary').attr('class');
          if (className == 'orderSummary visible') {
            $('.orderSummary').attr('class', 'orderSummary hidden');
          } else {
            $('.orderSummary').attr('class', 'orderSummary visible');
          }
        }))

      // Tax toggle.
      .append($('<label>')
        .attr('class', 'toggleTaxLabel')
        .html('tax this order'))
      .append($('<input>')
        .attr('class', 'toggleTaxInput')
        .attr('id', 'order_is_taxed')
        .attr('type', 'checkbox')
        .prop('checked', taxed)

        // Toggle order taxed global onclick.
        .click(function() {
          var checked = $('#order_is_taxed').prop('checked');
          duckburg.order.isTaxed = checked;

          if (duckburg.order.currentOrder) {
            duckburg.order.currentOrder.set('is_taxed', checked);
            duckburg.order.currentOrder.save();
          }

          // Collect the design details.
          duckburg.order.collectDesignDetails();
        }))

      // Append a div for the total pieces.
      .append($('<div>')
        .append($('<label>')
          .attr('class', 'amtLabel')
          .html(totalPieces))
        .append($('<label>')
          .attr('class', 'descLabel')
          .html(piecesLabel)))

      // Append a div for the order subtotal
      .append($('<div>')
        .attr('class', 'orderSubtotalDiv')
        .append($('<label>')
          .attr('class', 'descLabel')
          .html('subtotal'))
        .append($('<label>')
          .attr('class', 'amtLabel')
          .html('$' + orderTotal)))

      // Div for tax amount.
      .append($('<div>')
        .attr('class', 'orderTaxDiv')
        .append($('<label>')
          .attr('class', 'descLabel')
          .html('tax'))
        .append($('<label>')
          .attr('class', 'amtLabel')
          .html('$' + taxAmt)))


      // Append a div for the order subtotal
      .append($('<div>')
        .attr('class', 'orderTotalDiv')
        .append($('<label>')
          .attr('class', 'descLabel')
          .html('total'))
        .append($('<label>')
          .attr('class', 'amtLabel')
          .html('$' + finalTotal)))

      // Div for payments amount.
      .append($('<div>')
      .attr('class', 'orderPaymentsDiv')
        .append($('<label>')
          .attr('class', 'descLabel')
          .html('payments'))
        .append($('<label>')
          .attr('class', 'amtLabel')
          .html('$' + payments)))

      // Append a div for the order subtotal
      .append($('<div>')
        .attr('class', 'orderBalanceDiv')
        .append($('<label>')
          .attr('class', 'descLabel')
          .html('balance'))
        .append($('<label>')
          .attr('class', 'amtLabel')
          .html('$' + balance)))

      .append($('<label>')
        .html('payments')
        .attr('class', 'paymentsButton')
        .click(function() {
          if (duckburg.order.currentOrder) {
            duckburg.utils.paymentModule(duckburg.order.currentOrder);
          }
        }))

      .append($('<label>')
        .html('invoice')
        .attr('class', 'invoiceButton')
        .click(function() {
          if (duckburg.order.currentOrder) {
            var orderId = duckburg.order.currentOrder.attributes.readable_id;
            window.open('/invoice/' + orderId, '_blank');
          }
        }));
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
    duckburg.utils.addHighsmithCalendars(['due_date', 'print_date'], true);
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

    // Update order status nub.
    duckburg.order.orderSavingStatus('saving');

    // If the click has closed the calendar, remove listener.
    if (!$('#highsmithCal').length) {

      // Only update if an order exists.
      if (duckburg.order.currentOrder) {

        // Get due date.
        var dueDate = new Date($('#due_date').val());

        // Update and save.
        duckburg.order.currentOrder.set('due_date', dueDate);
        duckburg.order.saveOrderAndUpdateStatus();
      }

      // Remove the listener that kicked off this function.
      $(document).unbind('click', duckburg.order.updateDueDate);
    }
  },

  /** Identical to updateDueDate method, but used for print date. **/
  updatePrintDate: function() {

    // Update order saving nub.
    duckburg.order.orderSavingStatus('saving');

    // If the calendar is still visible, then don't do anything.
    if (!$('#highsmithCal').length) {

      // Only update if an order exists.
      if (duckburg.order.currentOrder) {

        // Get due date.
        var printDate = new Date($('#print_date').val());

        // Update and save.
        duckburg.order.currentOrder.set('print_date', printDate);
        duckburg.order.saveOrderAndUpdateStatus();
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

      // Update the order saving nub.
      duckburg.order.orderSavingStatus('saving');

      // Update the order status in the ui.
      $('#order_status')
        .html(status)
        .css({'background': bgColor});

      // Update the status in the database.
      if (duckburg.order.currentOrder) {
        duckburg.order.currentOrder.set('order_status', status);
        duckburg.order.saveOrderAndUpdateStatus();
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

              // Add a blank design form.
              duckburg.order.addDesignFormToOrder();

              // Update the design globals in memory.
              duckburg.order.collectDesignDetails();
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

     if (duckburg.order.updateObjectParamTimer) {
       window.clearInterval(duckburg.order.updateObjectParamTimer);
     }

     // Update the order saving nub.
     duckburg.order.orderSavingStatus('saving');

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
         var orderName = $('#order_name').val();
         var orderNumber = $('#readable_id').html();
         var searchString = (orderName + orderNumber).toLowerCase();
         duckburg.order.currentOrder.set(param, newVal);       
         duckburg.order.currentOrder.set('parse_search_string', searchString);

         // Kick off the save function
         duckburg.order.updateObjectParamTimer = setTimeout(function() {
           duckburg.order.saveOrderAndUpdateStatus();
         }, duckburg.utils.orderSaveInterval);
       }

     // Update a customer item.
     } else if (type == 'dbCustomer') {
       var customer = duckburg.order.currentCustomers[element.title];
       customer.set(param, newVal);
       var a = customer.attributes;
       var searchString = a.first_name + a.last_name + a.email_address +
          a.phone_number;
       customer.set('parse_search_string', searchString.toLowerCase());
       customer.save().then(function(response) {
           duckburg.order.orderSavingStatus('saved');
         },

         function(error) {
           var msg = 'Error updating customer: ' + error.message;
           duckburg.order.orderSavingStatus('error');
           duckburg.utils.errorMessage(msg);
         });
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
    var dueDate = $('#due_date').val() || new Date();
    var printDate = $('#print_date').val() || new Date();

    // Be sure there isn't another order with this id.
    duckburg.requests.fetchOrderById(orderNumber, function(result) {
      if (result.length > 0) {

        // In this event, two windows/orders have been opened rapidly.  Don't
        // save a second order unless it has a unique id.
        orderNumber = String(orderNumber).replace(/0/g, '');
        orderNumber = parseInt(orderNumber) + 1;

        orderNumber = '000000' + orderNumber;
        orderNumber = orderNumber.slice(orderNumber.length - 6, orderNumber.length);
        $('#readable_id').html(orderNumber);
        duckburg.order.createOrder();

      } else {

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
      }
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

    // Add a description area to the form.
    duckburg.order.addDescriptionBlockToDesignForm(newForm);

    // Add advanced settings to the design.
    duckburg.order.addAdvancedDesignSettings(newForm);

    // Append the new form.
    $('.designsDetailsCustomerHolder').append(newForm);
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

     // Populate a popup that confirms the user action of removing a design.
     $('#popupContent')
       .attr('class', 'confirmRemoveDesignPopup')

       // Message for popup.
       .append($('<span>')
         .html('Are you sure you want to remove this design?'))

       // Cancel action for popup.
       .append($('<label>')
         .html('cancel')
         .attr('class', 'cancel')
         .click(function() {
           duckburg.utils.hidePopup();
         }))

       // Confirm action for popup.
       .append($('<label>')
         .html('remove')
         .attr('class', 'remove')
         .attr('id', idx)
         .click(function(e) {
           var index = e.currentTarget.id;
           $('.designFormWithinOrder').each(function() {
             if (this.id == index) {

               // Remove the object from the current list of objects.
               var parseId = $(this).attr('name');
               if (duckburg.order.currentItems[parseId]) {
                 delete duckburg.order.currentItems[parseId];
               }

               // Remove div containing design.
               $(this).remove();
             }
           });

           // Hide the popup and collect the design details.
           duckburg.utils.hidePopup();
           duckburg.order.collectDesignDetails();
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
        .attr('name', 'item_name_' + numDesigns)
        .attr('placeholder', 'name of design')
        .keyup(function() {
          duckburg.order.collectDesignDetails();
        }))
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
          .attr('type', 'hidden')
          .attr('id', 'product_type')
          .attr('class', 'productTypeWithinForm')
          .attr('name', 'product_type_' + numDesigns))
        .append($('<input>')
          .attr('type', 'text')
          .attr('id', 'product_type_visible')
          .attr('class', 'productTypeInputField')
          .attr('name', 'product_type_visible_' + numDesigns)
          .click(function(e) {
            duckburg.order.lastClickedProduct = e.currentTarget.name;
            duckburg.utils.launchRelatedItemSelector(
                e, 'product_name', 'dbProduct', 'product_type');
          }))

        // Product type label and input.
        .append($('<label>')
          .html('product color')
          .attr('class', 'productColorLabel'))
        .append($('<input>')
          .attr('type', 'text')
          .attr('id', 'product_color')
          .attr('name', 'product_color_' + numDesigns)
          .attr('class', 'productColorInputField')
          .keyup(function() {
            duckburg.order.collectDesignDetails();
          }))
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
    * Add area for a design description.
    * @function adds area for user to add an item description/notes.
    * @param form Obj dom element, form to append to.
    *
    */
  addDescriptionBlockToDesignForm: function(form) {

    // Get number of designs.
    var numDesigns = $('.designFormWithinOrder').length;

    // Append field to form.
    form
      .append($('<textarea>')
        .attr('class', 'designNotesWithinDesignForm')
        .attr('name', 'design_notes_' + numDesigns)
        .attr('placeholder', 'notes')
        .keyup(function() {
          duckburg.order.collectDesignDetails();
        }));
  },

   /**
    * Add image holder to form.
    * @function adds an image holder so that images can be added to a new
    *           item.  This manages 'designs' associated with items.
    * @param form Object the dom element for the design form.
    *
    */
  addDesignImageHolderToDesignForm: function(form) {

    // Get number of designs.
    var numDesigns = $('.designFormWithinOrder').length;

    // Append the holder element.
    form
      .append($('<div>')
        .attr('class', 'designImageSelectorDiv')
        .append($('<h3>')
          .html('images'))

        // Append an image picker.
        .append($('<input>')
          .attr('class', 'designImagesFilePicker')
          .attr('id', numDesigns)
          .attr('type', 'file')

          // Give the image picker an onchange function.
          .change(function(e) {

            // Using the input, upload the file that's been selected.
            var file = event.currentTarget;

            // Update order status nub.
            duckburg.order.orderSavingStatus('saving');

            duckburg.requests.saveFileFromInput(file, function(result, input) {

              // Mimic a parse design object.
              var design = {
                id: false,
                attributes: {
                  design_images_list: result._url
                }
              }

              // Set this design as the current design.
              duckburg.order.addDesignToOrder(design, input.id);
            });
          }))
        .append($('<em>')
          .html('or'))
        .append($('<button>')
          .html('select existing design')
          .attr('class', 'existingDesignButton')
          .attr('id', numDesigns)
          .click(function(e) {
            duckburg.order.launchExistingDesignSearchBox(e);
          }))
        .append($('<div>')
          .attr('class', 'imagesWithinImageHolder')
          .attr('id', 'imagesWithinImageHolder_' + numDesigns))
        .append($('<input>')
          .attr('type', 'hidden')
          .attr('class', 'designImagesList')
          .attr('id', 'design_images_list_' + numDesigns))
    );
  },

  /**
   * Launch popup to search for existing designs.
   * @function allows user to add existing design to order.
   * @param event Obj dom element that caused event.
   *
   */
  launchExistingDesignSearchBox: function(event) {
    var id = event.currentTarget.id;
    duckburg.order.performingExistingDesignSearchForDesignIndex = id;

    // Show the popup.
    duckburg.utils.showPopup();

    // Assign class to popup content
    $('#popupContent')
      .attr('class', 'existingDesignSearchBox')

      // Append a search input.
      .append($('<input>')
        .attr('class', 'designSearchInput')
        .attr('placeholder', 'search for designs')
        .keyup(function(e) {
          duckburg.order.searchForDesigns(e);
        }))
      .append($('<div>')
        .attr('class', 'designSearchResults'))
      .append($('<button>')
        .attr('class', 'cancelDesignSearch')
        .html('cancel')
        .click(function() {
          duckburg.utils.hidePopup();
        }));
  },

  /**
   * Search for designs
   * @function allows user to search through existing designs.
   * @param event Obj dom element of input where search is occurring.
   *
   */
  searchForDesigns: function(event) {
    if (duckburg.order.filteredDesignSearchTimer) {
      window.clearInterval(duckburg.order.filteredDesignSearchTimer);
    }

    duckburg.order.filteredDesignSearchTimer = setTimeout(function() {

      $('.designSearchResults')
        .html('')
        .append($('<span>')
          .attr('class', 'searchingMessage')
          .html('searching for designs'));

      var term = event.currentTarget.value.toLowerCase();
      duckburg.requests.findObjects('dbDesign', term, function(results) {

        if (!results || results.length == 0) {
          $('.designSearchResults')
            .html('')
            .append($('<span>')
              .attr('class', 'noResultsMessage')
              .html('no results for that search'));

        } else {

          duckburg.order.currentlySearchingDesignResults = results;

          $('.designSearchResults')
            .html('');

          for (var i = 0; i < results.length; i++) {
            var design = results[i];
            var atrib = design.attributes;
            var imgList = atrib.design_images_list.split(',');

            var designSpan = $('<span>')
              .attr('class', 'designSearchResultSpan')
              .attr('id', i)
              .click(function(e) {
                var id = e.currentTarget.id;
                var design = duckburg.order.currentlySearchingDesignResults[id];
                duckburg.order.addDesignToOrder(design);
                duckburg.utils.hidePopup();
              });

            var titleLabel = $('<label>')
              .html(atrib.design_name);

            var imageLabel = $('<label>')
              .attr('class', 'designSearchResultsImages');

            for (var j = 0; j < imgList.length; j++) {
              var img = imgList[j];
              var imgSpan = $('<span>')
                .css({'background': 'url(' + img + ')',
                'background-size': '100%'});
              imageLabel.append(imgSpan);
            }

            designSpan
              .append(titleLabel)
              .append(imageLabel);

            $('.designSearchResults')
              .append(designSpan);
          }
        }
      });
    }, 1000);
  },

  /**
   * Add design to order.
   * @function adds a design to an order item.
   * @param design Object parse dbDesign object
   * @param index Int index of item to add design to
   *
   */
  addDesignToOrder: function(design, index) {

    // 0 is a valid result for index, so we can't do a simple t/f evaluation
    // on this variable.
    if (index != 0) {

      // Get item index (which of the visible items to add to);
      index =
          index || duckburg.order.performingExistingDesignSearchForDesignIndex;
    }

    // Get and, if necessary, set design id.
    var designId = $('#imagesWithinImageHolder_' + index).attr('name');

    var isExistingDesign;
    if (!designId || designId == '') {
      if (design.id) {

        // Update design id.
        designId = design.id;

        // Store the design id as the name of the image holder.
        $('#imagesWithinImageHolder_' + index).attr('name', design.id);

        // Store the actual design object in the list of global design objects.
        if (!duckburg.order.currentDesigns[design.id]) {
          duckburg.order.currentDesigns[design.id] = design;
        }
        isExistingDesign = true;
      }
    } else {
      isExistingDesign = true;
    }

    // Add the image to the current list of images.
    var imgList = $('#design_images_list_' + index).val();
    var existingImgArray = imgList ? imgList.split(',') : [];

    // Place the images in the div.
    var imgArray = design.attributes.design_images_list.split(',');

    for (var i = imgArray.length - 1; i >= 0; i--) {
      var img = imgArray[i];
      if (img.search('http://') == -1 && img.search('jobimages') == -1) {
        img = '/jobimages/' + img;
      }

      // Other format img url may be in.
      var oldImg = img.replace('/jobimages/', '');

      // If img is not in the array already.
      if (existingImgArray.indexOf(img) == -1 &&
        existingImgArray.indexOf(oldImg) == -1 ) {

        existingImgArray.push(img);

      }

      // Append the image to the list of images.
      $('#imagesWithinImageHolder_' + index)
        .append($('<span>')
          .css({'background': 'url(' + img + ')',
          'background-size': '100%'})

          .append($('<label>')
            .attr('class', 'delete')
            .html('remove')
            .attr('id', String(img))
            .click(function(e) {

              // Remove an image from the list.
              duckburg.order.removeImageFromOrder(e);
            })
            .change(function() {

              // If this value changes, be sure to collect design details.
              duckburg.order.collectDesignDetails();
            })
          )
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

    // Remember the array of images in a hidden input.
    var stringImages = existingImgArray.join(',');
    $('#design_images_list_' + index).val(stringImages);

    // Determine if a new design should be created.
    if (!isExistingDesign) {
      var params = {
        design_images_list: stringImages,
        design_name: $('[name="item_name_' + index + '"]').val(),
        parse_search_string: $('#item_name_' + index).val(),
        indexInList: index
      };

      duckburg.requests.createNewObject('dbDesign', params, function(result) {

        // Store the parse ID as the name of the image holder.
        $('#imagesWithinImageHolder_' + result.attributes.indexInList)
          .attr('name', result.id);

        // Store the actual object in our global list of design objects.
        if (!duckburg.order.currentDesigns[result.id]) {
          duckburg.order.currentDesigns[result.id] = result;
        }

      });
    } else {
      duckburg.order.currentDesigns[designId].set(
          'design_images_list', stringImages);
    }

    // Set a timer and then update the image list, id, etc.
    setTimeout(function() {
      duckburg.order.collectDesignDetails();
    }, 1000);
  },

  /**
   * Remove an image from an item.
   * @function allows user to remove a selected image from an item's list.
   * @param e Object event from clicking on image span.
   *
   */
  removeImageFromOrder: function(e) {

    // Image span.
    var imageSpan = $(e.currentTarget).parent();

    // Current target's id is the image url.
    var removedImage = e.currentTarget.id;

    // Span that holds all images.
    var imageHolder = $(imageSpan).parent();

    // Hidden input that holds stringed list of images.
    var designImagesHolder = imageHolder.next();

    // Remove the visible images from the list in the UI.
    imageSpan.remove();

    // Get the list of images as an array, and remove the image that has just
    // been removed from the UI.
    var designImageList = designImagesHolder.val().split(',');
    var removedImageIndex = designImageList.indexOf(removedImage);
    designImageList.splice(removedImageIndex, 1);

    // Now, update the value in the ui.
    designImagesHolder.val(designImageList.join(','));

    // If all images have been removed, also remove the design id that is
    // being stored in the main holder name.
    if (designImageList.length == 0 || !designImageList.length) {

      // Remove the object, if it is being stored.
      var id = $(imageHolder).attr('name');
      if (duckburg.order.currentDesigns[id]) {
        delete duckburg.order.currentDesigns[id];
      }

      // Reset the name to null.
      $(imageHolder).attr('name', '');
    }

    // Collect the design details again.
    duckburg.order.collectDesignDetails();
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

     // Get the current number of designs.
     var numDesigns = $('.designFormWithinOrder').length;

     // Append a product category input.
     settingsDetail
       .append($('<label>')
         .html('Category'))
       .append($('<input>')
         .attr('type', 'text')
         .attr('class', 'productCatVis')
         .attr('id', 'product_category_visible')
         .attr('name', 'product_category_visible_' + numDesigns)
         .click(function(e) {
           duckburg.order.lastClickedCategory = e.currentTarget.name;
           duckburg.utils.launchRelatedItemSelector(
             e, 'category_name', 'dbCatCategory', 'category_name');
         }))
       .append($('<input>')
         .attr('type', 'hidden')
         .attr('class', 'productCat')
         .attr('id', 'product_category')
         .attr('name', 'product_category_' + numDesigns));

     // Append a product store input.
     settingsDetail
       .append($('<label>')
         .html('Store'))
       .append($('<input>')
         .attr('type', 'text')
         .attr('class', 'productStoreVis')
         .attr('id', 'product_store_visible')
         .attr('name', 'product_store_visible_' + numDesigns)
         .click(function(e) {
           duckburg.order.lastClickedCategory = e.currentTarget.name;
           duckburg.utils.launchRelatedItemSelector(
             e, 'store_name', 'dbStorefront', 'category_name');
           }))
        .append($('<input>')
          .attr('type', 'hidden')
          .attr('class', 'productStore')
          .attr('id', 'product_store')
          .attr('name', 'product_store_' + numDesigns));

      // Append a product is_indexed input.
      settingsDetail
        .append($('<label>')
          .html('Is indexed?'))
        .append($('<input>')
          .attr('type', 'text')
          .attr('id', 'product_isindexed')
          .attr('class', 'productIsIndexed')
          .attr('placeholder', 'yes/no (default no)')
          .attr('name', 'product_isindexed_' + numDesigns));

      // Append a product is_indexed input.
      settingsDetail
        .append($('<label>')
          .html('Is hidden?'))
        .append($('<input>')
          .attr('type', 'text')
          .attr('id', 'product_ishidden')
          .attr('class', 'productIsHidden')
          .attr('placeholder', 'yes/no (default yes)')
          .attr('name', 'product_ishidden_' + numDesigns));
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

   /** Resets the counters found in the ids of the design details.
    *  @function when a design is removed, indexes of the current designs
    *            can be thrown off.  Eg, if design #2 of 3 is deleted, now
    *            design 3 should be updated and referred to as design 2.
    *
    */
   resetDesignCounters: function() {

     // Reset the names of the designs.
     $('.designFormIdSpan').each(function(item) {
       var designNumber = item + 1;
       this.innerHTML = 'Design No.' + designNumber;
       $(this)
         .append($('<label>')
           .html('<i class="fa fa-times"></i>')
           .attr('id', item)
           .click(function(e) {
             duckburg.order.removeDesignFromOrder(e);
           })
         );
     });

     // Reset the id of the total price input.
     $('.itemTotalPriceInput').each(function(item) {
       $(this).attr('name', 'item_total_price_input_' + item);
     });

     // Reset id of the pricing inputs.
     $('.designProductDetailInputs').each(function(item) {
       $(this).attr('id', item);
     });

     // Reset id of image pickers.
     $('.designImagesFilePicker').each(function(item) {
       $(this).attr('id', item);
     });

     // Product type holders.
     $('.productTypeWithinForm').each(function(item) {
       $(this).attr('name', 'product_type_' + item);
     });
     $('.productTypeInputField').each(function(item) {
       $(this).attr('name', 'product_type_visible_' + item);
     });
     $('.productColorInputField').each(function(item) {
       $(this).attr('name', 'product_color_' + item);
     });

     // Advanced settings holders.
     $('.productCatVis').each(function(item) {
       $(this).attr('name', 'product_category_visible_' + item);
     });
     $('.productCat').each(function(item) {
       $(this).attr('name', 'product_category_' + item);
     });
     $('.productStoreVis').each(function(item) {
       $(this).attr('name', 'product_store_visible_' + item);
     });
     $('.productStore').each(function(item) {
       $(this).attr('name', 'product_store_' + item);
     });
     $('.productIsIndexed').each(function(item) {
       $(this).attr('name', 'product_isindexed_' + item);
     });
     $('.productIsHidden').each(function(item) {
       $(this).attr('name', 'product_ishidden_' + item);
     });


     // Update design name inputs.
     $('.designFormItemNameInput').each(function(item) {
       $(this).attr('name', 'item_name_' + item);
     });

     // Reset id of add size buttons.
     $('.addSizeButton').each(function(item) {
       $(this).attr('id', item);
     });

     // Reset notes fields.
     $('.designNotesWithinDesignForm').each(function(item) {
       $(this).attr('name', 'design_notes_' + item);
     });

     // Existing images button id.
     $('.existingDesignButton').each(function(item) {
       $(this).attr('id', item);
     });

     // Image holder div.
     $('.imagesWithinImageHolder').each(function(item) {
       $(this).attr('id', 'imagesWithinImageHolder_' + item);
     });

     $('.designImagesList').each(function(item) {
       $(this).attr('id', 'design_images_list_' + item);
     });

     // Update price holder ids.
     $('.designPriceDetailInputs').each(function(item) {
       var itemIndex = item;
       var children = $(this).children();
       for (var i = 0; i < children.length; i++) {
         var child = children[i];

         // Update product price, sale price and social price.
         if (child.id == 'product_price') {
           $(child).attr('name', 'product_price_' + itemIndex);
         }
         if (child.id == 'product_saleprice') {
           $(child).attr('name', 'product_saleprice_' + itemIndex);
         }
         if (child.id == 'product_socialprice') {
           $(child).attr('name', 'product_socialprice_' + itemIndex);
         }
       }
     });

     // Update the main and individual size ids.
     $('.designFormSizeHolder').each(function(item) {
       $(this).attr('id', 'design_sizes_' + item);
       var itemIndex = item;

       var kids = $(this).children();
       for (var i = 0; i < kids.length; i++) {
         var kid = kids[i];
         var inputs = $(kid).children();
         for (var j = 0; j < inputs.length; j++) {
           var input = inputs[j];
           if (input.className == 'sizeInput') {
             $(input).attr('name', 'size_for_item_' + itemIndex);
           }
         }
       }
     });

     // Reset the ids of the main divs.
     $('.designFormWithinOrder').each(function(item) {
       this.id = item;
     });
   },

   /**
    * Create a catalog item.
    * @function as an order progresses, if an item needs to be created, use the
    *           details that exist and create a catalog item.
    * @param item Object catalog item object.
    *
    */
   createCatalogItem: function(item) {

    duckburg.requests.createNewObject('dbCatalogItem', item, function(result) {

      // Assing the new item's id to the design div.
      $('.designFormWithinOrder').each(function(count) {
        if (count == item.indexInLoop) {
          $(this).attr('name', result.id);
          duckburg.order.currentItems[result.id] = result;
        }
      });
    });
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

     // Clear the timer for collecting info.
     if (duckburg.order.collectOrderInfoTimer) {
       window.clearInterval(duckburg.order.collectOrderInfoTimer);
     }

     // Update order status div.
     duckburg.order.orderSavingStatus('saving');

     // After a short wait, collect order information
     duckburg.order.collectOrderInfoTimer = setTimeout(function() {

        //  Create an order if there isn't one
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
          duckburg.order.saveOrderAndUpdateStatus();
        }
     }, duckburg.utils.orderSaveInterval);
   },

   /**
    * Collect design details.
    * @function iterate over all the visible designs, collecting their sizes,
    *           item ids and total price (even if its 0.00).
    *
    */
   collectDesignDetails: function() {

    // Kill the timer if it exists.
    if (duckburg.order.collectDesignDetailsTimer) {
      window.clearInterval(duckburg.order.collectDesignDetailsTimer);
    }

    // Update order status div.
    duckburg.order.orderSavingStatus('saving');

    // After a short wait, collect design details.
    duckburg.order.collectDesignDetailsTimer = setTimeout(function() {

      // Reset the counter ids on all designs, in case one has been removed and
      // the indexes are off.
      duckburg.order.resetDesignCounters();

      // Get number of designs.
      var numDesigns = $('.designFormWithinOrder').length;

      // Holder for the designs.
      var items = [];

      // Totals for order summary.
      var itemCount = 0;
      var totalPieces = 0;
      var orderTotal = 0;

      // For each item that exists, look for the design details.
      for (var i = 0; i < numDesigns; i++) {

        // Start a fresh item and incremment item count.
        var item = {};
        itemCount++;

        // Store the index within this loop.
        item.indexInLoop = i;

        // Get the item id, if it exists.
        $('.designFormWithinOrder').each(function() {
          if (this.id == i) {
            item.id = $(this).attr('name');
          }
        });

        // Remember the design id.
        item.design_id = $('#imagesWithinImageHolder_' + i).attr('name');

        // Remember the list of images.
        item.design_images_list = $('#design_images_list_' + i).val();

        // Get the item's name.
        item.item_name = $('[name="item_name_' + i + '"]').val();

        // Update the current design details after grabbing them.
        duckburg.order.updateAndSaveDesignDetails(
          item.design_id, item.design_images_list, item.item_name);

        // Get the product type and id.
        item.product_type_visible =
            $('[name="product_type_visible_' + i + '"]').val();
        item.product_type = $('[name="product_type_' + i + '"]').val();

        // Get pricing info and format it properly.
        var price = $('[name="product_price_' + i + '"]').val();
        price = price == '' ? '0' : price;
        item.product_price = price;

        // Get the social and sale prices.
        item.product_saleprice = $('[name="product_saleprice_' + i + '"]').val();
        item.product_socialprice =
            $('[name="product_socialprice_' + i + '"]').val();

        // Notes
        item.product_description = $('[name="design_notes_' + i + '"]').val();

        // Product color
        item.product_colors = $('[name="product_color_' + i + '"]').val();

        // Product category
        item.product_category = $('[name="product_category_' + i + '"]').val();
        item.product_category_visible =
            $('[name="product_category_visible_' + i + '"]').val();

        // Product store
        item.product_store = $('[name="product_store_' + i + '"]').val();
        item.product_store_visible =
            $('[name="product_store_visible_' + i + '"]').val();

        // Product is hidden
        var isHidden = $('[name="product_ishidden_' + i + '"]').val();
        item.product_ishidden = isHidden == '' || !isHidden ? 'yes' : isHidden;

        // Product is indexed
        var isIndexed = $('[name="product_isindexed_' + i + '"]').val();
        item.product_isindexed = isIndexed == '' || !isIndexed ? 'no' : isIndexed;

        // Create new item or update existing item.
        if (!item.id || item.id == '') {
          duckburg.order.createCatalogItem(item);
        } else {
          if (duckburg.order.currentItems[item.id]) {

            // Add each property to the item.
            for (var prop in item) {
              duckburg.order.currentItems[item.id].set(prop, item[prop]);
            }

            // Set search string and save.
            duckburg.order.currentItems[item.id].set(
                'parse_search_string', item.item_name);
            duckburg.order.currentItems[item.id].save();
          }
        }

        // Get size counts and total items.
        var name = 'size_for_item_' + i;
        item.sizes = {};
        item.total_items = 0
        $('[name="' + name + '"]').each(function() {
          var sizeName = this.id;
          var quantity = this.value == '' ? 0 : this.value;
          item.total_items += parseInt(quantity);
          totalPieces += parseInt(quantity);
          item.sizes[sizeName] = quantity;
        });

        // Continue calculating total cost.
        var totalCost = price * item.total_items;
        costArray = String(totalCost).split('.');
        var dollars = costArray[0];
        var cents = costArray[1] ? costArray[1].substr(0, 2) : '00';
        cents = cents.length == 1 ? cents + '0' : cents;
        totalCost = dollars + '.' + cents;

        // Set the total price in the ui and on the object.
        item.total_cost = totalCost;
        orderTotal = (parseFloat(orderTotal) + parseFloat(totalCost)).toFixed(2);
        $('[name="item_total_price_input_' + i + '"]').val('$' + item.total_cost);

        // Push the item into the list of items.
        items.push(item);
      }

      // Set the items on the order.
      if (duckburg.order.currentOrder) {
        items = JSON.stringify(items);
        duckburg.order.currentOrder.set('items', items);
        duckburg.order.currentOrder.save().then(function(response) {
          duckburg.order.orderSavingStatus('saved');
        },

        function(error) {
          var msg = 'Error saving order: ' + error.message;
          duckburg.order.orderSavingStatus('error');
        });
      }

      if (!duckburg.order.totalPayments && duckburg.order.currentOrder) {
        duckburg.order.getAllPayments();
      }

      // Update the order summary.
      duckburg.order.populateSummarySection(itemCount, totalPieces, orderTotal);

      // Store this current order in the order log.
      var o = duckburg.order.currentOrder;
      var id = o.id;
      var orderJson = JSON.stringify(o.attributes);
      var user = duckburg.curUser.attributes.username;
      duckburg.requests.addOrderLogEntry(id, orderJson, user);

    }, duckburg.utils.orderSaveInterval);
   },

   /**
    * Get all payments for an order
    * @function collects all payments for an order, and store a total.
    *
    */
   getAllPayments: function() {

     var id = duckburg.order.currentOrder.id;
     duckburg.requests.getOrderPayments(id, function(results) {
       var total = 0;
       for (var i = 0; i < results.length; i++) {
         var result = results[i].attributes;
         total += parseFloat(result.amount);
       }

       // Keep track of the payments.
       duckburg.order.totalPayments = parseFloat(total).toFixed(2);

       // Collect design details.
       duckburg.order.collectDesignDetails();
     });

   },

  /**
   * Update the details of all open designs.
   * @function when collecting all order details, this function looks for any
   *           designs that are part of the order, and saves them in Parse.
   * @param id String id of the design
   * @param list String list of image urls
   * @param name String name of item (design gets same name)
   *
   */
   updateAndSaveDesignDetails: function(id, list, name) {
     if (duckburg.order.currentDesigns[id]) {
       duckburg.order.currentDesigns[id].set('design_images_list', list);
       duckburg.order.currentDesigns[id].set('design_name', name);
       duckburg.order.currentDesigns[id].set(
          'parse_search_string', name.toLowerCase());
       duckburg.order.currentDesigns[id].save();
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
  },

  /**
   * Update the order status
   * @function update the order status nub as the order is updated.
   * @param status The current status to set the nub to.
   *
   */
   orderSavingStatus: function(status) {
     if (status == 'saving') {
       $('.orderStatus')
         .attr('class', 'orderStatus visible saving')
         .html('<i class="fa fa-spin fa-circle-o-notch"></i> saving order');
     } else if (status == 'saved') {
       $('.orderStatus')
         .attr('class', 'orderStatus visible saved')
         .html('<i class="fa fa-floppy-o"></i> order saved');
     } else if (status == 'error') {
       $('.orderStatus')
         .attr('class', 'orderStatus visible error')
         .html('<i class="fa fa-exclamation-circle"></i> issue saving');
     }
   },

   saveOrderAndUpdateStatus: function() {

     // Save the order with parse and handle success/error.
     duckburg.order.currentOrder.save().then(function(response) {
       duckburg.order.orderSavingStatus('saved');
     },

     function(error) {
       var msg = 'Error saving order: ' + error.message;
       duckburg.order.orderSavingStatus('error');
     });
   }
};
