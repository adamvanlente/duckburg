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

     // The order in which sizes should be displayed.  Sizes not inlcuded
     // in this list will be displayed at the end of the list.
     duckburg.orders.orderOfSizes = ['1T', '2T', '3T', '4T', 'YXXS', 'YXS',
        'YS', 'YM', 'YL', 'YXL', 'YXXL', 'XXXS', 'XXS', 'XS', 'S', 'M', 'L',
        'XL', '2XL', '2X', 'XXL', '3XL', '3X', 'XXXL', '4XL', '4X', 'XXXXL',
        '5XL', '5X', 'XXXXXL', '6X', '6XL', 'XXXXXXL'];

     // Set the basic holders for the form elements.
     duckburg.orders.setInitialFormElements();

     // Set a header that will include the due date, job name and order number.
     duckburg.orders.setInitialInfo();

     // Set area for adding customers.
     duckburg.orders.setCustomerInfo();

     // Set area for adding designs.
     duckburg.orders.setDesignInfo();

     // If orderId is passed, populate the form with the order details.
     if (orderId) {
       console.log('populate order from with order:', orderId);
     } else {
       duckburg.orders.setOrderNumber();
     }
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
           .attr('class', 'pertinentInfo'))
         .append($('<div>')
           .attr('class', 'customerInfo'))
         .append($('<div>')
           .attr('class', 'designInfo')));
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

     // Set the order number to a hidden form field.
     $('#readable_order_id').val(orderNumber);

     // Make a visible order number.
     $('.orderFormOrderNumber').html('Order Number: #' + orderNumber);
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
        console.log('detected as click on button', e)
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
     $('.openOrderCatalogItemHolder')
       .append($('<div>')
         .attr('class', 'catalogItemWithinOrder')
         .attr('id', 'design_no_' + designCount)
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
           .html('remove item')
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
   },

   // Append inputs for product type, color, price, etc.
   appendProductInfoInputs: function() {

     var designCount = $('.catalogItemWithinOrder').length;

     $('#design_no_' + designCount)

       // Button for adding product.  Stores the readable value, while the
       // hidden input below accepts the database Parse ID.
       .append($('<input>')
         .attr('class', 'designInFormProductName')
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
           duckburg.forms.currentlyCreatingItemWithType = 'dbCatalogItem';
           duckburg.objects.relatedObjectSelector(e, dbObj);
         })
       )

       // Append a hidden input that will actually store the value for the
       // product type.
       .append($('<input>')
         .attr('type', 'hidden')
         .attr('id', 'product_type'))

        // Input for design product number.
       .append($('<input>')
         .attr('class', 'designInFormProductNumber')
         .attr('type', 'text')
         .attr('placeholder', 'Product number')
         .prop('readonly', true)
         .attr('id', 'supplier_item_id_' + designCount)
       )

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
       if (!currentSizes[newSizeVal]) {
         currentSizes[newSizeVal] = 0;
       }
     }
     var parent = $('#' + sizeHolder.id);
     duckburg.orders.addSizesToAnOrderItem(count, currentSizes, parent);
   },



   appendSingleSizeOptionToDiv: function(parent, size, count, sizeCount) {
     parent
       .append($('<div>')
         .attr('id', 'size_' + size + '_' + count)
         .attr('class','sizeLabelAndCountHolder')
         .append($('<span>')
           .attr('class', 'sizeNameLabel')
           .html(size + ': '))
         .append($('<input>')
           .attr('class', 'sizeInput')
           .attr('placeholder', '0')
           .val(sizeCount))
         .append($('<span>')
           .attr('class', 'sizeRemoveButton')
           .html('<i class="fa fa-trash-o"></i>')
           .click(function(e) {
             $('#' + e.currentTarget.parentElement.id).remove();
           })));
   },

   appendDesignOptions: function(count) {

     count = count || $('.catalogItemWithinOrder').length;

      $('.orderFormImagePickerHolder').each(function(item) {
        if (item + 1 == count) {
          this.remove();
        }
      })

     // Drop the options into the appropriate div.
     $('.catalogItemWithinOrder').each(function(item) {
       if (item + 1 == count) {
         $('#' + this.id)
           .append($('<div>')
             .attr('class', 'orderFormImagePickerHolder')
             .attr('id', 'imagePicker_' + count)
             .html('')
             .append($('<button>')
               .attr('id', count)
               .html('<i class="fa fa-file"></i> new design')
               .attr('class', 'chooseNewDesignButton')
               .click(function(e) {
                 duckburg.orders.appendImagePickerForOrderForm(e);
               }))
             .append($('<button>')
               .attr('id', count)
               .html('<i class="fa fa-folder-open"></i> existing design')
               .attr('class', 'chooseExistingDesignButton')
               .click(function(e) {
                 duckburg.orders.launchExistingDesignFinder(e);
               })));
       }
     });
   },

   appendImagePickerForOrderForm: function(event, objectToInsert) {

     var counter = event.currentTarget.id;
     var imgPicker = duckburg.orders.orderImagePicker(counter);

     // In this same div, add hidden fields for every aspect of a design.
     // If an object to insert is passed below, set all the info to that item.
     // Else, set it all blank, and start updating order, which will
     // look for designs with no ids, and make designs out of them.

     $('.orderFormImagePickerHolder').each(function(item) {

       var divNumber = this.id.replace('imagePicker_', '');

       if (divNumber == counter) {
         $('#' + this.id)
           .html('')
           .append(imgPicker)
           .append($('<button>')
             .attr('class', 'resetDesignImagesButton')
             .attr('id', counter)
             .html('reset design images')
             .click(function(e) {
               duckburg.orders.appendDesignOptions(e.currentTarget.id);
             }))
           .append($('<div>')
             .attr('class', 'designImagesWithinOrderForm')
             .attr('id', 'designImagesWithinOrderForm_' + counter))
           .append($('<textarea>')
             .attr('class', 'designNotesWithinOrderForm')
             .attr('id', 'designNotesWithinOrderForm_' + counter)
             .attr('placeholder', 'Design notes'))
           .append($('<div>')
             .attr('class', 'designWithinOrderFormVariables')
             .attr('id', 'designWithinOrderFormVariables_' + counter)
             .append($('<input>')
               .attr('type', 'hidden')
               .attr('id', 'design_id'))
             .append($('<input>')
               .attr('type', 'hidden')
               .attr('id', 'design_images_list'))
             .append($('<input>')
               .attr('type', 'hidden')
               .attr('id', 'design_name'))
             .append($('<input>')
               .attr('type', 'hidden')
               .attr('id', 'catalog_item_notes'))
             .append($('<input>')
               .attr('type', 'hidden')
               .attr('id', 'design_count')));
       }
     });

     if (objectToInsert) {
       duckburg.orders.addDesignToOrderWithObject(objectToInsert, counter);
     }
   },


   addDesignToOrderWithObject: function(design, count) {
     var atrib = design.attributes;

     // Add images to the order form.
     var imgArray = atrib.design_images_list.split(',');

     duckburg.orders.appendImagesToDesignImageHolder(imgArray, count);
     duckburg.orders.storeDesignDetails(design, count);
   },

   appendImagesToDesignImageHolder: function(imgArray, count) {

     $('.designImagesWithinOrderForm').each(function(item) {
       var divNumber = this.id.replace('designImagesWithinOrderForm_', '');
       if (divNumber == count) {

         // Clear out the image holder.
         $('#' + this.id).html('');

         for (var i = imgArray.length - 1; i >= 0; i--) {
           var url = imgArray[i];
           $('#' + this.id)
             .append($('<span>')
              .attr('id', 'design_' + count + '_image_' + i)
              .css({'background': 'url(' + url + ')',
                    'background-size': '100%'})
              .append($('<label>')
                .attr('class', 'removeDesignImageWithinOrder')
                .attr('id', count)
                .html('remove')
                .click(function(e) {
                  duckburg.orders.removeDesignImageWithinOrder(e);
                }))
              .append($('<label>')
                .attr('class', 'viewDesignImageWithinOrder')
                .attr('id', count)
                .html('view')
                .click(function(e) {
                  duckburg.orders.viewDesignImageWithinOrder(e);
                })));

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

   removeDesignImageWithinOrder: function(e) {
     var el = e.currentTarget;
     var count = el.id;

     var parent = el.parentElement;

     var bg = $(parent).css('background-image');
     bg = String(bg);
     bg = bg.replace('url(', '');
     bg = bg.replace(')', '');

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
       .change(function(e) {
         duckburg.requests.files.save(e.currentTarget, function(result, input) {

           var inputCounter = input.id.replace('newInputFilePicker_', '')

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

                    duckburg.orders.appendImagesToDesignImageHolder(
                        imgArray, inputCounter);
                    el.value = imgArray.join(',');
                 }
               }
             }
           });
         })
       });

     duckburg.orders.storeAndSaveAllDesigns();
     return imgPicker;
   },

   // Launch a finder for choosing an existing design.
   launchExistingDesignFinder: function(e) {
     var id = e.currentTarget.id;

     $('.offClicker')
       .show()
       .click(function() {
         $('.popupItemHolder').hide();
         $('.offClicker').hide();
       });

     $('.popupItemHolder')
       .show()
       .html('')
       .append($('<input>')
         .attr('type', 'text')
         .attr('class', 'existingDesignSearchInput')
         .attr('placeholder', 'Search for a design')
         .keyup(function(e) {
           duckburg.orders.searchForExistingDesigns(e);
         }))
       .append($('<div>')
         .attr('class', 'existingDesignSearchResults')
         .attr('id', id)
         .append($('<em>')
           .html('search for an exsiting design')));
   },

   searchForExistingDesigns: function(event) {
     var val = event.currentTarget.value;

     if (duckburg.orders.existingDesignSearchTimeout) {
       window.clearInterval(duckburg.orders.existingDesignSearchTimeout);
     }

     duckburg.orders.existingDesignSearchTimeout = setTimeout(function() {

      $('.existingDesignSearchResults')
        .html('')
        .append($('<em>')
          .html('searching designs...'));


       if (val == '' || !val) {
         $('.existingDesignSearchResults')
           .html('')
           .append($('<em>')
             .html('search for an exsiting design'));
         return false;
       }

       duckburg.requests.findObjects('dbDesign',
         function(results) {
           if (results.length == 0 || !results) {
             $('.existingDesignSearchResults')
               .html('')
               .append($('<em>')
                 .html('no designs found for that search'));
             return false;
           } else {
             duckburg.orders.renderExistingDesignSearchResults(results)
           }
         },
         duckburg.errorMessage,
         val.toLowerCase());
     }, 200);

   },

   renderExistingDesignSearchResults: function(results) {

     duckburg.orders.existingImageSearchResults = results;

     var div = $('.existingDesignSearchResults');
     var id = div.attr('id');
     div.html('');

     for (var i = 0; i < results.length; i++) {
       var result = results[i];
       var atrib = result.attributes;
       var span = $('<span>')
           .attr('id', i)
           .click(function(e) {
             duckburg.orders.addExistingDesignToOrder(e);
           })
           .append($('<em>')
             .html(atrib.design_name));

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

       if (imgArray.length > 5) {
         var resultingCount = imgArray.length - 5;
         var verb = resultingCount == 1 ? 'images' : 'image';
         span.append($('<em>')
           .html('Plus ' + resultingCount + ' more ' + verb + '.'));
       }
       div.append(span);
     }
   },

   addExistingDesignToOrder: function(e) {

     var id = e.currentTarget.id;
     var designIndex = e.currentTarget.parentElement.id
     var obj = {
       currentTarget : {
         id: designIndex
       }
     };

     var item = duckburg.orders.existingImageSearchResults[id];

     $('.popupItemHolder').hide();
     $('.offClicker').hide();

     duckburg.orders.appendImagePickerForOrderForm(obj, item);
   },

   // Unstage a design from the current order.
   unstageItemFromOrder: function(e) {
     var id = e.currentTarget.id;
     $('.catalogItemWithinOrder').each(function(item) {
       var divNumber = this.id.replace('design_no_', '');
       if (divNumber == id) {
         $('#' + this.id).remove();
       }
     });
   },

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
    */

  // This function looks at all designs within the order and:
  //   1 - saves any changes made to the individual designs.
  //   2 - saves their information within the current order.
  storeAndSaveAllDesigns: function() {

    $('.designWithinOrderFormVariables').each(function(item) {
      duckburg.orders.saveDesignDetails(this, item);
    });
  },

  saveDesignDetails: function(designInputFields, count) {
    var id;
    var designObj = {};
    var kids = designInputFields.children;
    for (var i = 0; i < kids.length; i++) {
      var input = kids[i];
      if (input.id == 'design_id') {
        if (input.value != '') {
          id = input.value;
        }
      } else {
          designObj[input.id] = input.value;
      }
    }



    if (id && id != '') {
      duckburg.requests.updateDesign(id, designObj);
    } else {
      duckburg.orders.createNewDesign(designObj, count);
    }
  },

  createNewDesign: function(design, count) {
    var DbObject = Parse.Object.extend('dbDesign');
    var newItem = new DbObject();

    var designName;
    var searchString = '';
    var paramCount = 0;
    for (var param in design) {
      newItem.set(param, design[param]);
      paramCount++;
      if (param == 'design_notes') {
        searchString += design[param];
      }
    }

    // If the design has nothing (but perhaps a name), don't create it.
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


        // TODO store the sizes
        // $('.catItemWithinOrderSizeOptions').each(function(item) {
        //   var idx = this.id.replace('catItemWithinOrderSizeOptions_', '');
        //   if (idx == count) {
        //     $('#' + this.id)
        //       .append(parent)
        //   }
        // });

        // 'item_expiration_date':
        // 'product_ishidden':
        // 'product_isindexed':
        // 'product_sizes':

        // Maybe do not need
        // 'product_category':
        // 'product_family':
        // 'product_store':
        // 'product_tags':

      }

      // If no parameters have been collected, don't save it.
      if (paramCount == 0) {
        return;
      }

      duckburg.orders.saveOrUpdateCatalogItem(itemId, catalogItem, currentCount);
    });

  },

  saveOrUpdateCatalogItem: function(id, catalogItem, count) {
    count = count + 1;
    if (id) {
      duckburg.orders.updateExistingCatalogItem(id, catalogItem, count);
    } else {
      duckburg.orders.saveNewCatalogItem(catalogItem, count);
    }

    // Take another pass at saving the entire order.
    duckburg.orders.saveGlobalOrderDetails();
  },

  updateExistingCatalogItem: function(id, catalogItem, count) {

    // Build a query from the object type.
    var DbObject = Parse.Object.extend('dbCatalogItem');
    var query = new Parse.Query(DbObject);

    // Perform the queries and continue with the help of the callback functions.
    query.get(id, {
      success: function(result) {

        // Update the parameters of the existing Item.
        for (var param in catalogItem) {
          result.set(param, catalogItem[param]);
          if (param == 'item_name') {
            result.set('parse_search_string', catalogItem[param].toLowerCase());
          }
        }

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

  saveNewCatalogItem: function(catalogItem, count) {
    // Instantiate parse object.
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
    newItem.set('parse_search_string', searchString.toLowerCase());

    // Save new object.
    newItem.save(null, {
      success: function(result) {
        $('.catalogItemId').each(function() {
          var idx = this.id.replace('catalogItemId_', '');
          if (idx == count) {
            this.value = result.id;
            // saved catalog item
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
      error: function(error) {
        duckburg.errorMessage(error);
      }
    });
  },

  autoSave: function() {

    if (!duckburg.orders.orderMode) {
      return;
    }

    // Clear the one second timer that is attempting to save the order.
    if (duckburg.orders.timerForSavingOrder) {
      window.clearInterval(duckburg.orders.timerForSavingOrder);
    }

    // With an initial timer, save the design info, then the catalog
    // item info.
    duckburg.orders.timerForSavingOrder = setTimeout(function() {
        duckburg.orders.storeAndSaveAllDesigns();
        duckburg.orders.storeAndSaveAllCatalogItems();
        duckburg.orders.saveGlobalOrderDetails();
    }, 1000);
  },

  // Get the list of item ids (and sizes) for saving.
  getItemsForSaving: function() {
    var listOfItems = [];
    $('.catalogItemId').each(function() {
      listOfItems.push(this.value);
    });
    return listOfItems;
  },

  // Save/update the current order.
  saveGlobalOrderDetails: function() {
    $('.orderSavedStatusNub')
      .attr('class', 'orderSavedStatusNub visible gray')
      .html('saving order...');
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

    // Get the catalog items for the orders.
    orderObject.items = duckburg.orders.getItemsForSaving();

    // Get the customer info for the order.
    orderObject.customers = $('#order_customer_object').val();


    // If there are no items or customers, no use trying to auto save.
    if (orderObject.items.length == 0 && orderObject.customers.length == 0) {

      // Do nothing, since nothing to save.
      $('.orderSavedStatusNub')
        .attr('class', 'orderSavedStatusNub invisible gray')
        .html('saving order...');
      return;
    } else {

      // If there are customers OR items, and no Job name, ask the user
      // to choose a project name.
      if (!orderObject.order_name || orderObject.order_name == '') {

        // An item has been added, but its nothing yet, don't save.
        if (orderObject.items.length == 1 && orderObject.items[0] == '') {

          // Do nothing, since nothing to save.
          $('.orderSavedStatusNub')
            .attr('class', 'orderSavedStatusNub invisible gray')
            .html('saving order...');
          return;
        }

        var msg = 'Trying to save the order.  Please enter a Job Name up top.';
        duckburg.errorMessage(msg);
        $('.orderSavedStatusNub')
          .attr('class', 'orderSavedStatusNub visible red')
          .html('<i class="fa fa-warning"></i> issue saving');

        return;
      }
    }

    if (parseId && parseId != '') {
      duckburg.orders.saveOrderDetails(parseId, orderObject);
    } else {
      duckburg.orders.createNewOrder(orderObject);
    }
  },

  saveOrderDetails: function(parseId, orderObject) {

    if (!duckburg.orders.currentOrder) {

      // Grab the current order and store it globally.
      var DbObject = Parse.Object.extend('dbOrder');
      var query = new Parse.Query(DbObject);

      // Get the item and recursively call this function.
      query.get(parseId, {
        success: function(result) {
          duckburg.orders.currentOrder = result;
          duckburg.orders.saveOrderDetails(parseId, orderObject);
        },
        error: function(error) {
          errorCb(error.message);
        }
      });
    } else {
      duckburg.orders.finishSavingOrder(
          duckburg.orders.currentOrder, orderObject);
    }
  },

  // Create a new order.
  createNewOrder: function(orderObject) {

    var DbObject = Parse.Object.extend('dbOrder');
    var newItem = new DbObject();
    duckburg.orders.finishSavingOrder(newItem, orderObject);
  },

  finishSavingOrder: function(newItem, orderObject) {
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
      newItem.set(param, val);

      // set the parse search string.
      if (param == 'order_name') {
        newItem.set('parse_search_string', val.toLowerCase());
      }
    }

    // Save the dang thing.
    newItem.save(null, {
      success: function(result) {
        duckburg.orders.currentOrder = result;
        $('#parse_order_id').val(result.id);
        $('.orderSavedStatusNub')
          .attr('class', 'orderSavedStatusNub visible green')
          .html('<i class="fa fa-save"></i> order saved');
      },
      error: function(error) {
        duckburg.errorMessage(error);
      }
    });
  }
 };


/*
 * New order form.  Don't open if order form is open.
 */
$('.menuAddNewOrderButton').click(function() {
  var display = $('.orderForm').css('display');
  if (display == 'block') {
    console.log('order form is already showing!');
  } else {
    duckburg.orders.launchForm();
  }
});

// Listeners that will help the order autosave.
$(document).keypress(function(e) {
  duckburg.orders.autoSave();
});

$(document).click(function(e) {
  duckburg.orders.autoSave();
});
