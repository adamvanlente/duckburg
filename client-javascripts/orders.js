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

   launchForm: function(orderId) {

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
     }
   },

   // Set a header: due date, order number and name.
   setInitialInfo: function() {

     var parent = $('.orderDueDateAndName');

     // Get an incrememnted, readble order number for the order.
     parent.append($('<span>')
       .attr('class', 'orderFormOrderNumber'));

     // Set an order number.
     parent.append($('<input>')
       .attr('type', 'hidden')
       .attr('name', 'order_form_field')
       .attr('id', 'order_number'));
     duckburg.orders.setOrderNumber();

     // Set a due date field.
     parent.append($('<label>')
       .html('Due:'));
     parent.append($('<input>')
       .attr('type', 'text')
       .attr('name', 'order_form_field')
       .attr('class', 'orderDueDate')
       .attr('placeholder', 'due date')
       .attr('id', 'order_due_date'));

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

   setOrderNumber: function() {
      var OrderObject = Parse.Object.extend("dbOrder");
      var query = new Parse.Query(OrderObject);
      query.count({
        success: function(count) {
          duckburg.orders.placeOrderNumberInUI(count);
        },
        error: function(error) {
          console.log(error);
        }
      });
   },

   placeOrderNumberInUI: function(count) {

     // Set a 6 digit order number.
     var orderNumber = '0000000' + String(count + 1);
     orderNumber =
         orderNumber.slice(orderNumber.length - 6, orderNumber.length);

     // Set the order number to a hidden form field.
     $('#order_form_field').val(orderNumber);

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

     parent.append($('<button>')
      .attr('class', 'addNewCustomerToOrderButton')
      .click(function() {
        duckburg.orders.addNewCustomerToOrder();
      })
      .html('<i class="fa fa-plus"></i> add customer'))

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

   chooseCustomerForOrder: function(e) {
     $('.offClicker').hide();
     $('.popupItemHolder').hide();
     var custList = duckburg.orders.listOfSearchedCustomers;
     var customer = custList[e.currentTarget.id];
     duckburg.orders.addCustomerToOrder(customer);
   },

   // Add a customer to an open order.
   addCustomerToOrder: function(customer, shipTo, billTo) {
     var attribs = customer.attributes;
     var phone =
        attribs.phone_number != '' ? attribs.phone_number : '(no phone)';
     var email =
        attribs.email_address != '' ? attribs.email_address : '(no email)';

     var custIndex = 0;
     $('.customerWithinOrder').each(function() {
       custIndex++;
     });

     shipTo = shipTo || custIndex == 0;
     billTo = billTo || custIndex == 0;

     $('.customerInfo')
       .append($('<span>')
         .attr('class', 'customerWithinOrder')
         .attr('id', customer.id)
         .append($('<span>')
           .attr('class', 'cwoName')
           .html(attribs.first_name + ' ' + attribs.last_name))
        .append($('<span>')
          .attr('class', 'cwoPhone')
          .html(phone))
        .append($('<span>')
          .attr('class', 'cwoEmail')
          .html(email))
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
        .append($('<button>')
          .attr('class', 'cwoEdit')
          .html('edit')
          .attr('id', custIndex)
          .click(function(e) {
            duckburg.orders.editCustomerWithinOrder(e);
          }))
        .append($('<button>')
          .attr('class', 'cwoRemove')
          .html('remove')
          .attr('id', custIndex)
          .click(function(e) {
            duckburg.orders.removeCustomerFromOrder(e);
          }))

          );
      duckburg.orders.updateCurrentCustomers();
   },

   updateCurrentCustomers: function() {

     // Holder for list of customers.
     var customers = [];

     var totalCustomers = $('.customerWithinOrder').length;

     // Iterate over selected customers.
     $('.customerWithinOrder').each(function(item) {
        var custObject = {};
        custObject.id = this.id;

        // Is this the shipping/billing customer?
        var isShip;
        var isBill;

        var kids = this.children;
        for (var kid in kids) {
          var el = kids[kid];

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

   removeCustomerFromOrder: function(event) {
     var index = event.currentTarget.id;

     $('.customerWithinOrder').each(function(item) {
        if (item == index) {
          this.remove();
        }
     });

     duckburg.orders.updateCurrentCustomers();
   },

   editCustomerWithinOrder: function(event) {
     duckburg.orders.addNewCustomerToOrder();

     var id = event.currentTarget.id;
     var customer = duckburg.orders.currentOrderCustomers[id];
     duckburg.requests.quickFind('dbCustomer',
       function(result) {
         duckburg.orders.populateNewCustomerForm(result);
       },
       duckburg.errorMessage,
       customer.id);
   },

   populateNewCustomerForm: function(customer) {

     // Store editing customer.
     duckburg.forms.currentlyEditingObject = customer;

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

   // Adding designs.
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

     var formDiv = $('.catalogItemWithinOrder');
     var model = duckburg.models['dbCatalogItem'];
     var values = model.values;

     var designCount = $('.catalogItemWithinOrder').length;

     $('.openOrderCatalogItemHolder')
       .append($('<div>')
         .attr('class', 'catalogItemWithinOrder')
         .attr('id', 'design_no_' + (designCount + 1))
         .append($('<span>')
           .attr('class', 'designInFormDesignId'))

         // Input for the name of the catalog item.
         .append($('<input>')
           .attr('type', 'text')
           .attr('class', 'designInFormDesignName')
           .attr('placeholder', 'Name of item'))

         // Button for removing (unstaging) the design from the order.
         .append($('<button>')
           .attr('class', 'designInFormRemoveButton')
           .html('remove item from order')
           .click(function(e) {
             duckburg.orders.unstageItemFromOrder(e);
           })));

     // Append inputs for product details and product price.
     duckburg.orders.appendProductInfoInputs();

     // Append two design choices: new or existing
     duckburg.orders.appendDesignOptions();

     // Set ids for each present design.
     duckburg.orders.setDesignIdsForUI();
   },

   appendProductInfoInputs: function() {

     var designCount = $('.catalogItemWithinOrder').length;

     $('#design_no_' + designCount)

       .append($('<input>')
         .attr('class', 'designInFormProductName')
         .attr('type', 'text')
         .attr('placeholder', 'Add product')
         .prop('readonly', true)
         .attr('id', 'product_type_visible_readonly')
         .click(function(e) {
           duckburg.orders.lastClickedProductButton = e.currentTarget;
           var dbObj =
               duckburg.models['dbCatalogItem'].values['product_type']['dbObject'];
           duckburg.forms.currentlyCreatingItemWithType = 'dbCatalogItem';
           duckburg.objects.relatedObjectSelector(e, dbObj);
         })
       )

       // Append a hidden input that will actually store the value.
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

       // Standard price
       .append($('<input>')
         .attr('class', 'designInFormSalePrice')
         .attr('type', 'text')
         .attr('placeholder', 'Sale price')
       )

       // Standard price
       .append($('<input>')
         .attr('class', 'designInFormSocialPrice')
         .attr('type', 'text')
         .attr('placeholder', 'Social price')
       );
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
               .html('<i class="fa fa-plus"></i> new design')
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
       if ((item + 1) == counter) {
         $('#' + this.id)
           .html('')
           .append(imgPicker)
           .append($('<button>')
             .attr('class', 'resetDesignImagesButton')
             .attr('id', counter)
             .html('reset design')
             .click(function(e) {
               duckburg.orders.appendDesignOptions(e.currentTarget.id);
             }))
           .append($('<div>')
             .attr('class', 'designWithinOrderFormVariables')
             .append($('<input>')
               .attr('type', 'hidden')
               .attr('id', 'design_image_list'))
             .append($('<input>')
               .attr('type', 'hidden')
               .attr('id', 'design_name'))
             .append($('<input>')
               .attr('type', 'hidden')
               .attr('id', 'design_notes'))
             .append($('<input>')
               .attr('type', 'hidden')
               .attr('id', 'design_count')));
       }
     });

     if (objectToInsert) {
       console.log('with obj', objectToInsert);
     }

   },

   // Image picker to add images to a design.
   orderImagePicker: function(count) {

     // Create image picker.
     var imgPicker = $('<input>')
       .attr('type', 'file')
       .attr('id', 'newInputFilePicker_' + count)
       .attr('class', 'editingCatalogImageDesignPicker')
       .change(function(e) {
         duckburg.requests.files.save(e.currentTarget, function(results) {

           // Update the image listing.
           console.log(results);
         })
       });

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

       var imgArray = atrib.design_images_list.split(',');
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
     console.log('unstage', id + 'th', 'design from order');
   },


// 'item_name':
// 'product_type'
// 'design'
// 'product_sizes'
// 'product_colors'
// 'product_category'
// 'product_price'
// 'product_saleprice'
// 'product_socialprice'
// 'product_description'
// 'product_family'
// 'product_store'
// 'product_tags'
// 'item_expiration_date'
// 'product_ishidden'
// 'product_isindexed'


   setDesignIdsForUI: function() {
     $('.designInFormDesignId').each(function(item) {
       var designId = '000' + String(item + 1);
       designId = designId.slice(designId.length - 3, designId.length);
       this.innerHTML = 'Design No.' + designId
       this.id = item;
     });

     $('.designInFormRemoveButton').each(function(item) {
       this.id = item;
     });
   }
 };

// Keeping track of fields that comprise an order
// order_number *order number
// order_customer_object  *object describing customers
// order_due_date
// order_print_date
// order_job_name




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


// Set some global timeout and save order every time something is touched.
$(document).keypress(function(e) {
  // console.log('something was pressed');
});

$(document).click(function(e) {
  // console.log('something was clicked');
});
