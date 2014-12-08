// Global duckburg namespace.
var duckburg = duckburg || {};

/**
 * @module creates and populates and invoice
 *
 */
duckburg.invoice = {

  /** Hold the customer objects to avoid multiple requests. **/
  customers: {},

  /**
   * Load an invoice.
   * @function called when a request to an invoice url is made.
   *
   */
  load: function() {

    // Set the header of the invoice.
    $('.invoice')
      .append($('<h1>')
        .html('RetroDuck Invoice'));

    // Get the order id.
    var path = window.location.pathname;
    var orderId = path.split('/')[2];

    // Load the order.
    duckburg.requests.fetchOrderById(orderId, function(results) {

      if (!results || results.length == 0) {
        $('.invoice')
          .append($('<span>')
            .attr('class', 'errorLoadingInvoice')
            .html('order not found: ' + orderId));
      } else {

        var order = results[0].attributes;
        duckburg.invoice.populateInvoiceWithOrderDetails(order);
      }


    });
  },

  /**
   * Populate an order with details.
   * @function takes order details and fills in the invoice.
   * @param details Object order details
   *
   */
   populateInvoiceWithOrderDetails: function(details) {

     // Show the order name
     $('.invoice')
       .append($('<h2>')
         .html(details.order_name));

     // Show the order number.
     $('.invoice')
       .append($('<h3>')
        .html('invoice for order No. ' + details.readable_id));

     // Add areas for shipping and billing customers.
     duckburg.invoice.customers(details.customers);

     // Add areas for item details.
     duckburg.invoice.items(details);

     // Populate summary details.
     duckburg.invoice.summary(details);

   },

   /**
    * Load the customer information.
    * @function takes customer details and displays a shipping/billing customer.
    * @param customers String stringed json object with customer info.
    *
    */
   customers: function(customers) {

      // Set up the divs.
      $('.invoice')
        .append($('<div>')
          .attr('class', 'invoiceCustomerHolder')
          .append($('<div>')
            .attr('class', 'shippingCustomer'))
          .append($('<div>')
            .attr('class', 'billingCustomer'))
        );

      // Get the customer info.
      customers = JSON.parse(customers);

      for (var i = 0; i < customers.length; i++) {
        var customer = customers[i];

        // Populate shipping details.
        if (customer.isShip) {
          duckburg.invoice.populateCustomerDetails(customer.id, 'shipping');
        }

        // Populate billing details
        if (customer.isBill) {
          duckburg.invoice.populateCustomerDetails(customer.id, 'billing');
        }
      }
   },

   /**
    * Populate shipping/billing details
    * @function given a customer id, populate the customer information.
    * @param custId String parse id for customer.
    * @param type String either billing or shipping
    *
    */
    populateCustomerDetails: function(custId, type) {

      if (duckburg.invoice.customers[custId]) {

        var div = $('.' + type + 'Customer');
        div.append($('<h1>')
          .html(type + ' customer'));

        var cust = duckburg.invoice.customers[custId].attributes;

        if (cust.first_name) {
          div.append($('<label>')
            .html(cust.first_name + ' ' + cust.last_name));
        }

        if (cust.address_one) {

          div.append($('<label>')
            .html(cust.address_one));

            if (cust.address_two) {
              div.append($('<label>')
                .html(cust.address_two));
            }

            if (cust.address_city || cust.address_state || cust.address_zip) {
              div.append($('<label>')
                .html(cust.address_city + ', ' + cust.address_state + ' ' +
                      cust.address_zip));
            }
        }

        if (cust.email_address) {
          div.append($('<label>')
            .html(cust.email_address + '<i class="fa fa-envelope"></i>'));
        }

        if (cust.phone_number) {
          div.append($('<label>')
            .html(cust.phone_number + '<i class="fa fa-phone"></i>'));
        }

      } else {

        duckburg.requests.findById(custId, 'dbCustomer', function(customer) {
          duckburg.invoice.customers[customer.id] = customer;
          duckburg.invoice.populateCustomerDetails(customer.id, type);
        });

      }
    },

    /**
     * Add item details to the invoice.
     * @function given order details, renders sizing/pricing information to
     *           the order.
     * @param details Object order details
     *
     */
    items: function(details) {

      // Get the items.
      var items = details.items || '[]';
      items = JSON.parse(items);

      // Append an item holder.
      $('.invoice')
        .append($('<div>')
          .attr('class', 'itemListHolder'));

      // No items message.
      if (!items.length || items.length == 0) {
        $('.itemListHolder')
          .append($('<span>')
            .attr('class', 'noItemsMessage')
            .html('no items found for this order'))
      }

      // Render the design info.
      for (var i = 0; i < items.length; i++) {

        // Get design and span to append to.
        var d = items[i];
        var span = $('<span>')
          .attr('class', 'itemSpan');

        // Set the name.
        duckburg.invoice.setDesignName(d, span, i);

        // Set the style info.
        duckburg.invoice.setStyleInfo(d, span);

        // Set pricing info.
        duckburg.invoice.setDesignPricingInfo(d, span);

        // Set the sizing info.
        duckburg.invoice.setSizeInfo(d, span);

        // Append the span to the main list
        $('.itemListHolder').append(span);
      }
    },


    /** Set the design name in the invoice **/
    setDesignName: function(d, span, i) {
      var name = d.item_name || 'Design ' + (i + 1);
      span
        .append($('<label>')
          .attr('class', 'designNameLabel')
          .html(name));
    },

    /** Set item type and color (style info) **/
    setStyleInfo: function(d, span) {
      var styleInfo = '';

      if (d.product_type_visible) {
        styleInfo += d.product_type_visible + ' ';
      }

      if (d.product_colors) {
        styleInfo += d.product_colors;
      }

      if (styleInfo != '') {
        span
        .append($('<label>')
        .attr('class', 'designStyleInfoLabel')
        .html(styleInfo));
      }
    },

    /** Set the design's price info. **/
    setDesignPricingInfo: function(d, span) {
      span
        .append($('<label>')
          .attr('class', 'designPriceLabel')
          .html('Price each: $' + d.product_price));

      span
        .append($('<label>')
          .attr('class', 'designPriceLabel')
          .html('Total items: ' + d.total_items));

      span
        .append($('<label>')
          .attr('class', 'designPriceLabel')
          .html('<b>Total cost: $' + d.total_cost + '</b>'));
    },

    setSizeInfo: function(d, span) {
      var sizeSpan = $('<span>')
        .attr('class', 'sizeSpan');

      var sizes = d.sizes || {};

      for (var size in sizes) {
        var q = sizes[size];
        if (q && q != 0 && q != '') {
          sizeSpan.append($('<label>')
            .append($('<span>')
              .html(size))
            .append($('<em>')
              .html(q)));
        }
      }
      span.append(sizeSpan);
    },

    /** Summary details for the order. **/
    summary: function(details) {

      var s = JSON.parse(details.order_summary);

      $('.invoice')
        .append($('<div>')
          .attr('class', 'summaryDiv')

          .append($('<span>')
            .append($('<label>')
              .html('Total pieces'))
            .append($('<em>')
              .html(s.total_pieces))
          )

          .append($('<span>')
            .append($('<label>')
              .html('Order subtotal'))
            .append($('<em>')
              .html('$' + s.order_total))
          )

          .append($('<span>')
            .append($('<label>')
              .html('Tax collected'))
            .append($('<em>')
              .html('$' + s.tax_amount))
          )

          .append($('<span>')
            .attr('class', 'totalSpan')
            .append($('<label>')
              .html('Total'))
            .append($('<em>')
              .html('$' + s.final_total))
          )

          .append($('<span>')
            .append($('<label>')
              .html('Payments received'))
            .append($('<em>')
              .html('$' + s.payments))
          )

          .append($('<span>')
            .attr('class', 'balanceSpan')
            .append($('<label>')
              .html('Balance'))
            .append($('<em>')
              .html('$' + s.balance))
          )
      );

      if (s.balance == 0 || s.balance == '0.00') {
        if (s.final_total != 0 && s.finalTotal != '0.00') {
          $('.summaryDiv')
            .append($('<div>')
              .attr('class', 'paidNote')
              .html('PAID'));
         }
      }
    }
};
