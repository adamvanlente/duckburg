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

    // Save obj globally.
    duckburg.orders.currentOrder = order;
    var attributes = order.attributes;

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

    // Set the order name.
    $('#order_job_name').val(attributes.order_name);
  },

  // Load the customers.
  loadCustomers: function(customers) {

    // Convert customer string to JSON.
    customers = JSON.parse(customers);
    for (var customer in customers) {
      duckburg.fillOrder.fillInCustomer(customers[customer]);
    }
  },

  // Fill an individual customer into the order.
  fillInCustomer: function(customer) {

    // Fetch the customer from the database.
    duckburg.requests.findCustomer(customer,
      function(result, cust) {
        if (!duckburg.orders.currentlyVisibleCustomers[result.id]) {
          duckburg.orders.currentlyVisibleCustomers[result.id] =
              result.attributes;
        }
        duckburg.orders.addCustomerToOrder(result, cust.isShip, cust.isBill);
      });
  },

  // Load the items.
  loadItems: function(items) {

    // Convert items string to JSON.
    items = JSON.parse(items);

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      item.idx = i + 1;
      duckburg.requests.findCatalogItem(
          item, duckburg.fillOrder.fillInCatalogItem);

    }
  },


  fillInCatalogItem: function(result, item) {

    // Create the holder for the catalog item.
    duckburg.orders.addNewCatalogItemToOrderForm();

    // Proceed with filling out the form.
    var divElements = $('#design_no_' + item.idx).children();

    // Attributes of the design.
    var atrb = result.attributes;

    for (var i = 0; i < divElements.length; i++) {
      var el = divElements[i];
      duckburg.fillOrder.populateDesignItemElement(el, atrb, item, result.id);
    }

    // Populate the advanced settings field.
    duckburg.fillOrder.populateDesignItemAdvancedSettings(item.idx, atrb);

    // Fill in the design (images).
    duckburg.fillOrder.populateDesignImages(item.idx, atrb.design);

    // Load sizes.
    duckburg.fillOrder.populateSizes(item.idx, item.sizes);
  },

  // Populate the size fields.
  populateSizes: function(index, sizes) {
      sizes = JSON.parse(sizes);
      var parent = $('#catItemWithinOrderSizeOptions_' + index);
      duckburg.orders.addSizesToAnOrderItem(index, sizes, parent);
  },

  // Populate a particular field/set of fields in the catalog item.
  populateDesignItemElement: function(el, params, item, designId) {

    // Design name.
    if (el.className == 'designInFormDesignName') {
      el.value = params.item_name;
    }

    // Set parse order id.
    if (el.className == 'catalogItemId') {
      el.value = designId;
    }

    // Set product type
    if (el.className.search('designInFormProductName') != -1) {
      duckburg.fillOrder.setProductType(el, params.product_type);
    }

    // Set product color.
    if (el.className == 'designInFormProductColor') {
      el.value = params.product_colors;
    }

    // Set product price.
    if (el.className == 'designInFormPiecePrice') {
      el.value = params.product_price;
    }

    // Set product sale price.
    if (el.className == 'designInFormSalePrice') {
      el.value = params.product_saleprice;
    }

    // Set product social price.
    if (el.className == 'designInFormSocialPrice') {
      el.value = params.product_socialprice;
    }

    // Set product social price.
    if (el.className == 'designNotesWithinOrderForm') {
      el.value = params.product_description;
    }
  },

  // Populate the advanced settings.
  populateDesignItemAdvancedSettings: function(index, params) {
    var elements = $('#orderPertinentInfoHolder_' + index).children();
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];

      if (el.id == 'product_ishidden') {
        var element = $(el);
        element.val(params.product_ishidden);
        var next = element.next();
        next.val(params.product_ishidden);
      }

      if (el.id == 'product_store') {
        duckburg.fillOrder.setProductStore(el, params.product_store);
      }
    }
  },

  setProductStore: function(el, storeId) {

    if (!storeId || storeId == '') {
      return;
    }

    duckburg.requests.findStore(storeId,
      function(results, element) {

        var domElement = $(element);
        domElement.val(results.id);
        domElement.next().val(results.attributes.store_name);

      }, el);

  },

  populateDesignImages: function(index, designId) {

    if (!designId || designId == '') {
      return;
    }

    var obj = {
      currentTarget : {
        id: index
      }
    };

    duckburg.requests.quickFind('dbDesign',
      function(result) {
        duckburg.orders.appendImagePickerForOrderForm(obj, result);
      }, designId);
  },

  // Set a product type within a catalog item.
  setProductType: function(el, productId) {

    if (!productId || productId == '') {
      return;
    }

    duckburg.requests.findProduct(productId,
      function(result, element) {
        var name = result.attributes.product_name;
        var input = $(element);
        input.val(name);
        input.next().val(result.id);

        // TODO here, there is so much more we can do with the product.
        //      for example a popup with the order info, a quick link
        //      to the supplier stock page, etc.  ESPECIALLY since right now
        //      we make a request for one string.  If we're not taking
        //      advantage of all that object has to offer, its sill.

      }, el);
  }
};
