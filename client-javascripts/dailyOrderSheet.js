// Global duckburg namespace.
var duckburg = duckburg || {};

/**
 * @module creates a daily order sheet to assist with ordering.
 *
 */
duckburg.dos = {

  /** List of orders with issues **/
  ordersWithIssues: {},

  /**
   * Load the daily order sheet.
   * @function loads the daily order sheet
   *
   */
  load: function() {

    // Index of orders returned.
    duckburg.dos.orderIndex = 0;

    // Main order list object.
    duckburg.dos.orderObject = {};

    duckburg.requests.findOrders(['ordered'], 'due_date', 'asc', false,
      function(results) {

        // Be sure there are results
        if (!results || results.length == 0) {
          $('.dailyOrderSheet')
            .html('')
            .append($('<span>')
              .attr('class', 'noOrdersFoundMessage')
              .html('nothing to order currently'));

          return;
        }

        // Set loading message
        $('.dailyOrderSheet')
          .html('')
          .append($('<span>')
            .attr('class', 'loadingMessage')
            .html('Loading order...'));

        // Add two divs to the main holder.
        $('.dailyOrderSheet')
          .append($('<div>')
            .attr('class', 'orderIssues'))
          .append($('<div>')
            .attr('class', 'orderInfo'));

        // Handle the results.
        duckburg.dos.orders = results;
        duckburg.dos.compileItems();
      });
  },

  /**
   * Start the process of compiling the order list.
   * @function takes an individual result and adds it to the order.
   *
   */
  compileItems: function() {

    // Get index and order.
    var i = duckburg.dos.orderIndex;

    // See if there is an order available, if so, get it.
    if (duckburg.dos.orders[i]) {
      var order = duckburg.dos.orders[i];
      var items = order.attributes.items || '{}';
      items = JSON.parse(items);

      duckburg.dos.handleItems(order, items);

      // After a brief pause, run again.
      setTimeout(function() {
        duckburg.dos.orderIndex++;
        duckburg.dos.compileItems();
      }, 1000);
    } else {

      // Load the order sheet.
      duckburg.dos.loadOrderDetails();
      $('.loadingMessage').remove();
    }
  },

  /**
   * Handle the items of an order.
   * @function adds items to an object to represent the order, or reports issue.
   * @param orderId Object parse order.
   * @param items Object object for items.
   *
   */
   handleItems: function(order, items) {

     for (var i = 0; i < items.length; i++) {
       // Get item and product id.
       var item = items[i];
       var product_type_id = item.product_type;

       // If it has a product id, we can get the supplier.  If we can't, report
       // an error for this order.
       if (product_type_id && product_type_id != '') {
         duckburg.dos.getSupplierAndInfo(order, item)
       } else {
         duckburg.dos.addErrorMessageNoProductType(order, item);
       }
     }
   },

   /**
    * Get supplier and proceed to add the item to the order list.
    * @function handles the adding of an item to the main order object.
    * @param order Object parse order.
    * @param item Object item for the order.
    *
    */
   getSupplierAndInfo: function(order, item) {

     // Get product id.
     var id = item.product_type;

     // Get the product object.
     duckburg.requests.findById(id, 'dbProduct', function(product) {

       // If product has supplier, get the item.
       if (product.attributes.supplier && product.attributes.supplier != '') {

         var si = product.attributes.supplier;
         duckburg.requests.findById(si, 'dbSupplier', function(supplier) {

           // Add supplier and sizes to order.
           duckburg.dos.addItemsToObject(order, item, product, supplier);
         });
       } else {

         // If no supplier, display an error.
         var msg = 'Items on this order have products without defined' +
             ' suppliers: <a href="' + '/order/' +
             order.attributes.readable_id + '">' +
             order.attributes.order_name + '</a>';
         duckburg.dos.insertErrorMessageWithText(msg, order.id);
       }
     });
   },

   /**
    * Add items from an order to the main order-sheet object.
    * @function takes all items details and adds to the object.
    * @param order Object parse order object
    * @param item Object item object
    * @param product Parse product object
    * @param supplier Parse supplier object
    *
    */
    addItemsToObject: function(order, item, product, supplier) {

      // Get the main variables.
      var supplierName = supplier.attributes.supplier_name;
      var itemId = (product.attributes.supplier_item_id + ' - ' +
          product.attributes.product_name).toLowerCase();
      var color = item.product_colors.toLowerCase();

      if (!color || color == '') {
        var msg = 'Item(s) on this order have no color information: <a href="' +
          '/order/' + order.attributes.readable_id + '">' +
          order.attributes.order_name + '</a>';
        duckburg.dos.insertErrorMessageWithText(msg, order.id);
        return;
      }

      // Add supplier if needed.
      if (!duckburg.dos.orderObject[supplierName]) {
        duckburg.dos.orderObject[supplierName] = {};
      }

      // Add item id if needed.
      if (!duckburg.dos.orderObject[supplierName][itemId]) {
        duckburg.dos.orderObject[supplierName][itemId] = {};
      }

      // Add color if needed.
      if (!duckburg.dos.orderObject[supplierName][itemId][color]) {
        duckburg.dos.orderObject[supplierName][itemId][color] = {};
      }

      var dbo = duckburg.dos.orderObject[supplierName][itemId][color];

      for (var size in item.sizes) {
        var quantity = item.sizes[size];
        size = size.toLowerCase();

        if (quantity && quantity != '' && quantity != 0) {
          if (dbo[size]) {
            dbo[size] += parseInt(quantity);
          } else {
            dbo[size] = parseInt(quantity);
          }
        }
      }
    },

   /**
    * Order have finished being collected, display the order form.
    * @function takes the order object and renders the order list.
    *
    */
   loadOrderDetails: function() {

     for (var supplier in duckburg.dos.orderObject) {

       // Add a div for each supplier.
       var supplierDiv = $('<div>')
         .attr('class', 'supplierDiv')
         .append($('<h1>')
           .html(supplier));

       // Get the products.
       var products = duckburg.dos.orderObject[supplier];
       for (var product in products) {

         // Add a header for each product number.
         var productHeader = supplierDiv.append($('<h2>').html(product));

         // Get the colors.
         var colors = products[product];
         for (var color in colors) {

           // Get the sizes.
           var colorSizesDiv = $('<div>')
              .attr('class', 'colorSizesSpan');

           // Append color name.
           colorSizesDiv.append($('<span>')
             .html(color)
             .attr('class', 'colorLabel'));

           // Get sizes.
           var sizes = colors[color];
           for (var size in sizes) {

             var quantity = sizes[size];

             // Append size details.
             colorSizesDiv.append($('<span>')
               .append($('<label>')
                 .html(size))
               .append($('<em>')
                 .attr('class', 'open')
                 .html(quantity)
                 .click(function(e) {
                   var className = e.currentTarget.className;
                   if (className == 'open') {
                     $(e.currentTarget).attr('class', 'closed');
                   } else {
                     $(e.currentTarget).attr('class', 'open');
                   }
                 }))
              );
           }

           // Append supplier div.
           supplierDiv.append(colorSizesDiv);
         }
       }
       $('.orderInfo').append(supplierDiv);
     }
   },

   /**
    * Handle an item with no product info.
    * @function when placing an order, we must be able to organize by supplier
    *           this function reports errors.
    * @param order Object parse order
    * @param item Object item with the issue
    *
    */
   addErrorMessageNoProductType: function(order, item) {

     var msg = 'Item(s) on this order have no product defined: <a href="' +
        '/order/' + order.attributes.readable_id + '">' +
        order.attributes.order_name + '</a>';
     duckburg.dos.insertErrorMessageWithText(msg, order.id);

   },

   /**
    * Helper function that inserts an error message.
    * @function add a span with error message to the main error div.
    * @param msg String message describing error.
    * @param orderId String order id.
    *
    */
   insertErrorMessageWithText: function(msg, orderId) {

      // If there are already warnings abou this order, abort.
      if (duckburg.dos.ordersWithIssues[orderId]) {
        return;
      }

      // Append an error span to the list of issues.
      $('.orderIssues')
        .append($('<span>')
          .append($('<i>')
            .attr('class', 'fa fa-exclamation-triangle'))
          .append($('<label>')
            .html(msg)));

      // Note that this order has issues.
      duckburg.dos.ordersWithIssues[orderId] = true;
   }
};
