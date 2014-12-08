// Global duckburg namespace.
var duckburg = duckburg || {};

/**
 * Order list view
 * @module the order list is the main view in duckburg.
 *
 */
duckburg.orderList = {

  /** Set some globals for holding current sort state. **/
  curSortStatuses: false,
  curSortParam: false,
  curSortDirection: false,
  curSortFilters: false,

  /**
   * Load the view
   * @function load the order list view.
   * @param statuses Array of order statuses to show
   * @param sortParam String parameter to sort
   * @param sortDirection String direction to sort by
   *
   */
  load: function(statuses, sortParam, sortDirection, filters) {

    // Set some globals before they are assigned defaults.
    duckburg.orderList.curSortStatuses = statuses;
    duckburg.orderList.curSortParam = sortParam;
    duckburg.orderList.curSortDirection = sortDirection;
    duckburg.orderList.curSortFilters = filters;

    // Set the variables if they haven't been passed.
    statuses = statuses || duckburg.utils.defaultSortStatuses;
    sortParam = sortParam || duckburg.utils.defaultSortParam;
    sortDirection = sortDirection || duckburg.utils.defaultSortDirection;

    // Loading message for orders.
    $('.orderList')
      .html('')
      .append($('<span>')
        .attr('class', 'loadingOrderMessage')
        .html('loading orders'))

    // Uncheck all status filter boxes.
    $('.statusFilterCheckbox').each(function() {
      this.checked = false;
    });

    // Check the selected statuses;
    for (var i = 0; i < statuses.length; i++) {
      var status = statuses[i];
      $('#status_filter_' + status).prop('checked', true);
    }

    // Fetch the orders.
    duckburg.requests.findOrders(statuses, sortParam, sortDirection, filters,
      function(orders) {
          duckburg.orderList.renderOrderList(orders);
      });

  },

  /**
   * Render a list of orders.
   * @function given a list of orders, render the list in the UI.
   * @param orders Array list of orders.
   *
   */
  renderOrderList: function(orders) {

    // Object containing all viewing orders.
    duckburg.orderList.viewingOrders = {};

    // Clear the order list.
    $('.orderList').html('');

    // Condition for no orders.
    if (!orders || orders.length == 0) {
      $('.orderList')
        .append($('<span>')
          .attr('class', 'orderListNoOrdersFoundSpan')
          .html('no orders were found matching these filters'))
    }

    // Holder needed for highsmith calendars.
    var ids = [];

    // Iterate over the orders.
    for (var i = 0; i < orders.length; i++) {

      // Capture order.
      var order = orders[i];

      // Add the order to the global object.
      duckburg.orderList.viewingOrders[order.id] = order;

      // Capture id so that calendar can be assigned.
      ids.push('cal_' + orders[i].id);

      // Render order to list.
      duckburg.orderList.renderSingleOrderToList(order, i);
    }

    // Attach highsmith calendars to all the due date inputs.
    duckburg.utils.addHighsmithCalendars(ids, false);
  },

  /**
   * Render an order item into the list of orders.
   * @function creates an item within the list of orders.
   * @param order Object the order object, originating from Parse.
   * @param index Int index within list so we can tell if it is even/odd
   *
   */
  renderSingleOrderToList: function(order, index) {

    // Easy order detail alias.
    var o = order.attributes;

    // Get holder class.
    var orderHolderClass = index % 2 == 0 ?
        'orderHolderDiv even' : 'orderHolderDiv odd';

    // Order summary details.
    var summary = o.order_summary || '{}';
    summary = JSON.parse(summary);

    var piecesLabel = summary.total_pieces == 1 ? 'item' : 'items';
    var pieces = summary.total_pieces || 0;
    var piecesDesc = pieces + ' ' + piecesLabel;

    // Cost details
    var total = summary.final_total || '0.00';
    var balance = summary.balance || '0.00';
    var payButtonClass = total == '0.00' ?
        'orderPaymentButton disabled' : 'orderPaymentButton';

    // Order status details.
    var bgColor = duckburg.utils.orderStatusMap[o.order_status];

    // Link to order
    var orderLink = duckburg.baseUrl + '/order/' + o.readable_id;

    // Format due date.
    var due_date = duckburg.utils.formatDate(o.due_date);

    // Get customer details.
    var custName = o.cust_name == '' ? '<em>no customer</em>' : o.cust_name;
    var custPhone = o.cust_phone == '' ? '<em>no phone</em>' : o.cust_phone;

    // Get updated time.
    var updated = 'updated: ' + String(order.updatedAt).split('GMT')[0];

    var imgLabel = $('<label>')
      .attr('class', 'imgIconLabel');


    // Append order details
    $('.orderList')

      // Append main holder div.
      .append($('<div>')
        .attr('class', orderHolderClass)

        // Append top span.
        .append($('<span>')
          .attr('class', 'orderTopSpan')

          // Order number
          .append($('<label>')
            .attr('class', 'orderNumberLabel')
            .html(o.readable_id))

          // Order date
          .append($('<input>')
            .attr('type', 'text')
            .attr('id', 'cal_' + order.id)
            .attr('name', order.id)
            .attr('class', 'dueDateInput')
            .val(due_date)
            .click(function(e) {
              var orderId = $(e.currentTarget).attr('name');
              var order = duckburg.orderList.viewingOrders[orderId]
              duckburg.orderList.updateOrderDateForOrder = order;

              // After a breif wait, set a function to update the due date
              // after any document click.
              setTimeout(function() {
                $(document).bind('click', duckburg.orderList.updateDueDate);
              }, 200);

            }))

          // Order name
          .append($('<a>')
            .attr('class', 'orderNameLabel')
            .attr('href', orderLink)
            .attr('id', o.readable_id)
            .html(o.order_name))

          // Total pieces
          .append($('<label>')
            .attr('class', 'totalPiecesLabel')
            .html(piecesDesc))

          // Images
          .append(imgLabel)

          // Order status
          .append($('<label>')
            .attr('class', 'orderStatusLabel')
            .attr('id', 'order_status_' + order.id)
            .attr('name', order.id)
            .css({'background': bgColor})
            .html(o.order_status)
            .click(function(e) {
              duckburg.orderList.launchStatusUpdater(e);
            }))
        )

        // Append bottom span.
        .append($('<span>')
          .attr('class', 'orderBottomSpan')

          // Customer details.
          .append($('<label>')
            .attr('class', 'custNameLabel')
            .html(custName))
          .append($('<label>')
            .attr('class', 'custPhoneLabel')
            .html(custPhone))

          // Payment details.
          .append($('<label>')
            .attr('class', 'orderTotalLabel')
            .html('total: $' + total))
          .append($('<label>')
            .attr('class', 'orderBalanceLabel')
            .html('balance: $' + balance))
          .append($('<label>')
            .attr('class', payButtonClass)
            .attr('id', order.id)
            .html('<i class="fa fa-money"></i>')
            .click(function(e) {
              var id = e.currentTarget.id;
              var order = duckburg.orderList.viewingOrders[id];
              duckburg.utils.paymentModule(order);
            }))
           .append($('<label>')
            .attr('class', 'invoiceIconLabel')
            .attr('id', order.id)
            .html('<i class="fa fa-file-text"></i>')
            .click(function(e) {
              var id = e.currentTarget.id;
              var order = duckburg.orderList.viewingOrders[id];
              var orderId = order.attributes.readable_id;
              window.open('/invoice/' + orderId, '_blank');
            }))
          .append($('<label>')
            .attr('class', 'updatedAtLabel')
            .html(updated))
        )
    );

    // Set image icons for each order.
    duckburg.orderList.appendImageIconsToOrderItem(imgLabel, o);
  },

  /**
   * Set image icons for each order
   * @function in the order list, show an icon for each of an order's items.
   * @param imgLabel Object dom element to append icons to.
   * @param o Object order attributes object.
   */
  appendImageIconsToOrderItem: function(imgLabel, o) {

    // Get the list of images for the job and display icons for each.
    var items = o.items || '{}';
    items = JSON.parse(items);

    // Keep track of image count
    var imgCount = 0;

    // Iterate over all items and grab the imags.
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var imgs = item.design_images_list.split(',');
      for (var j = 0; j < imgs.length; j++) {
        var img = String(imgs[j]);
        if (img != '') {

          // Keep track of images.
          imgCount++;

          imgLabel
            .append($('<i>')
              .attr('id', img)
              .attr('class', 'fa fa-picture-o')
              .click(function(e) {

                // Show the image to the user on click.
                var img = e.currentTarget.id;
                duckburg.utils.revealImageViewerWithImage(img);
              }));
        }
      }
    }

    // If there are no images, display a message.
    if (imgCount == 0) {
      imgLabel.html('no images');
    }
  },

  /**
   * Allow for the updating of a status of an order.
   * @function launches a dropdown to the let the user select order status.
   * @param e Object click event from current status div.
   *
   */
  launchStatusUpdater: function(e) {

    // Remove any other selectors/dropdowns.
    $('.orderListStatusSelector').each(function() {
      $(this).remove();
    });

    // Get order id.
    var orderId = $(e.currentTarget).attr('name');

    // Set a listener for an offclick event.
    setTimeout(function() {
      $(document).bind('click', duckburg.orderList.removeStatusUpdater);
    }, 200);

    // Get location of mouse click.
    var pos = $(e.currentTarget).position();
    var x = (pos.left + 12) + 'px';
    var y = (pos.top + 24) + 'px';

    // Set CSS styles for div.
    var css = {
      'position': 'absolute',
      'left': x,
      'top': y
    };

    // Create, style and append the div.
    var div = $('<div>')
      .css(css)
      .attr('class', 'orderListStatusSelector');
    $(document.body).append(div);

    // Add a label for each available order status.
    for (var status in duckburg.utils.orderStatusMap) {

      // Order status details.
      var bgColor = duckburg.utils.orderStatusMap[status];

      $('.orderListStatusSelector')
        .append($('<label>')
          .html(status)
          .attr('id', orderId)
          .css({'background': bgColor})

          .click(function(e) {
            // Get order id and new status.
            var id = e.currentTarget.id;
            var status = e.currentTarget.innerHTML;
            duckburg.orderList.setNewOrderStatus(id, status);
          }));
    }
  },

  /**
   * Set a new order status for an order.
   * @function updates the status of an order in the ui and database.
   * @param id String parse id of order to update.
   * @param status String new status of order
   *
   */
  setNewOrderStatus: function(id, status) {
    // Order status details.
    var bgColor = duckburg.utils.orderStatusMap[status];

    // Update order status in the div.
    $('#order_status_' + id)
      .html(status)
      .css({'background': bgColor});

    // Remove any other selectors
    $('.orderListStatusSelector').each(function() {
      $(this).remove();
    });

    // Get the order in question and update its status in the database.
    duckburg.orderList.viewingOrders[id].set('order_status', status);
    duckburg.orderList.viewingOrders[id].save()
      .then(function(response) {
        // do nothing
      },

      function(error) {
        var msg = 'Error saving order: ' + error.message;
        duckburg.order.orderSavingStatus('error');
      });
  },

  /**
   * Helps remove the status updater div.
   * @function when status updater dropdown is showing, this listener function
   *           waits for an offclick and removes the order status dropdown.
   *
   */
  removeStatusUpdater: function() {

    // Remove any other selectors
    $('.orderListStatusSelector').each(function() {
      $(this).remove();
    });

    // Remove the listener.
    $(document).unbind('click', duckburg.orderList.removeStatusUpdater);
  },

  /**
   * Update a due date for an order.
   * @function updates the due date on a given order.
   *
   */
  updateDueDate: function() {

    // If calendar is still visible, do nothing.  User is clicking through
    // months, years, etc.
    if ($('.highsmithCal').length > 0) {
      return false;
    }

    // If an order has been held in memory;
    if (duckburg.orderList.updateOrderDateForOrder) {

      // Get the order id, new date, and update it.
      var id = duckburg.orderList.updateOrderDateForOrder.id;
      var prevDate = duckburg.utils.formatDate(
        duckburg.orderList.updateOrderDateForOrder.attributes.due_date);
      var date = $('#cal_' + id).val();

      // If date has actually been changed, update it in the db.
      if (date != prevDate) {
        date = new Date(date);

        var printDate =
          duckburg.orderList.updateOrderDateForOrder.attributes.print_date;
        if (!printDate || printDate == '') {
          duckburg.orderList.updateOrderDateForOrder.set('print_date', date);
        }

        duckburg.orderList.updateOrderDateForOrder.set('due_date', date);
        duckburg.orderList.updateOrderDateForOrder.save()
          .then(function(response) {

            // Load the list again.
            duckburg.orderList.loadWithGlobals();
          },

          function(error) {
            var msg = 'Error saving order: ' + error.message;
            duckburg.order.orderSavingStatus('error');
          });
      }
    }

    // Clear the memory and the listener.
    duckburg.orderList.updateOrderDateForOrder = false;
    $(document).unbind('click', duckburg.orderList.updateDueDate);
  },

  /**
   * Load the list with any memorized globals.
   * @function loads the list of orders with any memorized parameters.
   *
   */
  loadWithGlobals: function() {

    // Get sort info from memory and load orders.
    var sortParam = duckburg.orderList.curSortParam;
    var sortDir = duckburg.orderList.curSortDirection;
    var filter = duckburg.orderList.curSortFilters;
    var statuses = duckburg.orderList.curSortStatuses;
    duckburg.orderList.load(statuses, sortParam, sortDir, filter);
  },

  /**
   * Update the total and balance on an order.
   * @function when a payment is made within the order list, the balance
   *           remains the same.  This function does the calculations, updates
   *           the order and reloads the current list of orders.
   * @param orderId String parse id for the order
   * @param amount Float amount of payment (can be negative)
   *
   */
  updateOrderTotals: function(orderId, amount) {

    // Get the order and its summary object.
    var order = duckburg.orderList.viewingOrders[orderId];
    var summary = JSON.parse(order.attributes.order_summary);

    // Calculate the new balance.  Can be negative if a payment is being
    // reversed.
    summary.balance =
        (parseFloat(summary.balance) - parseFloat(amount)).toFixed(2);

    // String the order summary and save it to the object.
    summary = JSON.stringify(summary);
    duckburg.orderList.viewingOrders[orderId].set('order_summary', summary);
    duckburg.orderList.viewingOrders[orderId].save()
      .then(function(response) {

        // Load the list again.
        duckburg.orderList.loadWithGlobals();
      },

      function(error) {
        var msg = 'Error loggin payment: ' + error.message;
        duckburg.order.orderSavingStatus('error');
      });
  },

  /**
   * Create the filter elements
   * @function creates all the elements that allow for filtering.
   *
   */
   createFilterElements: function() {

     // Clear the filter holder.
     $('.orderListFilters')
       .html('')

       // Header
       .append($('<h1>')
         .html('filter orders'))

       // Search bar
       .append($('<input>')
         .attr('class', 'filterByName')
         .attr('placeholder', 'order search')
         .attr('id', 'order_filter_search')
         .keyup(function(e) {
           duckburg.orderList.filterOrdersBySearch(e);
         }))

       // Status filters
       .append($('<span>')
         .attr('class', 'statusFilterHolder')

         .append($('<label>')
           .attr('class', 'filterHeader')
           .html('filter by status')
           .click(function() {

             var statuses = [];
             for (var status in duckburg.utils.orderStatusMap) {
               statuses.push(status);
             }

             // Get/set sort globals.
             var sortParam = duckburg.orderList.curSortParam;
             var sortDir = duckburg.orderList.curSortDirection;
             var filter = duckburg.orderList.curSortFilters;
             duckburg.orderList.load(statuses, sortParam, sortDir, filter);

           }))
         .append($('<span>')
           .attr('class', 'statusFilterList'))
       );

       // Fill the status list with all order statuses.
       for (var status in duckburg.utils.orderStatusMap) {
          $('.statusFilterList')
            .append($('<label>')
              .append($('<span>')
                .html(status))
              .append($('<input>')
                .attr('type', 'checkbox')
                .attr('class', 'statusFilterCheckbox')
                .attr('id', 'status_filter_' + status)
                .attr('name', status)
                .click(function() {

                  // Supress the event if it was fired by clicking on a
                  // label that sorts 'only' by one status.
                  if (duckburg.orderList.filteringOnOnly) {
                    duckburg.orderList.filteringOnOnly = false;
                    return false;
                  }

                  // Update status filters.
                  var statuses = [];
                  $('.statusFilterCheckbox').each(function() {
                    if (this.checked) {
                      statuses.push($(this).attr('name'));
                    }
                  });

                  // Get sort info from memory and load orders.
                  var sortParam = duckburg.orderList.curSortParam;
                  var sortDir = duckburg.orderList.curSortDirection;
                  var filter = duckburg.orderList.curSortFilters;
                  duckburg.orderList.load(statuses, sortParam, sortDir, filter);
                }))
              .append($('<em>')
                .attr('id', status)
                .html('only')
                .click(function(e) {

                  // Note that we're filtering by only one status.
                  duckburg.orderList.filteringOnOnly = true;

                  var status = e.currentTarget.id;

                  // Get/set sort globals.
                  var sortParam = duckburg.orderList.curSortParam;
                  var sortDir = duckburg.orderList.curSortDirection;
                  var filter = duckburg.orderList.curSortFilters;
                  duckburg.orderList.load([status], sortParam, sortDir, filter);
                }))
            );
       }

   },

   /**
    * Filter the list of orders from a search.
    * @function allows users to change visible orders with a search.
    * @param even Object keyup event of search input
    *
    */
   filterOrdersBySearch: function(event) {

     // Clear search timer if present.
     if (duckburg.orderList.filterSearchTimer) {
       window.clearInterval(duckburg.orderList.filterSearchTimer);
     }

     duckburg.orderList.filterSearchTimer = setTimeout(function() {
       var term = event.currentTarget.value.toLowerCase();

       var statuses = duckburg.orderList.curSortStatuses;
       var sortParam = duckburg.orderList.curSortParam;
       var sortDir = duckburg.orderList.curSortDirection;

       duckburg.orderList.load(statuses, sortParam, sortDir, term);
     }, 350);
   }
};
