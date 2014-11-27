// Global duckburg namespace.
var duckburg = duckburg || {};


/**
 * Order list view
 * @module the order list is the main view in duckburg.
 *
 */
duckburg.orderList = {

  /**
   * Load the view
   * @function load the order list view.
   * @param statuses Array of order statuses to show
   * @param sortParam String parameter to sort
   * @param sortDirection String direction to sort by
   *
   */
  load: function(statuses, sortParam, sortDirection, filters) {

    // Set the variables if they haven't been passed.
    statuses = statuses || duckburg.utils.defaultSortStatuses;
    sortParam = sortParam || duckburg.utils.defaultSortParam;
    sortDirection = sortDirection || duckburg.utils.defaultSortDirection;

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

      // Capture id so that calendar can be assigned.
      ids.push('cal_' + orders[i].id);

      // Render order to list.
      duckburg.orderList.renderSingleOrderToList(order);
    }

    // Attach highsmith calendars to all the due date inputs.
    duckburg.utils.addHighsmithCalendars(ids);
  },

  /**
   * Render an order item into the list of orders.
   * @function creates an item within the list of orders.
   * @param order Object the order object, originating from Parse.
   *
   */
  renderSingleOrderToList: function(order) {

    // Define the parent
    var parent = $('.orderList');

    // Create a holder span for the order details
    var holderDiv = $('<div>')
      .attr('class', 'orderHolderDiv');

    // Create a top span for the order
    var topSpan = $('<span>')
      .attr('class', 'orderTopInnerSpan');

    // Create a bottom span for the order
    var bottomSpan = $('<span>')
      .attr('class', 'orderBottomInnerSpan');

    // Populate the top order span with details about the order
    duckburg.orderList.populateTopOrderSpan(order, topSpan);

    // Populate the bottom order span with some actions, etc.
    duckburg.orderList.populateBottomOrderSpan(order, bottomSpan);

    // Append the spans to the holder div.
    holderDiv
      .append(topSpan)
      .append(bottomSpan)

    // Append the div containing order details to the list.
    parent
      .append(holderDiv);

  },

  /**
   * Populate an order span
   * @function given an order object and an empty span, fill it with details
   *           about the order, such as order number, due date, name, etc.
   * @param order Object order object from Parse
   * @param span Object dom element to append to.
   *
   */
  populateTopOrderSpan: function(order, span) {

    // Easy to access alias for attributes.
    var o = order.attributes;

    // Readable ID label
    span
      .append($('<label>')
        .html(o.readable_id)
        .attr('class', 'readableIdLabel'));

    // Due date input.
    span
      .append($('<input>')
        .attr('type', 'text')
        .attr('id', 'cal_' + order.id)
        .html('placeholder', 'due date')
        .attr('class', 'dueDateInput')
        .val(o.due_date));

    // Order name input
    span
      .append($('<a>')
        .html(o.order_name)
        .attr('href', duckburg.utils.orderPage + o.readable_id)
        .attr('class', 'orderListOrderNameLabel'));

    // Customer name label
    span
      .append($('<label>')
        .html(o.cust_name)
        .attr('class', 'orderListCustomerName'));

    // Customer phone label
    span
      .append($('<label>')
        .html(o.phone_number)
        .attr('class', 'orderListCustomerPhone'));

    // Order status label
    var bgColor = 'rgba(0,0,0,0.1)';
    if (duckburg.utils.orderStatusMap[o.order_status]) {
      bgColor = duckburg.utils.orderStatusMap[o.order_status];
    }

    span
      .append($('<label>')
        .html(o.order_status)
        .attr('class', 'orderStatusLabel')
        .css({'background': bgColor}));
  },

  /**
   * Populate an order span
   * @function given an order object and an empty span, fill it with actions
   *           such as viewing issues with order, viewing the order, etc
   * @param order Object order object from Parse
   * @param span Object dom element to append to.
   *
   */
  populateBottomOrderSpan: function(order, span) {

    // Easy to access alias for attributes.
    var o = order.attributes;

    // Calculate total designs and items.
    var items = o.items ? JSON.parse(o.items) : [];
    var totalItems = 0;
    var totalDesigns = items.length;

    var innerLabel = $('<label>')
      .attr('class', 'bottomSpanInnerLabel');

    // Add up the total items.
    for (var i = 0; i < items.length; i++) {
      var designItems = items[i];
      if (designItems.sizes) {
        var sizes = JSON.parse(designItems.sizes);
        for (var size in sizes) {
          totalItems += parseInt(sizes[size]);
        }
      }
    }

    // Total designs label.
    var totalDesignsLabel = totalDesigns == 1 ? ' design' : ' designs';
    innerLabel
      .append($('<label>')
        .html(totalDesigns + totalDesignsLabel)
        .attr('class', 'totalDesignsLabel'));

    // // Total items label.
    // var totalItemsLabel = totalItems == 1 ? ' item' : ' items';
    // innerLabel
    //   .append($('<label>')
    //     .html(totalItems + totalItemsLabel)
    //     .attr('class', 'totalItemsLabel'));


    var bgColor = 'rgba(0,0,0,0.1)';
    if (duckburg.utils.orderStatusMap[o.order_status]) {
      bgColor = duckburg.utils.orderStatusMap[o.order_status];
    }
    bgColor = bgColor.replace('1.0', '0.5');
    innerLabel
      .css({'background': bgColor});

    span.append(innerLabel);
  }
};
