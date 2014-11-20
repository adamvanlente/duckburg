// DuckBurg namespace.
var duckburg = duckburg || {};

/**
 * Duckburg Orders
 *
 * Though orders are just composite  DuckBurg objects, they require extra
 * logic and will be handled as separate concepts.  This script handles two
 * methods of creating an order:
 *
 *    1. Creating an order from a form.  Users/employees will have a form
 *       that they can easily edit to put together/edit an order.
 *
 *    2. A simple API that the front end will use to create an order that
 *       a customer has placed online.
 *
 */
 duckburg.orders = {

   // Launch the form and set some global variables.
   launchForm: function(orderId) {

     // A mode that helps us run certain functions only when orders are up.
     duckburg.orders.orderMode = true;

     // Standard sizes for new order items.  Easily edited by users.
     duckburg.orders.standardSizes = {
       'XS': 0,
       'S': 0,
       'M': 0,
       'L': 0,
       'XL': 0,
       '2X': 0
     };

     // Order statuses.
     duckburg.orders.statuses = {

       'quote': 'rgb(184, 184, 184)',
       'open': 'rgb(130, 153, 200)',
       'approved': '#66c08d',
       'ordered': 'rgb(195, 202, 87)',
       'received': 'rgb(231, 165, 46)',
       'printing': 'rgb(239, 116, 116)',
       'completed': 'rgb(54, 179, 202)',
      //  'shipped'
     };

     // The order in which sizes should be displayed.  Sizes not inlcuded
     // in this list will be displayed at the end of the list.
     duckburg.orders.orderOfSizes = ['1T', '2T', '3T', '4T', 'YXXS', 'YXS',
        'YS', 'YM', 'YL', 'YXL', 'YXXL', 'XXXS', 'XXS', 'XS', 'S', 'M', 'L',
        'XL', '2XL', '2X', 'XXL', '3XL', '3X', 'XXXL', '4XL', '4X', 'XXXXL',
        '5XL', '5X', 'XXXXXL', '6X', '6XL', 'XXXXXXL'];

     // Interval by which a form is saved if typing is occurring.
     duckburg.orders.saveInterval = 2500;

     // If orderId is passed, populate the form with the order details.
     if (orderId) {

       duckburg.fillOrder.loadExistingOrder(orderId);

     } else {

       // Global functions for loading an order, whether new or existing.
       duckburg.orders.globalLoad();

       // Set a readable order number.
       duckburg.orders.setOrderNumber();

       // Set an initial order status
       duckburg.orders.setOrderStatus();
     }
   },

   // Load an order that is new or existing.
   globalLoad: function() {

     // Set the basic holders for the form elements.
     duckburg.orders.setInitialFormElements();

     // Set a header that will include the due date, job name and order number.
     duckburg.orders.setInitialInfo();

     // Set area for adding customers.
     duckburg.orders.setCustomerInfo();

     // Set area for adding designs.
     duckburg.orders.setDesignInfo();

   },

   // Set a header: due date, order number and name.
   setInitialInfo: function() {

     var parent = $('.orderDueDateAndName');

     // Get an incrememnted, readble order number for the order.
     parent
       .append($('<span>')
         .attr('class', 'orderFormOrderNumber'))
       .append($('<input>')
         .attr('type', 'hidden')
         .attr('id', 'parse_order_id'))
       .append($('<input>')
         .attr('type', 'hidden')
         .attr('id', 'readable_order_id'));

     // Set a due date field.
     parent.append($('<label>')
       .html('Due:'));
     parent.append($('<input>')
       .attr('type', 'text')
       .attr('name', 'order_form_field')
       .attr('class', 'orderDueDate')
       .attr('placeholder', 'due date')
       .attr('id', 'order_due_date'));

     // Basic settings for the highsmith calendar.
     var calConfig = {
       style: {
         disable: true
       },
       killButton: true
     };
     var dueCal = new Highsmith('order_due_date', calConfig);

     // Set a print date field.
     parent.append($('<label>')
       .html('Print:'));
     parent.append($('<input>')
       .attr('type', 'text')
       .attr('name', 'order_form_field')
       .attr('class', 'orderDueDate')
       .attr('placeholder', 'print date')
       .attr('id', 'order_print_date'));
     var cal = new Highsmith('order_print_date', calConfig);

     // Set a due date field.
     parent.append($('<input>')
       .attr('type', 'text')
       .attr('name', 'order_form_field')
       .attr('class', 'orderJobName')
       .attr('placeholder', 'Enter job name here')
       .attr('id', 'order_job_name'));

    // Set a due date field.
    parent.append($('<em>')
      .attr('type', 'text')
      .attr('name', 'order_form_field')
      .attr('class', 'jobStatusField')
      .attr('id', 'order_job_name')
      .click(function() {
        duckburg.orders.showOrderStatusSelector();
      }));

   },

   // Set an order status.
   setOrderStatus: function(status) {

     status = status || 'open';
     status = status.toLowerCase();
     var bgColor = duckburg.orders.statuses[status];

     $('.jobStatusField')
       .css({'background': bgColor })
       .html(status);
   },

   // Show a selector for order statuses.
   showOrderStatusSelector: function() {

     // Get current status.
     var currentStatus = $('.jobStatusField').html();

     // Offclicker element
     $('.offClicker')
       .show()
       .click(function() {
         $('.offClicker').hide();
         $('.orderStatusPopup').hide();
       });

     // Popup with order statuses.
     $('.orderStatusPopup')
       .show()
       .html('');

     // Append all order statuses.
     for (var status in duckburg.orders.statuses) {

       var bgColor = duckburg.orders.statuses[status];

        $('.orderStatusPopup')
          .append($('<span>')
            .html(status)
            .css({'background': bgColor })
            .click(function(e) {
              duckburg.orders.setOrderStatus(e.currentTarget.innerHTML);
              $('.offClicker').hide();
              $('.orderStatusPopup').hide();
            }));

     }
   },

   // Set the main initial form elements, global to the entire order.
   setInitialFormElements: function() {
     $('.wrapper').show();
     $('.wrapper-content')
       .html('')
       .append($('<div>')
         .attr('class', 'orderForm')
         .append($('<div>')
           .attr('class', 'orderDueDateAndName'))
         .append($('<div>')
           .attr('class', 'customerInfo'))
         .append($('<div>')
           .attr('class', 'designInfo')));
   },

   // Some additional options for the order.
   setOrderOptions: function() {

      var count = $('.catalogItemWithinOrder').length;

      var settings = {
        'product_store': null,
        'product_ishidden': 'YES'
      };

      // 'product_family'
      // 'product_tags'
      // 'item_expiration_date':
      // 'product_isindexed'

      var settingsDiv = $('<div>')
        .attr('class', 'orderPertinentInfoHolder')
        .attr('id', 'orderPertinentInfoHolder_' + count)
        .html('');

      for (var param in settings) {
        var val = settings[param] || '';
        duckburg.orders.appendOrderSettingInput(param, val, settingsDiv);
      }

      $('.catalogItemWithinOrder').each(function() {
        var idx = this.id.replace('design_no_', '');
        if (idx == count) {
          $('#' + this.id)
            .append($('<div>')
             .attr('class', 'pertinentInfo')
             .attr('id', 'pertinentInfo_' + count)
              .append($('<button>')
                .html('advanced settings')
                .attr('id', 'itemSettingsButton_' + count)
                .click(function(e) {

                  var holder = $('#' + e.currentTarget.id).next();
                  var display = holder.css('display');
                  if (display == 'block') {
                    holder.hide();
                  } else {
                    holder.show();
                  }
                }))
              .append(settingsDiv));
        }
      });
   },

   // Append an order setting input.
   appendOrderSettingInput: function(param, val, parent) {

     var labelDict = {
       'product_store': 'Storefront',
       'product_ishidden': 'Hide product?'
     };

     parent
       .append($('<label>')
         .attr('class', 'pertinentInfoLabel')
         .html(labelDict[param]))
       .append($('<input>')
         .attr('type', 'hidden')
         .attr('class', 'pertinentInfoInput ' + param)
         .attr('id', param)
         .val(val))
       .append($('<input>')
         .attr('type', 'text')
         .attr('class', 'pertinentInfoInput ' + param)
         .attr('id', param + '_visible_readonly')
         .val(val)
         .click(function(e) {

           var parent = e.currentTarget.parentElement.parentElement.id;
           duckburg.orders.lastClickedSettingsCount =
              parent.replace('pertinentInfo_', '');

           // Store the item that has been clicked and create a popup selector
           // so the user can select from the existing list of items.
           duckburg.orders.lastClickedProductButton = e.currentTarget;
           var dbObj = duckburg.models['dbCatalogItem']
              .values[param]['dbObject'];
           duckburg.forms.currentlyCreatingItemWithType = dbObj.type;
           duckburg.objects.relatedObjectSelector(e, dbObj);
       }));
   },

   // Objects view has a more complex flow for selecting related objects within
   // a form.  Here, we utilize a simpler flow for quickly filling in some
   // order settings inputs.
   simplePlaceObject: function(event, originalEvent) {
     var targetHelper = originalEvent.currentTarget.id;
     var id = event.id;
     var readable = event.innerHTML;

     var idTarget = targetHelper.replace('_visible_readonly', '');

     $('.' + idTarget).each(function(item) {

       var parentId = this.parentElement.parentElement.id;
       var idSearcher = parentId.search('pertinentInfo_') == -1 ?
          'design_no_' : 'pertinentInfo_';
       var idx = parentId.replace(idSearcher, '');

       if (idx == duckburg.orders.lastClickedSettingsCount) {

          if (this.id == targetHelper) {
            this.value = readable;
          }

          if (this.id == idTarget) {
            this.value = id;
          }
       }
     });
   },

   // Set a readable order number.  Parse will provide an internal one; this
   // is so the customer has a cleaner number to look at.  Created by counting
   // the number of existing orders.
   setOrderNumber: function() {
      var OrderObject = Parse.Object.extend("dbOrder");
      var query = new Parse.Query(OrderObject);
      query.count({
        success: function(count) {
          duckburg.orders.placeOrderNumberInUI(count);
        },
        error: function(error) {
          duckburg.errorMessage(error.message);
        }
      });
   },

   // Given a count of orders, create and insert the current (readable)
   // order number into the UI.
   placeOrderNumberInUI: function(count) {

     // Set a 6 digit order number.
     var orderNumber = '0000000' + String(count + 1);
     orderNumber =
         orderNumber.slice(orderNumber.length - 6, orderNumber.length);

     duckburg.orders.setReadableOrderNumber(orderNumber);
   },

   // Set the readable order number for the UI.
   setReadableOrderNumber: function(number) {

     // Set the order number to a hidden form field.
     $('#readable_order_id').val(number);

     // Make a visible order number.
     $('.orderFormOrderNumber').html('Order Number: #' + number);
   },

   // Setup the div for customer information.
   setCustomerInfo: function() {
     var parent = $('.customerInfo');

     // Set an order number.
     parent.append($('<input>')
       .attr('type', 'hidden')
       .attr('name', 'order_form_field')
       .attr('id', 'order_customer_object'));

     // Button for adding customer to the order.
     parent.append($('<button>')
      .attr('class', 'addNewCustomerToOrderButton')
      .html('<i class="fa fa-plus"></i> add customer')
      .click(function(e) {
        duckburg.orders.addNewCustomerToOrder();
      }));
   },

   // Add a new customer to the order.
   addNewCustomerToOrder: function() {

     // Add an offclick event.
     $('.offClicker').show()
       .click(function() {
         $('.offClicker').hide();
         $('.popupItemHolder').hide();
       });

     // Add the ability to add or select a user.
     $('.popupItemHolder')
       .html('')
       .show()
       .append($('<div>')
         .attr('class', 'newCustomerForm'))
       .append($('<div>')
         .attr('class', 'selectCustomer'));

     // Set a form to add a new customer
     duckburg.orders.setNewCustomerForm();

     // Set up a field for searching for existing customers.
     duckburg.orders.searchExistingCustomersField();

   },

   // Set up a form for a new customer.
   setNewCustomerForm: function() {
     duckburg.forms.createNewObjectFormForObject(
        'dbCustomer', '.newCustomerForm');
   },

   // Search through existing customers.  This is the field that listens
   // for a search query and kicks off the search.
   searchExistingCustomersField: function() {
     $('.selectCustomer')
       .append($('<input>')
         .attr('placeholder', 'search for customer')
         .attr('class', 'searchForCustomerInOrderForm')
         .keyup(function() {
           duckburg.orders.searchForCustomerInOrderForm();
         }))
       .append($('<div>')
         .attr('class', 'listOfExistingCustomers')
         .append($('<span>')
           .attr('class', 'existingCustomersMessage')
           .html('search for a customer above')));
   },

   // Begin performing a search for a customer, from within the order form.
   searchForCustomerInOrderForm: function() {

     // Clear time interval for the search.
     if (duckburg.orders.searchingForCustomer) {
       window.clearInterval(duckburg.orders.searchingForCustomer);
     }

     // Clear list of customers.
     $('.listOfExistingCustomers')
       .html('')
       .append($('<span>')
         .attr('class', 'existingCustomersMessage')
         .html('searching for customers'));

     // Perform the search.
     var search = $('.searchForCustomerInOrderForm').val().toLowerCase();
     search = search == '' ? 'zxzxzxzxz' : search;
     duckburg.orders.searchingForCustomer = setTimeout(function() {

       duckburg.requests.findObjects('dbCustomer',

         function(results) {

           // Store these results.
           duckburg.orders.listOfSearchedCustomers = results;

           // Clear list of customers.
           $('.listOfExistingCustomers').html('');
           if (results.length == 0) {
             $('.listOfExistingCustomers')
               .append($('<span>')
                 .attr('class', 'existingCustomersMessage')
                 .html('no customers found'));
           }

           for (var i = 0; i < results.length; i++) {
             var cust = results[i];
             var attribs = cust.attributes;
             var content = attribs.first_name + ' ' + attribs.last_name;

             $('.listOfExistingCustomers')
               .append($('<span>')
                 .html(content)
                 .attr('id', i)
                 .attr('class', 'customerEntry')
                 .click(function(e) {
                   duckburg.orders.chooseCustomerForOrder(e);
                 }));
           }
         },

         function(erMsg) {
           duckburg.errorMessage(erMsg);
         }, search);
     }, 100);
   },

   // Choose a customer to add to an order, from a search for existing
   // customers, performed within the order form. This function discovers
   // the actual customer object and passes it to a helper function.
   chooseCustomerForOrder: function(e) {
     $('.offClicker').hide();
     $('.popupItemHolder').hide();
     var custList = duckburg.orders.listOfSearchedCustomers;
     var customer = custList[e.currentTarget.id];
     duckburg.orders.addCustomerToOrder(customer);
   },

   // Add a customer to an open order - place it in the form..
   addCustomerToOrder: function(customer, shipTo, billTo) {

     // Get attributes and set display values of empty values.
     var attribs = customer.attributes;
     var phone =
        attribs.phone_number != '' ? attribs.phone_number : '(no phone)';
     var email =
        attribs.email_address != '' ? attribs.email_address : '(no email)';

     // If it is the first (and thus only) customer, force it to be
     // the shipping billing customer.
     var custIndex = 0;
     $('.customerWithinOrder').each(function() {
       custIndex++;
     });

     // Set shipping and billing customer.
     shipTo = shipTo || custIndex == 0;
     billTo = billTo || custIndex == 0;

     // Set the customer info div.
     $('.customerInfo')

       // Main holder.
       .append($('<span>')
         .attr('class', 'customerWithinOrder')
         .attr('id', customer.id)

        // First and last name.
        .append($('<span>')
          .attr('class', 'cwoName')
          .html(attribs.first_name + ' ' + attribs.last_name))

        // Phone number.
        .append($('<span>')
          .attr('class', 'cwoPhone')
          .html(phone))

        // Email
        .append($('<span>')
          .attr('class', 'cwoEmail')
          .html(email))

        // Is Shipping customer?
        .append($('<span>')
          .attr('class', 'cwoIsShipping')
          .append($('<label>')
            .html('Ship to'))
          .append($('<input>')
            .attr('type', 'radio')
            .attr('checked', shipTo)
            .attr('id', 'is_shipping_cust')
            .attr('name', 'is_shipping_cust'))
            .click(function () {
              duckburg.orders.updateCurrentCustomers();
            }))

        // Is Billing customer?
        .append($('<span>')
          .attr('class', 'cwoIsBilling')
          .append($('<label>')
            .html('Bill to'))
          .append($('<input>')
            .attr('type', 'radio')
            .attr('checked', billTo)
            .attr('id', 'is_billing_cust')
            .attr('name', 'is_billing_cust'))
            .click(function () {
              duckburg.orders.updateCurrentCustomers();
            }))

        // Edit this customer button.
        .append($('<button>')
          .attr('class', 'cwoEdit')
          .html('edit')
          .attr('id', custIndex)
          .click(function(e) {
            duckburg.orders.editCustomerWithinOrder(e);
          }))

        // Remove this customer button.
        .append($('<button>')
          .attr('class', 'cwoRemove')
          .html('remove')
          .attr('id', custIndex)
          .click(function(e) {
            duckburg.orders.removeCustomerFromOrder(e);
          }))

        ); // End of bonkers chain of jquery appends.

      // Update the globally memorized list of customers.
      duckburg.orders.updateCurrentCustomers();
   },

   // Update the list of customers.  That is, remember who is currently
   // selected and what their role is.  Store the info globally so it can
   // be easily gotten and saved as a parameter of the order.
   updateCurrentCustomers: function() {

     // Holder for list of customers.
     var customers = [];

     // Total number of customers.
     var totalCustomers = $('.customerWithinOrder').length;

     // Iterate over selected customers.
     $('.customerWithinOrder').each(function(item) {
        var custObject = {};
        custObject.id = this.id;

        // Is this the shipping/billing customer?
        var isShip;
        var isBill;

        // Iterate over child elements of a customer to find additional
        // info.
        var kids = this.children;
        for (var kid in kids) {
          var el = kids[kid];

          // Determine if this is the shipping customer.
          if (el.className == 'cwoIsShipping') {
            for (var child in el.children) {
              if (child == 'is_shipping_cust') {
                custObject.isShip = el.children[child].checked;
                if (totalCustomers == 1) {
                  $('#is_shipping_cust').attr('checked', true);
                  custObject.isShip = true;
                }
              }
            }
          }

          // Determine if this is the billing customer.
          if (el.className == 'cwoIsBilling') {
            for (var child in el.children) {
              if (child == 'is_billing_cust') {
                custObject.isBill = el.children[child].checked;
                if (totalCustomers == 1) {
                  $('#is_billing_cust').attr('checked', true);
                  custObject.isBill = true;
                }
              }
            }
          }

          // Set the class name of these two items (unrelated to updating
          // current customer).
          if (el.className == 'cwoEdit' || el.className == 'cwoRemove') {
            el.id = item;
          }
        }

        // Store customer info.
        customers.push(custObject);
     });

     // Update the customer info.
     duckburg.orders.currentOrderCustomers = customers;
     var cust = JSON.stringify(customers);
     $('#order_customer_object').val(cust);
   },

   // Remove a particluar customer from the order.
   removeCustomerFromOrder: function(event) {
     var index = event.currentTarget.id;
     $('.customerWithinOrder').each(function(item) {
        if (item == index) {
          this.remove();
        }
     });

     // Update the list of customers now that one has been removed.
     duckburg.orders.updateCurrentCustomers();
   },

   // Edit a customer from within the order form.
   editCustomerWithinOrder: function(event) {

     // Launch the form to add a new customer to the order.
     duckburg.orders.addNewCustomerToOrder();

     // Get the current customer from the database and populate the form
     // with their details.
     var id = event.currentTarget.id;
     var customer = duckburg.orders.currentOrderCustomers[id];
     duckburg.requests.quickFind('dbCustomer',
       function(result) {
         duckburg.orders.populateNewCustomerForm(result);
       },
       duckburg.errorMessage,
       customer.id);
   },

   // Populate the new customer form with an existing customer's details
   // so that their record can be edited.
   populateNewCustomerForm: function(customer) {

     // Store editing customer.
     duckburg.forms.currentlyEditingObject = customer;

     // Fill in the form.
     var atrib = customer.attributes;
     var model = duckburg.models['dbCustomer'];
     for (var item in atrib) {
       if (model.values[item] && model.values[item].input == 'checkbox') {
          var checked = atrib[item] == 'yes';
          $('#' + item).attr('checked', checked);
       } else {
          $('#' + item).val(atrib[item]);
       }
     }
   },

   // Update the info pertaining to a customer.
   replaceCustomerWithNewCustomer: function (result) {
     var atrib = result.attributes;
     $('.customerWithinOrder').each(function(item) {
       if (this.id == result.id) {
         for (var child in this.children) {

           // Update name.
           if (this.children[child].className == 'cwoName') {
             this.children[child].innerHTML = atrib.first_name + ' ' + atrib.last_name;
           }

           // Update phone.
           if (this.children[child].className == 'cwoPhone') {
             var phone = atrib.phone_number == '' ?
                '(no phone)' : atrib.phone_number;
             this.children[child].innerHTML = phone;
           }

           // Update email.
           if (this.children[child].className == 'cwoEmail') {
             var email = atrib.email_address == '' ?
                '(no email)' : atrib.email_address;
             this.children[child].innerHTML = email;
           }
         }
       }
     });
   },

   // Button to add a new item/design to the order.
   setDesignInfo: function() {
     $('.designInfo')
       .append($('<button>')
         .attr('class', 'addNewDesignToOrderButton')
         .html('<i class="fa fa-plus"></i> add item')
         .click(function() {
           duckburg.orders.addNewCatalogItemToOrderForm();
         }))
       .append($('<div>')
         .attr('class', 'openOrderCatalogItemHolder'));
   },

   // Allow the customer to configure a new item for their order.
   addNewCatalogItemToOrderForm: function() {

     // Set all the form elements for a new item/design within
     // the order form.
     var formDiv = $('.catalogItemWithinOrder');
     var model = duckburg.models['dbCatalogItem'];
     var values = model.values;

     // Number of designs presently.
     var designCount = $('.catalogItemWithinOrder').length + 1;

     // Drop a new catalog item workspace into the item holder.

     var bgColor = designCount % 2 == 0 ?
        'rgb(216, 216, 216)' : 'rgb(229, 229, 229)';

     $('.openOrderCatalogItemHolder')
       .append($('<div>')
         .attr('class', 'catalogItemWithinOrder')
         .attr('id', 'design_no_' + designCount)
         .css({'background': bgColor })
         .append($('<span>')
           .attr('class', 'designInFormDesignId'))

         // Input for the name of the catalog item.
         .append($('<input>')
           .attr('type', 'text')
           .attr('class', 'designInFormDesignName')
           .attr('id', 'designInFormDesignName_' + designCount)
           .attr('placeholder', 'Name of item'))

         // Button for removing (unstaging) the design from the order.
         .append($('<button>')
           .attr('class', 'designInFormRemoveButton')
           .html('remove <i class="fa fa-times"></i>')
           .click(function(e) {
             duckburg.orders.unstageItemFromOrder(e);
           }))

         // Hidden field to holde the catalog item id.
         .append($('<input>')
           .attr('type', 'hidden')
           .attr('class', 'catalogItemId')
           .attr('id', 'catalogItemId_' + designCount))
         );

     // Append inputs for product details and product price.
     duckburg.orders.appendProductInfoInputs();

     // Append some options for the sizes.
     duckburg.orders.appendSizeOptions();

     // Append two design choices: new or existing
     duckburg.orders.appendDesignOptions();

     // Set ids for each present design.
     duckburg.orders.setDesignIdsForUI();

     // Set the various order options for selection.
     duckburg.orders.setOrderOptions();
   },

   // Append inputs for product type, color, price, etc.
   appendProductInfoInputs: function() {

     var designCount = $('.catalogItemWithinOrder').length;

     $('#design_no_' + designCount)

       // Button for adding product.  Stores the readable value, while the
       // hidden input below accepts the database Parse ID.
       .append($('<input>')
         .attr('class', 'designInFormProductName product_type')
         .attr('type', 'text')
         .attr('placeholder', 'Add product')
         .prop('readonly', true)
         .attr('id', 'product_type_visible_readonly')
         .click(function(e) {

           // Store the item that has been clicked and create a popup selector
           // so the user can select from the existing list of items.
           duckburg.orders.lastClickedProductButton = e.currentTarget;
           var dbObj =
               duckburg.models['dbCatalogItem'].values['product_type']['dbObject'];

           var parent = e.currentTarget.parentElement.parentElement.id;
           duckburg.orders.lastClickedSettingsCount =
              parent.replace('design_no_', '');

           duckburg.forms.currentlyCreatingItemWithType = 'dbCatalogItem';
           duckburg.objects.relatedObjectSelector(e, dbObj);
         })
       )

       // Append a hidden input that will actually store the value for the
       // product type.
       .append($('<input>')
         .attr('type', 'hidden')
         .attr('class', 'product_type')
         .attr('id', 'product_type'))

       //  // Input for design product number.
       // .append($('<input>')
       //   .attr('class', 'designInFormProductNumber')
       //   .attr('type', 'text')
       //   .attr('placeholder', 'Product number')
       //   .prop('readonly', true)
       //   .attr('id', 'supplier_item_id_' + designCount)
       // )

       // Input for the color of the product.
       .append($('<input>')
         .attr('class', 'designInFormProductColor')
         .attr('type', 'text')
         .attr('placeholder', 'Color')
       )

       // Standard price
       .append($('<input>')
         .attr('class', 'designInFormPiecePrice')
         .attr('type', 'text')
         .attr('placeholder',  'Piece price')
       )

       // Sale price
       .append($('<input>')
         .attr('class', 'designInFormSalePrice')
         .attr('type', 'text')
         .attr('placeholder', 'Sale price')
       )

       // Social price
       .append($('<input>')
         .attr('class', 'designInFormSocialPrice')
         .attr('type', 'text')
         .attr('placeholder', 'Social price')
       );
   },

   // Append a holder for sizes, and the default size options to start.
   appendSizeOptions: function(count) {

     // Number of order items.
     count = count || $('.catalogItemWithinOrder').length;

     // Parent div that holds the size boxes.
     var div = $('<div>')
       .attr('class', 'catItemWithinOrderSizeOptions')
       .attr('id', 'catItemWithinOrderSizeOptions_' + count);

     // Append the holder to the catalog item area.
     $('.catalogItemWithinOrder').each(function(item) {
       if (item + 1 == count) {
         $('#' + this.id)
           .append(div)
       }
     });

     // Now dump size options into the holder.  When we start, we're using
     // a global list of default sizes.
     duckburg.orders.addSizesToAnOrderItem(
        count, duckburg.orders.standardSizes, div)
   },

   // Given an array of sizes, count (number of designs present) and the
   // parent div to append to, append a selction of sizes.  If a user has
   // already entered sizes, they are carried along in the sizeArray object.
   addSizesToAnOrderItem: function(count, sizeArray, parent) {

     // Clear the div holding the current sizes.
     parent.html('');

     // Use a global list as guidance.  This div holds the sizes in the order
     // we wish to have them displayed.  As we iterate over this list, we will
     // look for the current sizes in this list.  That way, whichever order the
     // user adds/removes sizes, they will appear in a logical order.
     for (var i = 0; i < duckburg.orders.orderOfSizes.length; i++) {

       // Size, an ordered entry in our global order of sizes object.
       var size = duckburg.orders.orderOfSizes[i];

       // If the size exists and/or is == 0 (evalates as false) append it to
       // the size list.
       if (sizeArray[size] || sizeArray[size] == 0) {
          var sizeCount = sizeArray[size] == 0 ? '' : sizeArray[size];

          // If the size and count are good, append the single size to the
          // UI/ size list.
          duckburg.orders.appendSingleSizeOptionToDiv(
              parent, size, count, sizeCount);
       }
     }

     // Now we deal with odd sizes.  For instance, if the user has a unique
     // size such as 'OSFM', of whatever, it will appear at the end of the list.
     for (var oddSize in sizeArray) {
       if (duckburg.orders.orderOfSizes.indexOf(oddSize) == -1) {

         // Append these individual 'odd sizes to the div.
         duckburg.orders.appendSingleSizeOptionToDiv(
           parent, oddSize, count, sizeArray[oddSize]);
       }
     }

     // Now that sizes are added, include a button that lets the user add
     // additional size options.
     parent
       .append($('<span>')
         .attr('class', 'appendNewSizeSpan')
         .append($('<input>')
           .attr('placeholder', 'new size')
           .attr('class', 'newSizeInput'))
         .append($('<button>')
           .attr('class', 'appendNewSizeButton')
           .attr('id', 'appendNewSizeButton_' + count)
           .html('<i class="fa fa-plus"></i>')
           .click(function(e) {
             duckburg.orders.appendNewSizeOption(e);
         })));


      // All sizes have been added to this 'parent' div.  Now, append
      // the parent to the size holder that stays put.
      $('.catItemWithinOrderSizeOptions').each(function(item) {
        var idx = this.id.replace('catItemWithinOrderSizeOptions_', '');
        if (idx == count) {
          $('#' + this.id)
            .append(parent)
        }
      });
   },

   // Append a new size option as chosen by the user.
   appendNewSizeOption: function(event) {

     // Get ready to store the existing sizes (and quantities if they exist).
     var currentSizes = {};

     // Number of designs that exist.
     var count = event.currentTarget.id.replace('appendNewSizeButton_', '');

     // Get the new size input by the user.
     var spanWithInput = event.currentTarget.parentElement;

     // Storing the new size the user created.
     var newSizeVal;

     // Get the new size value;
     for (var i = 0; i < spanWithInput.children.length; i++) {
       var kid = spanWithInput.children[i];
       if (kid.className == 'newSizeInput') {
         newSizeVal = kid.value;
       }
     }

     // No use in creating a new size if the user didn't enter one.
     if (!newSizeVal || newSizeVal == '') {
       var msg = 'You must enter a size in the "new size" field in order to' +
          ' add a new size';
       duckburg.errorMessage(msg);
       return;
     }f

     // If the new size is not blank (and it is not already shown)
     // add it to the sizes.
     if (newSizeVal && newSizeVal != '') {
       var sizeHolder = spanWithInput.parentElement;
       for (var j = 0; j < sizeHolder.children.length; j++) {
          var sizeSpan = sizeHolder.children[j];
          var sizeId = sizeSpan.id;
          var size = sizeId.replace('size_', '').split('_')[0];
          for (var k = 0; k < sizeSpan.children.length; k++) {
            var sizeArea = sizeSpan.children[k];
            if (sizeArea.className == 'sizeInput') {
              currentSizes[size] = sizeArea.value || 0;
            }
          }
       }

       // Don't add a size if it already exists.
       if (!currentSizes[newSizeVal]) {
         currentSizes[newSizeVal] = 0;
       }
     }

     // Now we have a dictionary of all sizes and their quantities.  Add
     // this dictionary into the UI.
     var parent = $('#' + sizeHolder.id);
     duckburg.orders.addSizesToAnOrderItem(count, currentSizes, parent);
   },

   // Helper function that appends a single size to the UI.
   appendSingleSizeOptionToDiv: function(parent, size, count, sizeCount) {
     parent

       // Holder for size information.
       .append($('<div>')
         .attr('id', 'size_' + size + '_' + count)
         .attr('class','sizeLabelAndCountHolder')

         // Span that holds the name of the size, eg 'S:' or 'XL:'.
         .append($('<span>')
           .attr('class', 'sizeNameLabel')
           .html(size + ': '))

         // Input for quantities of the given size.
         .append($('<input>')
           .attr('class', 'sizeInput')
           .attr('placeholder', '0')
           .val(sizeCount))

         // Remove button for destroying this particular size.
         .append($('<span>')
           .attr('class', 'sizeRemoveButton')
           .html('<i class="fa fa-trash-o"></i>')
           .click(function(e) {
             $('#' + e.currentTarget.parentElement.id).remove();
           })
     ));
   },

   // Append options for adding a design to an order.
   appendDesignOptions: function(count) {

     // Number of orders.
     count = count || $('.catalogItemWithinOrder').length;

     // Remove an image picker if it exists, for the count.
     $('.orderFormImagePickerHolder').each(function(item) {
       if (item + 1 == count) {
         this.remove();
       }
     });

     // Drop the options into the appropriate div.
     $('.catalogItemWithinOrder').each(function(item) {

       // If the catalog item holder id matches our desired location for
       // these new design details, drop the elements here.
       if (item + 1 == count) {
         $('#' + this.id)

           // Holder for the image picker.
           .append($('<div>')
             .attr('class', 'orderFormImagePickerHolder')
             .attr('id', 'imagePicker_' + count)
             .html('')

             // User can create a new design from images.
             .append($('<button>')
               .attr('id', count)
               .html('<i class="fa fa-file"></i> new design')
               .attr('class', 'chooseNewDesignButton')
               .click(function(e) {
                 duckburg.orders.appendImagePickerForOrderForm(e);
               }))

             // User can choose a design that already exists.
             .append($('<button>')
               .attr('id', count)
               .html('<i class="fa fa-folder-open"></i> existing design')
               .attr('class', 'chooseExistingDesignButton')
               .click(function(e) {
                 duckburg.orders.launchExistingDesignFinder(e);
               }))
          );
       }
     });
   },

   // Append an image picker to the form.
   appendImagePickerForOrderForm: function(event, objectToInsert) {

     // Count number of designs and create the img picker dom element.
     var counter = event.currentTarget.id;
     var imgPicker = duckburg.orders.orderImagePicker(counter);

     // In this same div, add hidden fields for every aspect of a design.
     // If an object to insert is passed below, set all the info to that item.
     // Else, set it all blank, and start updating order, which will
     // look for designs with no ids, and make designs out of them.
     $('.orderFormImagePickerHolder').each(function(item) {

       // Drop some elements within the img picker with this number.
       var divNumber = this.id.replace('imagePicker_', '');
       if (divNumber == counter) {
         $('#' + this.id)

           // Clear the div.
           .html('')

           // Append the img picker created above.
           .append(imgPicker)

           // Button to reset the images of the design
           .append($('<button>')
             .attr('class', 'resetDesignImagesButton')
             .attr('id', counter)
             .html('reset design images')
             .click(function(e) {
               duckburg.orders.appendDesignOptions(e.currentTarget.id);
             }))

           // Div in which the images will reside.
           .append($('<div>')
             .attr('class', 'designImagesWithinOrderForm')
             .attr('id', 'designImagesWithinOrderForm_' + counter))

           // Textarea for design notes.
           .append($('<textarea>')
             .attr('class', 'designNotesWithinOrderForm')
             .attr('id', 'designNotesWithinOrderForm_' + counter)
             .attr('placeholder', 'Design notes'))

           // A div that holds a set of hidden fields, which will each
           // inherit information about the design/catalog item.
           .append($('<div>')
             .attr('class', 'designWithinOrderFormVariables')
             .attr('id', 'designWithinOrderFormVariables_' + counter)

             // ID of the design (the parse ID)
             .append($('<input>')
               .attr('type', 'hidden')
               .attr('id', 'design_id'))

             // Comma separated list of urls for the images.
             .append($('<input>')
               .attr('type', 'hidden')
               .attr('id', 'design_images_list'))

             // Name of the design.
             .append($('<input>')
               .attr('type', 'hidden')
               .attr('id', 'design_name'))

             // Notes for the design.
             .append($('<input>')
               .attr('type', 'hidden')
               .attr('id', 'catalog_item_notes'))

             // The number of the design.
             .append($('<input>')
               .attr('type', 'hidden')
               .attr('id', 'design_count'))
          );
       }
     });

     // If an object has been passed for insertion, stick this object inside
     // the newly created form.
     if (objectToInsert) {
       duckburg.orders.addDesignToOrderWithObject(objectToInsert, counter);
     }
   },

   // Given an object 'design', fill an order's design details div
   // with the information about this design.
   addDesignToOrderWithObject: function(design, count) {
     var atrib = design.attributes;

     // Add images to the order form.
     var imgArray = atrib.design_images_list.split(',');

     // Append the images and be sure to store the details about the design.
     duckburg.orders.appendImagesToDesignImageHolder(imgArray, count);
     duckburg.orders.storeDesignDetails(design, count);

    // If the design name hasn't been created, give it the same name as this
    // existing design.
    $('.designInFormDesignName').each(function() {
      var name = design.attributes.design_name;
      var idx = this.id.replace('designInFormDesignName_', '');
      if (idx == count) {
        if (this.value == '') {
          this.value = name;
        }
      }
    });
   },

   // Given an array of images and a count of how many designs exist,
   // add a span for each image to a holder.
   appendImagesToDesignImageHolder: function(imgArray, count) {

     // Iterate over image holders and find the one we want.
     $('.designImagesWithinOrderForm').each(function(item) {
       var divNumber = this.id.replace('designImagesWithinOrderForm_', '');
       if (divNumber == count) {

         // Clear out the image holder.
         $('#' + this.id).html('');

         // Drop each image into the holder.
         for (var i = imgArray.length - 1; i >= 0; i--) {
           var url = imgArray[i];
           if (url != '') {
              $('#' + this.id)

                // Span to hold the image and buttons.  Image becomes the
                // background of this span.
                .append($('<span>')
                 .attr('id', 'design_' + count + '_image_' + i)
                 .css({'background': 'url(' + url + ')',
                       'background-size': '100%'})

                 // Label/button form removing this image from the design.
                 .append($('<label>')
                   .attr('class', 'removeDesignImageWithinOrder')
                   .attr('id', count)
                   .html('remove')
                   .click(function(e) {
                     duckburg.orders.removeDesignImageWithinOrder(e);
                   }))

                 // Label/button for viewing the design in detail.
                 .append($('<label>')
                   .attr('class', 'viewDesignImageWithinOrder')
                   .attr('id', count)
                   .html('view')
                   .click(function(e) {
                     duckburg.orders.viewDesignImageWithinOrder(e);
                   }))
               );
           }
         }
       }
     });

     // Update the stored information.  Give images a second to load.
     setTimeout(function() {
        duckburg.orders.autoSave();
     }, 500);
   },

   // Actively store each used design's details as the user edits the order.
   storeDesignDetails: function(design, count) {
     $('.designWithinOrderFormVariables').each(function(item) {

       var divNumber = this.id.replace('designWithinOrderFormVariables_', '');

       // Match the design to its correct item.
       if (divNumber == count) {

         // Iterate over all hidden inputs, and store the corresponding
         // design details within each input.
         var kids = this.children;
         for (var i = 0; i < kids.length; i++) {
           var el = kids[i];
           var id = el.id;
           var atrib = design.attributes;
           if (atrib[id]) {
             el.value = atrib[id];
           }
           if (id == 'design_id') {
             el.value = design.id;
           }
         }
       }
     });

     // After any design is updated, save the current order and all designs.
     duckburg.orders.autoSave();
   },

   // Remove an image from within a design.
   removeDesignImageWithinOrder: function(e) {
     var el = e.currentTarget;
     var count = el.id;

     // Get the parent element of the label that was clicked on.  This will
     // be the span, which hides the url in its background property.
     var parent = el.parentElement;

     // Extract the URL.  Note, we're doing it this way because storing the
     // url as an id property does not seem to work in some browsers, it finds
     // semicolons and such illegal.
     var bg = $(parent).css('background-image');
     bg = String(bg);
     bg = bg.replace('url(', '');
     bg = bg.replace(')', '');

     // Now update what is stored about this design, ie find the list of
     // image urls and remove this one from the list.
     $('.designWithinOrderFormVariables').each(function() {
       var divNumber = this.id.replace('designWithinOrderFormVariables_', '');
       if (divNumber == count) {
         var kids = this.children;
         for (var i = 0; i < kids.length; i++) {
           var el = kids[i];
           if (el.id == 'design_images_list')  {
              var imgList = el.value;
              var imgArray = imgList.split(',');
              var index = imgArray.indexOf(bg);
              imgArray.splice(index, 1);
              el.value = imgArray.join(',');
           }
         }
       }
     });

     // Remove the image from the ui.
     $('#' + parent.id).remove();
   },

   // View an image in detail.
   viewDesignImageWithinOrder: function(e) {

     // Get the background image details
     var el = e.currentTarget;
     var count = el.id
     var parent = el.parentElement;
     var bg = $(parent).css('background-image');

     // Reveal image detail div.
     $('.imgDetail')
       .show()
       .click(function() {
         $('.imgDetail').hide();
       });

     // Assign url to background of image detail.
     $('.imgDetailContent')
       .css({'background': '#F1F1F1 ' + bg,
             'background-size': '100%'});


   },

   // Image picker to add images to a design.
   orderImagePicker: function(count) {

     // Create image picker.
     var imgPicker = $('<input>')
       .attr('type', 'file')
       .attr('id', 'newInputFilePicker_' + count)
       .attr('class', 'editingCatalogImageDesignPicker')

       // Onchange function that adds the image to the div and stores the
       // url / updates design info.
       .change(function(e) {
         duckburg.requests.files.save(e.currentTarget, function(
            result, input) {

           var inputCounter = input.id.replace('newInputFilePicker_', '')
           duckburg.orders.updateDesignImageInfo(inputCounter, result);

         })
       });

     duckburg.orders.storeAndSaveAllDesigns();
     return imgPicker;
   },

   // Update the design info so the new image is included, and then
   // call helper function to display image.
   updateDesignImageInfo: function(inputCounter, result) {
     $('.designWithinOrderFormVariables').each(function() {
       var divNumber = this.id.replace('designWithinOrderFormVariables_', '');
       if (divNumber == inputCounter) {
         var kids = this.children;
         for (var i = 0; i < kids.length; i++) {
           var el = kids[i];
           if (el.id == 'design_images_list')  {
              var imgList = el.value;
              var imgArray = imgList.split(',');
              imgArray.push(result._url);

              if (imgArray[0] == '') {
                imgArray.splice(0, 1);
              }

              // Append the images to the div.
              duckburg.orders.appendImagesToDesignImageHolder(
                  imgArray, inputCounter);
              el.value = imgArray.join(',');
           }
         }
       }
     });
   },

   // Launch a finder for choosing an existing design.
   launchExistingDesignFinder: function(e) {
     var id = e.currentTarget.id;

     // Create an offclicker to hide the design.
     $('.offClicker')
       .show()
       .click(function() {
         $('.popupItemHolder').hide();
         $('.offClicker').hide();
       });

     // Reveal a popup that will contain existing designs.
     $('.popupItemHolder')
       .show()
       .html('')

       // Input for the user to enter their search term.
       .append($('<input>')
         .attr('type', 'text')
         .attr('class', 'existingDesignSearchInput')
         .attr('placeholder', 'Search for a design')
         .keyup(function(e) {
           duckburg.orders.searchForExistingDesigns(e);
         }))

       // Div that will hold the results of the search.
       .append($('<div>')
         .attr('class', 'existingDesignSearchResults')
         .attr('id', id)
         .append($('<em>')
           .html('search for an exsiting design')));
   },

   // Perform a search for designs.
   searchForExistingDesigns: function(event) {

     // The value of the search term.
     var val = event.currentTarget.value;

     // Check for a timer that is already running, waiting to perform
     // the search.
     if (duckburg.orders.existingDesignSearchTimeout) {
       window.clearInterval(duckburg.orders.existingDesignSearchTimeout);
     }

     // Set a timer after which to perform the search.
     duckburg.orders.existingDesignSearchTimeout = setTimeout(function() {

      // Clear the list of existing designs before performing the search.
      $('.existingDesignSearchResults')
        .html('')
        .append($('<em>')
          .html('searching designs...'));

       // If there is no search term, reset div.
       if (val == '' || !val) {
         $('.existingDesignSearchResults')
           .html('')
           .append($('<em>')
             .html('search for an exsiting design'));
         return false;
       }

       // Search for design objects contaning the search string.
       duckburg.requests.findObjects('dbDesign',
         function(results) {
           if (results.length == 0 || !results) {
             $('.existingDesignSearchResults')
               .html('')
               .append($('<em>')
                 .html('no designs found for that search'));
             return false;
           } else {

             // Render one or more existing designs into a list of search
             // results.
             duckburg.orders.renderExistingDesignSearchResults(results)
           }
         },
         duckburg.errorMessage,
         val.toLowerCase());
     }, 200);

   },

   // Given a list of parse results, show the user designs that exist
   // matching their search term.
   renderExistingDesignSearchResults: function(results) {

     // Keep these results globally.
     duckburg.orders.existingImageSearchResults = results;

     // Clear the div that holds search results.
     var div = $('.existingDesignSearchResults');
     var id = div.attr('id');
     div.html('');

     // Display all of the individual results.
     for (var i = 0; i < results.length; i++) {
       var result = results[i];
       var atrib = result.attributes;

       // Set the span, and an onclick that will add this design to the
       // current design.
       var span = $('<span>')
           .attr('id', i)
           .click(function(e) {
             duckburg.orders.addExistingDesignToOrder(e);
           })
           .append($('<em>')
             .html(atrib.design_name));

       // Get all of the images.  We'll display the first <=5.
       var imgArray = [];
       if (atrib.design_images_list) {
          imgArray = atrib.design_images_list.split(',');
       }

       for (var j = 0; j <= 4; j++) {
         if (imgArray[j]) {
            var url = imgArray[j];
            span.append($('<label>')
              .css({'background': 'url(' + url + ')',
                    'background-size': '100%'}));
         }
       }

       // Let the user know how many images are in the design.
       if (imgArray.length > 5) {
         var resultingCount = imgArray.length - 5;
         var verb = resultingCount == 1 ? 'images' : 'image';
         span.append($('<em>')
           .html('Plus ' + resultingCount + ' more ' + verb + '.'));
       }
       div.append(span);
     }
   },

   // Given a design object, add it to the current order.
   addExistingDesignToOrder: function(e) {

     // Get the index of the design within the search results.
     var id = e.currentTarget.id;
     var designIndex = e.currentTarget.parentElement.id

     // Create an object with a structure that the next function will expect;
     // the function typically accepts a jquery dom onclick event.
     var obj = {
       currentTarget : {
         id: designIndex
       }
     };

     // Get the actual design item.
     var item = duckburg.orders.existingImageSearchResults[id];
     $('.popupItemHolder').hide();
     $('.offClicker').hide();
     duckburg.orders.appendImagePickerForOrderForm(obj, item);
   },

   // Unstage a design from the current order.
   unstageItemFromOrder: function(e) {
     var parent = e.currentTarget.parentElement;
     $('#' + parent.id).remove();
   },

   // Iterate over all designs and set a readable design id.
   setDesignIdsForUI: function() {
     $('.designInFormDesignId').each(function(item) {
       var designId = '000' + String(item + 1);
       designId = designId.slice(designId.length - 3, designId.length);
       this.innerHTML = 'Design No.' + designId
       this.id = item + 1;
     });

     $('.designInFormRemoveButton').each(function(item) {
       this.id = item + 1;
     });
   },


   /**
    * SAVING FUNCTIONS FOR ORDERS
    *
    * The order will attempt to constantly updating itself.  There are many
    * functions that help this work seamlessly, and they are grouped here
    * together.
    *
    */

  // This function looks at all designs within the order and:
  //   1 - saves any changes made to the individual designs.
  //   2 - saves their information within the current order.
  storeAndSaveAllDesigns: function() {

    // For each design within the order, save the design detials.
    $('.designWithinOrderFormVariables').each(function(item) {
      duckburg.orders.saveDesignDetails(this, item);
    });
  },

  // Save the details of a design.
  saveDesignDetails: function(designInputFields, count) {

    // Id and object for the design.
    var id;
    var designObj = {};

    // Search through the child elements.  These elements are all hidden
    // inputs containing the information about a design.
    var kids = designInputFields.children;
    for (var i = 0; i < kids.length; i++) {
      var input = kids[i];

      // Look for the design id.
      if (input.id == 'design_id') {
        if (input.value != '') {
          id = input.value;
        }

      // Store key/values for each input id and its value.
      } else {
          designObj[input.id] = input.value;
      }
    }

    // If there is an id and it is not empty, this is an existing design that
    // can simply be updated.  Otherwise, it is a new design and must be
    // created.
    if (id && id != '') {
      duckburg.requests.updateDesign(id, designObj);
    } else {
      duckburg.orders.createNewDesign(designObj, count);
    }
  },

  // Given an object 'design' and the number of the design 'count', create
  // a new design.
  createNewDesign: function(design, count) {

    // Instantiate a parse Design object.
    var DbObject = Parse.Object.extend('dbDesign');
    var newItem = new DbObject();

    // Name and search string.
    var designName;
    var searchString = '';

    // Param count tells us how many parameters there are with actual values.
    var paramCount = 0;
    for (var param in design) {

      // Set a value in the new Parse object for each parameter.
      newItem.set(param, design[param]);

      // Count each parameter that carries a value.
      if (design[param] != '') {
        paramCount++;
      }
    }

    // In this case, all the parameters are blank, and there is nothing unique
    // such as images for sizes to save.
    if (paramCount == 0) {
      return;
    }

    // Try and assign the design the same name as the Catalog Item.
    $('.designInFormDesignName').each(function(item) {
      var idx = this.id.replace('designInFormDesignName_', '');
      if (idx == count + 1) {
        var name = this.value;
        if (name != '') {
          designName = name
        } else {
          var orderNumber = $('.orderFormOrderNumber').html();
          designName = orderNumber + ' ';
          $('.designInFormDesignId').each(function() {
            if (this.id == count + 1) {
              designName += this.innerHTML;
            }
          });
          $('.designInFormDesignName').each(function() {
            var idx = this.id.replace('designInFormDesignName_', '');
            if (idx == count + 1) {
              this.value = designName;
            }
          });
        }
      }
    });

    // Store the design name and search string.
    searchString += designName
    newItem.set('parse_search_string', searchString.toLowerCase());
    newItem.set('design_name', designName);

    // Save the dang thing.
    newItem.save(null, {
      success: function(result) {
        duckburg.orders.storeDesignDetails(result, count + 1);
      },
      error: function(error) {
        duckburg.errorMessage(error);
      }
    });
  },

  // Determine if/how many catalog items are showing.  If they are not saved,
  // create catalog items for them.
  storeAndSaveAllCatalogItems: function() {

    // Iterate over each open catalog item.  Store name last.  That way,
    // if name is the only parameter, we know if is not worth storing this
    // catalog item, as it has no content.
    $('.catalogItemWithinOrder').each(function(currentCount) {

      var itemId;
      var catalogItem = {};
      var paramCount = 0;

      // Pass over all child elements of a catalog item and get details from them.
      var kids = this.children;
      for (var i = 0; i < kids.length; i++) {

        var el = kids[i];

        // Store the catalog item number.  If it doesn't exist, a new catalog
        // item will be created.
        if (el.className == 'catalogItemId') {
          if (el.value != '') {
            itemId = el.value;
            paramCount++;
          }
        }

        // Get the product type.
        if (el.id == 'product_type') {

          if (el.value != '') {
              catalogItem.product_type = el.value;
              paramCount++;
          }
        }

        // Store the product color.
        if (el.className == 'designInFormProductColor') {
          if (el.value != '') {
            catalogItem.product_colors = el.value;
            paramCount++;
          }
        }

        // Store the product price.
        if (el.className == 'designInFormPiecePrice') {
          if (el.value != '') {
            catalogItem.product_price = el.value;
            paramCount++;
          }
        }

        // Store the product social price.
        if (el.className == 'designInFormSocialPrice') {
          if (el.value != '') {
            catalogItem.product_socialprice = el.value;
            paramCount++;
          }
        }

        // Store the product sale price.
        if (el.className == 'designInFormSalePrice') {
          if (el.value != '') {
            catalogItem.product_salepriceprice = el.value;
            paramCount++;
          }
        }

        // Get the pertinent design info.
        if (el.className == 'pertinentInfo') {
          for (var j = 0; j < el.children.length; j++) {
            var child = el.children[j];
            if (child.className == 'orderPertinentInfoHolder') {
              for (k = 0; k < child.children.length; k++) {
                var kid = child.children[k];
                if (kid.type == 'hidden') {
                  catalogItem[kid.id] = kid.value;
                }
              }
            }
          }
        }

        // Go within the design to get some items.
        if (el.className == 'orderFormImagePickerHolder') {
          for (var j = 0; j < el.children.length; j++) {
            var child = el.children[j];

            // Look for notes/description.
            if (child.className == 'designNotesWithinOrderForm') {
              catalogItem.product_description = child.value;
            }

            // Look to see if a design / design ID exists.
            if (child.className == 'designWithinOrderFormVariables') {
              for (var k = 0; k < child.children.length; k++) {
                var kid = child.children[k];
                if (kid.id == 'design_id') {
                  if (kid.value != '') {
                    catalogItem.design = kid.value;
                    paramCount++;
                  }
                }
              }
            }
          }
        }

        // Lastly, get/create the catalog Item name if neccessary.
        if (el.className == 'designInFormDesignName') {
          if (el.value != '') {
            catalogItem.item_name = el.value;
          } else {

            var orderName = $('.orderJobName').html();
            var orderNumber = $('.orderFormOrderNumber').html();
            var name = !orderName || orderName == '' ? orderNumber : orderName;
            name = name + ' Design No.' + (currentCount + 1);
            catalogItem.item_name = name;
          }
        }
      }

      // If no parameters have been collected, don't save it.
      if (paramCount == 0) {
        return;
      }

      // Send the catalog item info along to a helper function.  It will
      // determine if this is an item in need of creating or updating.
      duckburg.orders.saveOrUpdateCatalogItem(itemId, catalogItem, currentCount);
    });
  },

  // Given a catalog item, its id and location (count), updated or create
  // the item.
  saveOrUpdateCatalogItem: function(id, catalogItem, count) {
    count = count + 1;

    // If there is an id, it is an existing design.  Else we create one.
    if (id) {
      duckburg.orders.updateExistingCatalogItem(id, catalogItem, count);
    } else {
      duckburg.orders.saveNewCatalogItem(catalogItem, count);
    }

    // Take another pass at saving the entire order.
    duckburg.orders.saveGlobalOrderDetails();
  },

  // Update an existing catalog item.
  updateExistingCatalogItem: function(id, catalogItem, count) {

    // Instantiate a catalog item.
    var DbObject = Parse.Object.extend('dbCatalogItem');
    var query = new Parse.Query(DbObject);

    // Get the actual parse object by its ID.
    query.get(id, {
      success: function(result) {

        // Update the parameters of the existing Item that was just returned.
        for (var param in catalogItem) {
          result.set(param, catalogItem[param]);
          if (param == 'item_name') {
            result.set('parse_search_string', catalogItem[param].toLowerCase());
          }
        }

        // After existing item is updated, save it.
        result.save(null, {
          success: function(savedItem) {
            // updated catalog item
          },
          error: function(error) {
            // pass
          }
        });
      },
      error: function(error) {
        duckburg.errorMessage(error);
      }
    });
  },

  // Create a new catalog item.
  saveNewCatalogItem: function(catalogItem, count) {

    // Instantiate parse object for catalog item.
    var DbObject = Parse.Object.extend('dbCatalogItem');
    var newItem = new DbObject();

    // Store parameters in new object.
    var searchString = '';
    for (var param in catalogItem) {
      newItem.set(param, catalogItem[param]);
      if (param == 'item_name') {
        searchString += catalogItem[param];
      }
    }

    // Set a searchable string.
    newItem.set('parse_search_string', searchString.toLowerCase());

    // Save new object.
    newItem.save(null, {
      success: function(result) {

        // Set the id of the newly created item in a hidden field.
        duckburg.orders.setIdOfNewCatalogItem(result, count);
      },
      error: function(error) {
        duckburg.errorMessage(error);
      }
    });
  },

  // Set the id of a newly created catalog item in a hidden input in the UI.
  setIdOfNewCatalogItem: function(result, count) {

    // Find the correct catalog item for this newly created object.
    $('.catalogItemId').each(function() {
      var idx = this.id.replace('catalogItemId_', '');

      // Store the catalog item id.
      if (idx == count) {
        this.value = result.id;

        // Store the catalog item name.
        var name = result.attributes.item_name;
        $('.designInFormDesignName').each(function() {
          var idx = this.id.replace('designInFormDesignName_', '');
          if (idx == count) {
            this.value = name;
          }
        });
      }
    });
  },

  // A function called every click or keyup.  Saves any changes that have been
  // made to an order.
  autoSave: function() {

    // If we're not actual inside an order, this function is killed.
    if (!duckburg.orders.orderMode) {
      return;
    }

    // Clear the timer that is attempting to save the order.
    if (duckburg.orders.timerForSavingOrder) {
      window.clearInterval(duckburg.orders.timerForSavingOrder);
    }

    // With an initial timer, save the design info, then the catalog
    // item info.
    duckburg.orders.timerForSavingOrder = setTimeout(function() {

        duckburg.orders.storeAndSaveAllDesigns();
        duckburg.orders.storeAndSaveAllCatalogItems();
        duckburg.orders.saveGlobalOrderDetails();

    }, duckburg.orders.saveInterval);  // Pause so that saving isn't constant.
  },

  // Get the list of item ids (and sizes) for saving.
  getItemsForSaving: function() {
    var listOfItems = [];
    $('.catalogItemId').each(function() {

      var catId = this.value;

      var itemObj = {};
      itemObj.id = catId;

      // Get the value of the current design.
      var count = this.id.replace('catalogItemId_', '');

      // Add sizes to the item object.
      var sizeObj = {};
      var totalSizes = 0;
      $('.catItemWithinOrderSizeOptions').each(function(item) {
        var idx = this.id.replace('catItemWithinOrderSizeOptions_', '');
        if (idx == count) {
          var kids = this.children;
          for (var i = 0; i < kids.length; i++) {
            var el = kids[i];
            if (el.className == 'sizeLabelAndCountHolder') {
              var sizeBoxes = el.children;
              for (var j = 0; j < sizeBoxes.length; j++) {
                var sizeBox = sizeBoxes[j];
                if (sizeBox.className == 'sizeNameLabel') {
                  var sizeName = sizeBox.innerHTML.replace(':', '');
                }
                if (sizeBox.className == 'sizeInput') {
                  var quantity = sizeBox.value || 0;
                  sizeObj[sizeName] = quantity;
                  totalSizes += quantity;
                }
              }
            }
          }
        }
      });

      // Store a stringed version of the size object.
      itemObj.sizes = JSON.stringify(sizeObj);

      // As long as there is a cat id and/or sizes.
      if (catId == '' && totalSizes == 0) {
        // no need to save.
      } else {
        listOfItems.push(itemObj);
      }
    });

    // Return a list of items, which is a list of object.  Each object
    // contains the id and size list of a catalog item.
    return listOfItems;
  },

  // Save/update the current order.
  saveGlobalOrderDetails: function() {
    $('.orderSavedStatusNub')
      .attr('class', 'orderSavedStatusNub visible gray')
      .html('<i class="fa fa-circle-o-notch fa-spin"></i> saving order...');

    // Store a global that tells us that an active order is up.  This helps
    // us stop the user from navigating away from this page.
    if (!duckburg.orders.activeOrderExists) {
      duckburg.orders.activeOrderExists = true;
    }

    // Get parse object id.
    var parseId = $('#parse_order_id').val();

    // Create object for saving.
    var orderObject = {};

    // Get the human readable id.
    orderObject.readable_id = $('#readable_order_id').val();

    // Get the order name.
    orderObject.order_name = $('#order_job_name').val();

    // Get the due date.
    orderObject.due_date = $('#order_due_date').val();

    // Get the print date.
    orderObject.print_date = $('#order_print_date').val();

    // Set an order status.
    orderObject.order_status = $('.jobStatusField').html();

    // Get the catalog items for the orders.
    orderObject.items = duckburg.orders.getItemsForSaving();

    // Get the customer info for the order.  If none exists, make it an empty
    // list for easy evaluation below.
    orderObject.customers = $('#order_customer_object').val() || [];

    // If no customers and no items.
    if (!orderObject.items.length && !orderObject.customers.length) {

      duckburg.orders.hideSavingProgressNub();
      return;

    } else {

      // If there are customers OR items, and no Job name, ask the user
      // to choose a project name.
      if (!orderObject.order_name || orderObject.order_name == '') {

        // An item has been added, but its nothing yet, don't save.
        if (orderObject.items.length == 1 && orderObject.items[0] == '') {

          duckburg.orders.hideSavingProgressNub();
          return;
        }

        // The only required field once an order begins is the job name.
        // Force the user to enter one.
        var msg = 'Trying to save the order.  Please enter a Job Name up top.';
        duckburg.errorMessage(msg);
        $('.orderSavedStatusNub')
          .attr('class', 'orderSavedStatusNub visible red')
          .html('<i class="fa fa-warning"></i> issue saving');

        return;
      }
    }

    if (!duckburg.orders.savingOrder) {
      console.log(orderObject);
      // Note that an order is being saved (prevents same order from being
      // saved twice in an instant).
      duckburg.orders.savingOrder = true;

      if (parseId && parseId != '') {

        // Save an existing order's details.
        duckburg.orders.saveOrderDetails(parseId, orderObject);
      } else {

        // Create the new order.
        duckburg.orders.createNewOrder(orderObject);
      }
    }
  },

  hideSavingProgressNub: function() {
    // Do nothing, since nothing to save.
    $('.orderSavedStatusNub')
      .attr('class', 'orderSavedStatusNub invisible gray')
      .html('saving order...');

    // Order is no longer actively saving.
    duckburg.orders.activeOrderExists = false;
  },

  // Save an existing order's details.
  saveOrderDetails: function(parseId, orderObject) {

    // This should only fail on the first save.  Once we've loaded an
    // order, it is stored in this variable.
    if (!duckburg.orders.currentOrder) {

      // Instantiate a parse order object.
      var DbObject = Parse.Object.extend('dbOrder');
      var query = new Parse.Query(DbObject);

      // Get the order, and store it in the currentOrder global above.  Then,
      // we can recursively call this function.  This routine stops us from
      // having to fetch the order object from the db every time we want to
      // save it.  It turns saving an object into a 1 call routine.
      query.get(parseId, {
        success: function(result) {

          // Store the object globally and save the new details.
          duckburg.orders.currentOrder = result;
          duckburg.orders.saveOrderDetails(parseId, orderObject);
        },
        error: function(error) {
          errorCb(error.message);
        }
      });
    } else {

      // Finish the process of saving an order.
      duckburg.orders.finishSavingOrder(
          duckburg.orders.currentOrder, orderObject);
    }
  },

  // Create a new order.
  createNewOrder: function(orderObject) {

    // Instantiate a new parse order object.
    var DbObject = Parse.Object.extend('dbOrder');
    var newItem = new DbObject();

    // Create a new order with the info from the form.
    duckburg.orders.finishSavingOrder(newItem, orderObject);
  },

  // Save an order with the prase dbItem and an orderObject containing all the
  // values within the form.
  finishSavingOrder: function(dbItem, orderObject) {

    // Set the order parameters.
    for (var param in orderObject) {
      var val;

      // Stringify object params.
      if (typeof orderObject[param] == 'object') {
        val = JSON.stringify(orderObject[param]);
      } else {
        val = orderObject[param];
      }

      // Set the value.
      dbItem.set(param, val);

      // set the parse search string.
      if (param == 'order_name') {
        dbItem.set('parse_search_string', val.toLowerCase());
      }
    }

    // Save the order.
    dbItem.save(null, {
      success: function(result) {

        // Save the current order globally.
        duckburg.orders.currentOrder = result;

        // Set the hidden input which contains the order id.
        $('#parse_order_id').val(result.id);

        // User can now navigate away if they like, order is not 'actively'
        // being saved.
        duckburg.orders.activeOrderExists = false;

        // Now that order has finished saving, a new request to save/update
        // will not be blocked.
        duckburg.orders.savingOrder = false;

        // Wait 2 sec and then note that the order is updated.  Without this
        // timer, the notification nub updates a bit too frequently.  This way
        // if the user continues to type, the 'order saving' progress indicator
        // will appear constantly.
        setTimeout(function() {
          $('.orderSavedStatusNub')
            .attr('class', 'orderSavedStatusNub visible green')
            .html('<i class="fa fa-save"></i> order saved');
        }, 2000)

      },
      error: function(error) {
        duckburg.errorMessage(error);

        // Allow the order to be saved/updated.  This var, when set to true,
        // is blocking the order from being saved from other function calls.
        duckburg.orders.savingOrder = false;
      }
    });
  }
 };

// Listeners that will help the order autosave.
$(document).keypress(function(e) {
  duckburg.orders.autoSave();
});

$(document).click(function(e) {
  duckburg.orders.autoSave();
});
