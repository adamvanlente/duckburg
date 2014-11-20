// DuckBurg namespace.
var duckburg = duckburg || {};

/**
 * Fill Orders
 *
 * This script's purpose is to take a blank order form and populate
 * it with the details of an existing order.  Since this logic will be fairly
 * involved, this process has a dedicated script.
 *
 */
duckburg.fillOrder = {

  loadExistingOrder: function(orderId) {
    duckburg.requests.findOrder(orderId);
  },

  // Begin loading the order.
  begin: function(order) {

    var attributes = order.attributes;
    console.log(attributes)

    // Global functions for loading an order, whether new or existing.
    duckburg.orders.globalLoad();

    // Set the readable id.
    duckburg.orders.setReadableOrderNumber(attributes.readable_id);

    // Set the actual parse id.
    $('#parse_order_id').val(order.id);

    // Set the order status.
    duckburg.orders.setOrderStatus(attributes.order_status);

    // Set the due date.
    $('#order_due_date').val(attributes.due_date);

    // Set the print date.
    $('#order_print_date').val(attributes.print_date);

    // Set the customers.
    duckburg.fillOrder.loadCustomers(attributes.customers);

    // Set the items.
    duckburg.fillOrder.loadItems(attributes.items);

    // TODO set this last.  Until I set it, the order won't save and mess up
    //      what I'm working on.
    // Set the order name.
    // $('#order_job_name').val(attributes.order_name);
  },

  // Load the customers.
  loadCustomers: function(customers) {
    customers = JSON.parse(customers);
    console.log(customers);
  },

  // Load the items.
  loadItems: function(items) {
    items = JSON.parse(items);
    console.log(items);
  }

  // Save obj to this when found:
  // duckburg.orders.currentOrder
};
