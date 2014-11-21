// DuckBurg namespace.
var duckburg = duckburg || {};

/**
 * MAIN PAGE
 *
 * The duckburg main page is the order list we've grown accustomed to.
 *
 */
duckburg.main = {

  // Default order search parameters.
  defaultStatuses: ['open', 'approved', 'ordered', 'received'],
  defaultSortParameter: 'due_date',
  defaultSortOrder: 'dsc',

  // Default headings for order list.
  headingElements: ['due date', 'order name', 'customer', 'phone',
      'total items', 'status'],

  launch: function() {

    // Check if an order form is open.
    if (duckburg.orders.activeOrderExists) {
      var msg = 'An order is being edited.  Please save it first.';
      duckburg.errorMessage(msg);
      $('.objectMenu').hide();
      return false;
    }

    // Clear out the wrapper.
    $('.wrapper-content').html('');
    $('.objectMenu').hide();

    // Reset url bar.
    window.history.replaceState('Object', 'Title', '/');

    // Load the default set of orders.
    duckburg.main.loadOrders();
  },

  // Load a list of orders.
  loadOrders: function(statuses, sortBy, sortOrder) {
    statuses = statuses || duckburg.main.defaultStatuses;
    sortBy = sortBy || duckburg.main.defaultSortParameter;
    sortOrder = sortOrder || duckburg.main.defaultSortOrder;

    duckburg.requests.fetchOrders(statuses, sortBy, sortOrder, false,
      function(orders) {
        duckburg.main.loadOrdersToScreen(orders);
      });
  },

  // Beginning of the process of loading an order to the screen.
  loadOrdersToScreen: function(orders) {

    // Set a header element.
    duckburg.main.setHeader();

    // Create holder for orders.
    $('.wrapper-content')
      .append($('<div>')
        .attr('class', 'orderListHolder'));

    // Show the orders.
    for (var i = 0; i < orders.length; i++) {
      duckburg.main.startRenderingOrderListItem(orders[i]);
    }
  },

  // Set a header for the list of orders.
  setHeader: function() {

    $('.wrapper-content')
      .html('')
      .append($('<div>')
        .attr('class', 'orderViewHeader'));

    for (var el in duckburg.main.headingElements) {
      var heading = duckburg.main.headingElements[el];

      $('.orderViewHeader')
        .append($('<span>')
          .html(heading));

    }
  },

  // Begin the process of rending a single order's div in the list.
  startRenderingOrderListItem: function(order) {
    var o = order.attributes;

    // For displaying number of items.
    var items = JSON.parse(o.items);
    items.length = items.length || 0;
    var designCountLabel = items.length == 1 ? ' design' : ' designs';

    // Total number of items.
    var totalItems = 0;
    for (var i = 0; i < items.length; i++) {
      var catItem = items[i];
      var sizes = JSON.parse(catItem.sizes);

      for (var size in sizes) {
        totalItems += parseInt(sizes[size]);
      }
    }

    var customer = JSON.parse(o.primary_customer);
    var name = customer.name || '<em>(no name)</em>';
    var phone = customer.phone || '<em>(no phone)</em>';

    // Outer holder for the order.
    var div = $('<div>')
      .attr('class', 'orderListOuterHolder')
      .attr('id', o.readable_id)
      .click(function(e) {
        duckburg.orders.launchForm(e.currentTarget.id);
      });

    // Inner holder for the order.
    var span = $('<span>')
      .attr('class', 'orderListInnerHolder')

      // Due date label.
      .append($('<label>')
        .html(o.due_date))

      // Order name label.
      .append($('<label>')
        .attr('class', 'orderListOrdeName')
        .html(o.order_name))

      // Customer name label.
      .append($('<label>')
        .html(name))

      // Customer phone label.
      .append($('<label>')
        .html(phone))

      // Number of products we're printing on.
      .append($('<label>')
        .html(totalItems + ' items'))

      // Order status
      .append($('<label>')
        .attr('class', 'orderListOrderStatus')
        .html(o.order_status))

    // Wrap up.
    div.append(span);
    $('.wrapper-content').append(div);

  }



};
