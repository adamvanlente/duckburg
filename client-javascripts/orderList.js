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

    // Iterate over the orders.
    for (var i = 0; i < orders.length; i++) {
      var order = orders[i];
      duckburg.orderList.renderSingleOrderToList(order);
    }

    // Attach highsmith calendars to all the due date inputs.
    duckburg.orderList.attachHighsmithCals(orders);
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
      .append($('<label>')
        .html(o.order_name)
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


    // items: "[]"
    // order_name: "New years shirts"
    // order_status: "approved"
    // parse_search_string: "New years shirts"
    // phone_number: "911"
    // print_date: ""
    // readable_id: "000002"

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

    // Go to order button
    span
      .append($('<label>')
        .html('<i class="fa fa-arrow-circle-right"></i>')
        .attr('class', 'goToOrderButton'));

  },

  /**
   * Attach onclick events to all date inputs
   * @function once orders are rendered, attach a Highsmith calendar to every
   *           due date input that is found.
   * @param orders Array list of orders.
   *
   */
  attachHighsmithCals: function(orders) {

    // Config for calendars.
    var calConfig = {
      style: {
        disable: true
      },
      killButton: true
    };

    for (var i = 0; i < orders.length; i++) {
      var id = 'cal_' + orders[i].id;
      var cal = new Highsmith(id, calConfig);
    }
  }


};
