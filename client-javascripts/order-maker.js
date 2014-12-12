duckburg = duckburg || {};

/**
 * @TEMP module for transporting old RD orders to new system.
 *
 * TODO need to auto-assign shirt types when transferring for real.  Logic shoul
 *      exist for testing, but it requires having all products in db
 *
 * TODO carry over color count?
 *
 * TODO stop dumping in sizes with 0 or null as value.
 *
 */
duckburg.orderMaker = {

  index: 0,

  // Loads the orders and makes orders with them.
  load: function() {

    var i = duckburg.orderMaker.index;

    if (duckburg.oldOrderData[i]) {
      duckburg.orderMaker.createOrder(duckburg.oldOrderData[i]);
      duckburg.orderMaker.index++;
      setTimeout(function() {
        duckburg.orderMaker.load();
      }, 2500);
    } else {
      console.log('done');
    }
  },

  // Master function for creating a new order.
  createOrder: function(order) {

    duckburg.orderMaker.confirmOrderIsNew(order);

  },

  // Confirms that an order is new.
  confirmOrderIsNew: function(order) {

    // Build a query from the object type.
    var DbObject = Parse.Object.extend('dbOrder');
    var query = new Parse.Query(DbObject);

    query.matches('old_db_id', order.old_db_id);

    // Perform the queries and continue with the help of the callback functions.
    query.find({
      success: function(results) {
        if (results.length > 0) {
          console.log('skipping an order that exists', order.old_db_id);
        } else {
          duckburg.orderMaker.proceedWithNewOrderCreateCustomer(order);
        }
      },
      error: function(result, error) {
        console.log('error checking if order exists', order.old_db_id)
      }
    });
  },

  // Order does not exists in db, start making it by creating a customer..
  proceedWithNewOrderCreateCustomer: function(order) {
    if (order.customer) {

      // First Search to see if customer exists.
      var DbObject = Parse.Object.extend('dbCustomer');
      var query = new Parse.Query(DbObject);

      query.matches('first_name', order.customer.first_name);
      query.matches('last_name', order.customer.last_name);

      // Perform the queries and continue with the help of the callback functions.
      query.find({
        success: function(results) {
          if (results.length > 0) {
            console.log('this customer exists',
                order.customer.first_name, order.customer.last_name,
                'so using the existing ID');
            var cust = results[0];
            duckburg.orderMaker.continueWithCustomer(cust, order);
          } else {


            var DbObject = Parse.Object.extend('dbCustomer');
            newItem = new DbObject();

            // Set the properties
            var searchString = '';
            for (var param in order.customer) {
              var val = order.customer[param];
              newItem.set(param, val);
              searchString += val;
            }
            newItem.set('parse_search_string', searchString.toLowerCase());

            // Save the dang thing.
            newItem.save(null, {
              success: function(result) {
                duckburg.orderMaker.continueWithCustomer(result, order);
              },

              error: function(result, error) {
                console.log('error saving customer', error.message);
              }
            });


          }
        },
        error: function(result, error) {
          console.log('error checking if order exists', order.old_db_id)
        }
      });

    } else {
      console.log('something is wrong with this customer', order.old_db_id);
    }
  },

  // Continue making the order now that a customer has been created.
  continueWithCustomer: function(parseCust, order) {

    duckburg.requests.countObjects('dbOrder', function(count) {

      count++;
      var orderId = '000000' + count;
      orderId = orderId.slice(orderId.length - 6, orderId.length);

      var DbObject = Parse.Object.extend('dbOrder');
      var parseOrder = new DbObject();

      var customer = [{
        id: parseCust.id,
        isShip: true,
        isBill: true
      }];

      var taxed = order.is_taxed == '0.06'

      var order_status = 'completed';

      order.order_status = order.order_status.toLowerCase();

      if (order.order_status == 'archive') {
        order_status = 'archived';
      }

      if (order.order_status == 'active') {
        order_status = 'open';
      }

      if (order.order_status == 'placed') {
        order_status = 'approved';
      }

      if (order.order_status == 'QUOTE') {
        order_status = 'quote';
      }

      if (order.order_status == 'shirts ordered') {
        order_status = 'ordered';
      }

      if (order.order_status == 'shirts received') {
        order_status = 'received';
      }

      parseOrder.set('customers', JSON.stringify(customer));
      parseOrder.set('is_taxed', taxed);
      parseOrder.set('old_db_id', order.old_db_id);
      parseOrder.set('order_name', order.name);
      parseOrder.set('order_status', order_status);

      var due_date = new Date(order.due_date);
      parseOrder.set('due_date', due_date);

      // Initially set it a fixed number of days ahead.
      var printDate = duckburg.utils.addDaysToDate(due_date,
        duckburg.utils.setPrintDateBackAutomatically)

      // If the new print_date is on a Sunday or Monday, force it to be
      // on the Friday (do not set print dates on the weekend).
      var day = printDate.getDay();
      if (day == 0) {
        printDate = duckburg.utils.addDaysToDate(printDate, -2)
      }
      if (day == 6) {
        printDate = duckburg.utils.addDaysToDate(printDate, -1)
      }

      parseOrder.set('print_date', printDate);
      parseOrder.set('readable_id', orderId);

      var c = parseCust.attributes;
      parseOrder.set('cust_name', (c.first_name + ' ' + c.last_name));
      parseOrder.set('cust_phone', c.phone_number);
      parseOrder.set('cust_email', c.email_address);

      order.order_summary.payments =
        (order.order_summary.final_total - order.order_summary.balance).toFixed(2);

      parseOrder.set('order_summary', JSON.stringify(order.order_summary));

      var searchString = order.name + order.old_db_id;
      parseOrder.set('parse_search_string', searchString.toLowerCase());

      // Save the order with parse and handle success/error.
      parseOrder.save().then(

      function(newParseOrder) {
        duckburg.orderMaker.continueToDesignsWithNewOrder(newParseOrder, order);
        duckburg.orderMaker.logOrderPayment(newParseOrder.id, order);
      },

      function(error) {
        console.log('error saving order', order.old_db_id, error.message);
      });

    });
  },

  logOrderPayment: function(id, order) {

    var amt = order.order_summary.payments;

    if (amt == 0 || amt == '0.00') {
      return;
    }

    // Instantiate order log.
    var DbObject = Parse.Object.extend('dbOrderPayment');
    newItem = new DbObject();

    // Store order id, json and current user.
    newItem.set('order_id', id);
    newItem.set('amount', amt);
    newItem.set('method', 'cash');
    newItem.set('user', 'from old database');

    // Save the dang thing.
    newItem.save(null, {
      success: function(result) {
        //
      },
      error: function(result, error) {
        console.log('error adding payment', error.message);
      }
    });

  },

  // Now that there's a new order, start saving the design info.
  continueToDesignsWithNewOrder: function(newOrder, order) {

    duckburg.orderMaker.currentOrder = newOrder;

    if (order.cat_item_one) {

      var ci = order.cat_item_one;
      if (ci.design_images_list == '' && ci.item_name == '') {
        duckburg.orderMaker.makeCatalogItem('', ci);
      } else {
        duckburg.orderMaker.makeDesign(ci);
      }
    }

    if (order.cat_item_two) {

      var ctwo = order.cat_item_two;
      if (ctwo.design_images_list == '' && ctwo.item_name == '') {
        duckburg.orderMaker.makeCatalogItem('', ctwo);
      } else {
        duckburg.orderMaker.makeDesign(ctwo);
      }
    }

    if (order.cat_item_three) {

      var cthree = order.cat_item_three;
      if (cthree.design_images_list == '' && cthree.item_name == '') {
        duckburg.orderMaker.makeCatalogItem('', cthree);
      } else {
        duckburg.orderMaker.makeDesign(cthree);
      }
    }

    if (order.cat_item_four) {

      var cfour = order.cat_item_four;
      if (cfour.design_images_list == '' && cfour.item_name == '') {
        duckburg.orderMaker.makeCatalogItem('', cfour);
      } else {
        duckburg.orderMaker.makeDesign(cfour);
      }
    }


  },

  // Make a design
  makeDesign: function(item) {

    var DbObject = Parse.Object.extend('dbDesign');
    var parseDesign = new DbObject();

    parseDesign.set('design_name', item.item_name);
    parseDesign.set('design_images_list', item.design_images_list);
    parseDesign.set('parse_search_string', item.item_name.toLowerCase());

    // Save the order with parse and handle success/error.
    parseDesign.save().then(

      function(newDesign) {
        duckburg.orderMaker.makeCatalogItem(newDesign.id, item);
      },

      function(error) {
        console.log('error saving design', item.item_name, error.message);
      });
  },

  // Make a catalog item.
  makeCatalogItem: function(id, ci) {

    var DbObject = Parse.Object.extend('dbCatalogItem');
    var parseCatalogItem = new DbObject();

    parseCatalogItem.set('item_name', ci.item_name);
    parseCatalogItem.set('parse_search_string', ci.item_name.toLowerCase());
    parseCatalogItem.set('product_colors', ci.product_colors);
    parseCatalogItem.set('product_description', ci.product_description);
    parseCatalogItem.set('product_ishidden', ci.product_ishidden);
    parseCatalogItem.set('product_isindexed', ci.product_isindexed);
    parseCatalogItem.set('product_price', ci.product_price);
    parseCatalogItem.set('product_socialprice', ci.product_socialprice);
    parseCatalogItem.set('product_type_visible', ci.product_type_visible);
    parseCatalogItem.set('design_images_list', ci.design_images_list);
    parseCatalogItem.set('design_id', id);

    // Save the order with parse and handle success/error.
    parseCatalogItem.save().then(

      function(newCatItem) {
        duckburg.orderMaker.addCatItemToOrder(newCatItem, ci);
      },

      function(error) {
        console.log('error saving design', item.item_name, error.message);
      });
  },

  addCatItemToOrder: function(newCatItem, ci) {

    console.log('created new catalog item', newCatItem);

    // design_images_list: ""
    // item_name: ""
    // product_category: "Job Category"
    // product_colors: "heahter"
    // product_description: ""
    // product_ishidden: "yes"
    // product_isindexed: "no"
    // product_price: "5.00"
    // product_socialprice: "0.00"
    // product_type_visible: "Shirt Style"
    // sizes: {}

    var items = [];
    if (duckburg.orderMaker.currentOrder.attributes.items) {
      items = duckburg.orderMaker.currentOrder.attributes.items;
      items = JSON.parse(items);
    }

    var item = newCatItem.attributes;
    item.id = newCatItem.id;

    var totalItems = 0;

    if (ci.sizes) {

      for (var size in ci.sizes) {
        var q = ci.sizes[size];
        totalItems += parseInt(q);
      }
    }

    var totalCost = (ci.product_price * totalItems).toFixed(2);

    item.total_items = totalItems;
    item.total_cost = totalCost;
    item.sizes = ci.sizes;

    items.push(item);

    duckburg.orderMaker.currentOrder.set('items', JSON.stringify(items));

    duckburg.orderMaker.currentOrder.save().then(

      function(parseOrder) {
        console.log('added Cat Item to order', parseOrder);
      },

      function(error) {
        console.log('error adding cat item to order order', ci, error.message);
      });
  }
};



// Old order data.
duckburg.oldOrderData = [
{
  "customer": {
    "first_name": "Annalisa",
    "last_name": "Napolitano",
    "email_address": "ep_l1_4@yahoo.com",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "750",
    "tax_amount": "45",
    "final_total": "795.00",
    "payments": "0",
    "balance": "795.00",
    "total_pieces": "150"
  },
  "design_one": {
    "design_name": "Crew Neck Tee",
    "design_images_list": "unKcar4JiAi61zjxproof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "heahter",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "5.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "0",
      "M": "0",
      "L": "0",
      "XL": "0",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "150"
    }
  },
  "old_db_id": "2177",
  "order_status": "Archive",
  "due_date": "04/12/2017",
  "is_taxed": "0.06",
  "name": "5K for the Cause"
},
{
  "customer": {
    "first_name": "Jasmine",
    "last_name": "Vang",
    "email_address": "",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "0",
    "tax_amount": "0",
    "final_total": "0.00",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "0"
  },
  "design_one": {
    "design_name": "",
    "design_images_list": ""
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Teal ",
    "product_description": "About 100-149 Shirts",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "0.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "0",
      "M": "0",
      "L": "0",
      "XL": "0",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "3432",
  "order_status": "Archive",
  "due_date": "06/05/2015",
  "is_taxed": "0.06",
  "name": "HASA"
},
{
  "customer": {
    "first_name": "Claudio",
    "last_name": "Paulo",
    "email_address": "Claudiopjuarez@gmail.com",
    "phone_number": "917.780.7233",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "0",
    "tax_amount": "0",
    "final_total": "0.00",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "0"
  },
  "design_one": {
    "design_name": "Classic Hoodie ",
    "design_images_list": "cLD6ZedKUyihpFZRHoodie.gif"
  },
  "design_two": {
    "design_name": "Classic T-shirt",
    "design_images_list": "cLD6ZedKUyihpFZRTee.gif"
  },
  "design_three": {
    "design_name": "Sneakers Hoodie",
    "design_images_list": "f0UHearnQEWZoJk2Sneakers2.gif"
  },
  "design_four": {
    "design_name": "Sneakers T-shirt",
    "design_images_list": "f0UHearnQEWZoJk2Sneakers.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Leisure",
    "product_colors": "White",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "18.00",
    "product_socialprice": "26.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "0",
      "M": "0",
      "L": "0",
      "XL": "0",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_two": {
    "item_name": "Classic T-shirt",
    "design_images_list": "cLD6ZedKUyihpFZRTee.gif",
    "product_category": "Leisure",
    "product_colors": "Navy",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "10.00",
    "product_socialprice": "18.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "0",
      "M": "0",
      "L": "0",
      "XL": "0",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_three": {
    "item_name": "Sneakers Hoodie",
    "design_images_list": "f0UHearnQEWZoJk2Sneakers2.gif",
    "product_category": "Leisure",
    "product_colors": "Sport Grey ",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "18.00",
    "product_socialprice": "26.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "0",
      "M": "0",
      "L": "0",
      "XL": "0",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_four": {
    "item_name": "Sneakers T-shirt",
    "design_images_list": "f0UHearnQEWZoJk2Sneakers.gif",
    "product_category": "Leisure",
    "product_colors": "Navy",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "10.00",
    "product_socialprice": "18.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "0",
      "M": "0",
      "L": "0",
      "XL": "0",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "4012",
  "order_status": "Placed",
  "due_date": "12/31/2014",
  "is_taxed": "0.06",
  "name": "La Verdad "
},
{
  "customer": {
    "first_name": "Dim",
    "last_name": "Ciang",
    "email_address": "",
    "phone_number": "517.515.3955",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "440",
    "tax_amount": "0",
    "final_total": "440.00",
    "payments": "0",
    "balance": "220.00",
    "total_pieces": "40"
  },
  "design_one": {
    "design_name": "Youth Tee",
    "design_images_list": ""
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Royal ",
    "product_description": "quote= XS for toddlers, ym=4t yl=5t/6t",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "11.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "0",
      "M": "7",
      "L": "13",
      "XL": "0",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "8"
    }
  },
  "old_db_id": "4019",
  "order_status": "Active",
  "due_date": "12/15/2014",
  "is_taxed": "0.00",
  "name": "Sunday School"
},
{
  "customer": {
    "first_name": "Macdonnel",
    "last_name": "Middle",
    "email_address": "janelle.orange@elps.us",
    "phone_number": "517.333.7600",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "833.25",
    "tax_amount": "0",
    "final_total": "833.25",
    "payments": "0",
    "balance": "833.25",
    "total_pieces": "101"
  },
  "design_one": {
    "design_name": "Crew Neck ",
    "design_images_list": "tXcCDNo02VnBuUDlproof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Lime",
    "product_description": "Quote 1:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "8.25",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "22",
      "M": "31",
      "L": "28",
      "XL": "20",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "3930",
  "order_status": "Active",
  "due_date": "12/12/2014",
  "is_taxed": "0.00",
  "name": "STEM Club"
},
{
  "customer": {
    "first_name": "Erica",
    "last_name": "Tackett",
    "email_address": "",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "998.25",
    "tax_amount": "0",
    "final_total": "998.25",
    "payments": "0",
    "balance": "998.25",
    "total_pieces": "121"
  },
  "design_one": {
    "design_name": "V-neck",
    "design_images_list": "EYb9mblyiS72bybZv-neck.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Black",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "8.25",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "0",
      "M": "0",
      "L": "0",
      "XL": "0",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "121"
    }
  },
  "old_db_id": "3983",
  "order_status": "Active",
  "due_date": "12/12/2014",
  "is_taxed": "0.00",
  "name": "Campus Center Cinemas"
},
{
  "customer": {
    "first_name": "Dana",
    "last_name": "",
    "email_address": "danamirate@yahoo.com",
    "phone_number": "881 1501",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "244",
    "tax_amount": "14.64",
    "final_total": "258.64",
    "payments": "0",
    "balance": "258.64",
    "total_pieces": "40"
  },
  "design_one": {
    "design_name": "New Tee",
    "design_images_list": "VVPE2Ti6wXAnY9Csproof1.gif"
  },
  "design_two": {
    "design_name": "New Tee 2",
    "design_images_list": "A2QuUqiJVU7dw3M9proof2.gif"
  },
  "design_three": {
    "design_name": "Ladies Tees",
    "design_images_list": "A2QuUqiJVU7dw3M9Ladies.gif"
  },
  "design_four": {
    "design_name": "Crew Tees",
    "design_images_list": "A2QuUqiJVU7dw3M9crew.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Heather Dark Grey ",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "7.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "2",
      "M": "2",
      "L": "5",
      "XL": "3",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_two": {
    "item_name": "New Tee 2",
    "design_images_list": "A2QuUqiJVU7dw3M9proof2.gif",
    "product_category": "Academic",
    "product_colors": "Heather Green",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "7.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "2",
      "M": "2",
      "L": "2",
      "XL": "2",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_three": {
    "item_name": "Ladies Tees",
    "design_images_list": "A2QuUqiJVU7dw3M9Ladies.gif",
    "product_category": "Academic",
    "product_colors": "Red",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "7.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "2",
      "M": "4",
      "L": "4",
      "XL": "1",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_four": {
    "item_name": "Crew Tees",
    "design_images_list": "A2QuUqiJVU7dw3M9crew.gif",
    "product_category": "Academic",
    "product_colors": "Black",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "3.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "2",
      "M": "3",
      "L": "2",
      "XL": "2",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "4014",
  "order_status": "Active",
  "due_date": "12/12/2014",
  "is_taxed": "0.06",
  "name": "Starfarm Winter 14"
},
{
  "customer": {
    "first_name": "Dana",
    "last_name": "",
    "email_address": "danamirate@yahoo.com",
    "phone_number": "881 1501",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "594",
    "tax_amount": "35.64",
    "final_total": "629.64",
    "payments": "0",
    "balance": "629.64",
    "total_pieces": "29"
  },
  "design_one": {
    "design_name": "Heavier Zip Hoodie",
    "design_images_list": "OPSZM7AetuPU5ddZhoodie.gif"
  },
  "design_two": {
    "design_name": "Lighter Zip Hoodie",
    "design_images_list": "mjYozdWe3TyD9KeShoodie3.gif"
  },
  "design_three": {
    "design_name": "Lighter Zip Hoodie ",
    "design_images_list": "6K7vEqxlNvtgF0tqhoodie2.gif"
  },
  "design_four": {
    "design_name": "1 XL,1 L,1 L ZipHoodie Alpha",
    "design_images_list": "6K7vEqxlNvtgF0tqhoodie4.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Black",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "20.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "0",
      "M": "4",
      "L": "4",
      "XL": "2",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_two": {
    "item_name": "Lighter Zip Hoodie",
    "design_images_list": "mjYozdWe3TyD9KeShoodie3.gif",
    "product_category": "Academic",
    "product_colors": "LightRed Tri",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "19.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "2",
      "M": "2",
      "L": "2",
      "XL": "2",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_three": {
    "item_name": "Lighter Zip Hoodie ",
    "design_images_list": "6K7vEqxlNvtgF0tqhoodie2.gif",
    "product_category": "Academic",
    "product_colors": "Light Blue",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "19.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "2",
      "M": "2",
      "L": "2",
      "XL": "2",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_four": {
    "item_name": "1 XL,1 L,1 L ZipHoodie Alpha",
    "design_images_list": "6K7vEqxlNvtgF0tqhoodie4.gif",
    "product_category": "Academic",
    "product_colors": "EcoGreen, TruRed, TruRoyal",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "30.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "0",
      "M": "0",
      "L": "0",
      "XL": "0",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "3"
    }
  },
  "old_db_id": "4015",
  "order_status": "Active",
  "due_date": "12/12/2014",
  "is_taxed": "0.06",
  "name": "Starfarm Winter 14-2"
},
{
  "customer": {
    "first_name": "Roxanne",
    "last_name": "Truhn",
    "email_address": "scifest@msu.edu",
    "phone_number": "(517) 353-8977",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "1000",
    "tax_amount": "0",
    "final_total": "1000.00",
    "payments": "0",
    "balance": "450.00",
    "total_pieces": "200"
  },
  "design_one": {
    "design_name": "Volunteer Tees",
    "design_images_list": ""
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "5.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "35",
      "M": "58",
      "L": "75",
      "XL": "22",
      "2X": "10",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "4016",
  "order_status": "Placed",
  "due_date": "12/11/2014",
  "is_taxed": "0.00",
  "name": "MSU Science Festival 1st Run"
},
{
  "customer": {
    "first_name": "Patty",
    "last_name": "",
    "email_address": "",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "1650",
    "tax_amount": "99",
    "final_total": "1749.00",
    "payments": "0",
    "balance": "879.00",
    "total_pieces": "100"
  },
  "design_one": {
    "design_name": "Zip Hoodie",
    "design_images_list": "qItoUwlZQxZGdOulziphoodie.gif"
  },
  "design_two": {
    "design_name": "Long Sleeve Tee",
    "design_images_list": "qItoUwlZQxZGdOulproof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Dark Heather Grey",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "25.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "20",
      "M": "20",
      "L": "8",
      "XL": "2",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_two": {
    "item_name": "Long Sleeve Tee",
    "design_images_list": "qItoUwlZQxZGdOulproof.gif",
    "product_category": "Job Category",
    "product_colors": "Dark Heather Grey",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "8.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "20",
      "M": "20",
      "L": "8",
      "XL": "2",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "4008",
  "order_status": "Placed",
  "due_date": "12/10/2014",
  "is_taxed": "0.06",
  "name": "Hot Yoga EL"
},
{
  "customer": {
    "first_name": "Colin",
    "last_name": "",
    "email_address": "Colin@boldmethod.com",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "450",
    "tax_amount": "0",
    "final_total": "450.00",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "28"
  },
  "design_one": {
    "design_name": "Propeller Pullover Hoodie ",
    "design_images_list": "0pHkzImYsToDQtZQScreen Shot 2014-12-03 at 10.45.06 AM.png"
  },
  "design_two": {
    "design_name": "777 Long Sleeve",
    "design_images_list": "RAisQf8XN6FOoh5nScreen Shot 2014-12-03 at 11.25.18 AM.png"
  },
  "design_three": {
    "design_name": "777 Long Sleeve",
    "design_images_list": "3jC2spqlJfoZ9Og4Screen Shot 2014-12-03 at 10.48.59 AM.png"
  },
  "design_four": {
    "design_name": "777 Long Sleeve",
    "design_images_list": "5fVYCpUERmBJ0d0tScreen Shot 2014-12-03 at 10.49.59 AM.png"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Navy",
    "product_description": "Quote 1:0Quote 2:0Quote 1:0Quote 1:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "30.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "0",
      "M": "0",
      "L": "0",
      "XL": "1",
      "2X": "1",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_two": {
    "item_name": "777 Long Sleeve",
    "design_images_list": "RAisQf8XN6FOoh5nScreen Shot 2014-12-03 at 11.25.18 AM.png",
    "product_category": "Academic",
    "product_colors": "Asphalt",
    "product_description": "Quote 1:0Quote 2:0Quote 1:0Quote 1:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "15.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "0",
      "M": "3",
      "L": "1",
      "XL": "0",
      "2X": "1",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_three": {
    "item_name": "777 Long Sleeve",
    "design_images_list": "3jC2spqlJfoZ9Og4Screen Shot 2014-12-03 at 10.48.59 AM.png",
    "product_category": "Academic",
    "product_colors": "Navy",
    "product_description": "Quote 1:0Quote 2:0Quote 1:0Quote 1:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "15.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "0",
      "M": "0",
      "L": "2",
      "XL": "0",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_four": {
    "item_name": "777 Long Sleeve",
    "design_images_list": "5fVYCpUERmBJ0d0tScreen Shot 2014-12-03 at 10.49.59 AM.png",
    "product_category": "Academic",
    "product_colors": "Galaxy",
    "product_description": "Quote 1:0Quote 2:0Quote 1:0Quote 1:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "15.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "0",
      "M": "4",
      "L": "7",
      "XL": "6",
      "2X": "2",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "4009",
  "order_status": "Shirts Ordered",
  "due_date": "12/10/2014",
  "is_taxed": "0.00",
  "name": "Boldmethod Winter"
},
{
  "customer": {
    "first_name": "Colin",
    "last_name": "",
    "email_address": "Colin@boldmethod.com",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "295",
    "tax_amount": "0",
    "final_total": "295.00",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "33"
  },
  "design_one": {
    "design_name": "777 T-shirt",
    "design_images_list": "sqr2F7waNRzQHUVYScreen Shot 2014-12-03 at 10.54.18 AM.png"
  },
  "design_two": {
    "design_name": "777 T-shirt",
    "design_images_list": "sqr2F7waNRzQHUVYScreen Shot 2014-12-03 at 10.56.13 AM.png"
  },
  "design_three": {
    "design_name": "777 T-shirt",
    "design_images_list": "GW86Ay0X2mdkzfMsScreen Shot 2014-12-03 at 11.01.28 AM.png"
  },
  "design_four": {
    "design_name": "777 Ladies Tee",
    "design_images_list": "F8bhpn7XydD2FIEuScreen Shot 2014-12-03 at 11.09.28 AM.png"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Asphalt",
    "product_description": "Quote 1:0Quote 2:0Quote 1:0Quote 1:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "8.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "1",
      "M": "0",
      "L": "1",
      "XL": "0",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_two": {
    "item_name": "777 T-shirt",
    "design_images_list": "sqr2F7waNRzQHUVYScreen Shot 2014-12-03 at 10.56.13 AM.png",
    "product_category": "Academic",
    "product_colors": "Navy",
    "product_description": "Quote 1:0Quote 2:0Quote 1:0Quote 1:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "8.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "0",
      "M": "2",
      "L": "6",
      "XL": "5",
      "2X": "2",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_three": {
    "item_name": "777 T-shirt",
    "design_images_list": "GW86Ay0X2mdkzfMsScreen Shot 2014-12-03 at 11.01.28 AM.png",
    "product_category": "Academic",
    "product_colors": "Galaxy",
    "product_description": "Quote 1:0Quote 2:0Quote 1:0Quote 1:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "10.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "0",
      "M": "2",
      "L": "5",
      "XL": "6",
      "2X": "2",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_four": {
    "item_name": "777 Ladies Tee",
    "design_images_list": "F8bhpn7XydD2FIEuScreen Shot 2014-12-03 at 11.09.28 AM.png",
    "product_category": "Academic",
    "product_colors": "Heather",
    "product_description": "Quote 1:0Quote 2:0Quote 1:0Quote 1:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "9.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "0",
      "M": "1",
      "L": "0",
      "XL": "0",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "4010",
  "order_status": "Shirts Ordered",
  "due_date": "12/10/2014",
  "is_taxed": "0.00",
  "name": "Boldmethod Winter 2 "
},
{
  "customer": {
    "first_name": "Colin",
    "last_name": "",
    "email_address": "Colin@boldmethod.com",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "549",
    "tax_amount": "0",
    "final_total": "549.00",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "40"
  },
  "design_one": {
    "design_name": "777 Ladies Tee",
    "design_images_list": "P6JVeNP00ymLuNSgScreen Shot 2014-12-03 at 11.11.11 AM.png"
  },
  "design_two": {
    "design_name": "Propeller Ladies T-shirt ",
    "design_images_list": "3lzk1SGgNLlwnOdDScreen Shot 2014-12-03 at 11.11.55 AM.png"
  },
  "design_three": {
    "design_name": "Zip Up Hoodie",
    "design_images_list": "kmYZAep1ccc7qvNTScreen Shot 2014-12-03 at 11.14.22 AM.png"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Navy ",
    "product_description": "Quote 1:0Quote 2:0Quote 1:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "9.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "0",
      "M": "1",
      "L": "5",
      "XL": "7",
      "2X": "2",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_two": {
    "item_name": "Propeller Ladies T-shirt ",
    "design_images_list": "3lzk1SGgNLlwnOdDScreen Shot 2014-12-03 at 11.11.55 AM.png",
    "product_category": "Academic",
    "product_colors": "Heather",
    "product_description": "Quote 1:0Quote 2:0Quote 1:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "9.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "0",
      "M": "1",
      "L": "7",
      "XL": "6",
      "2X": "2",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_three": {
    "item_name": "Zip Up Hoodie",
    "design_images_list": "kmYZAep1ccc7qvNTScreen Shot 2014-12-03 at 11.14.22 AM.png",
    "product_category": "Academic",
    "product_colors": "Asphalt",
    "product_description": "Quote 1:0Quote 2:0Quote 1:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "30.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "1",
      "M": "2",
      "L": "2",
      "XL": "3",
      "2X": "1",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "4011",
  "order_status": "Shirts Ordered",
  "due_date": "12/10/2014",
  "is_taxed": "0.00",
  "name": "Boldmethod Winter 3 "
},
{
  "customer": {
    "first_name": "Dan",
    "last_name": "Romigh",
    "email_address": "",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "256",
    "tax_amount": "15.36",
    "final_total": "271.36",
    "payments": "0",
    "balance": "271.36",
    "total_pieces": "8"
  },
  "design_one": {
    "design_name": "Vertical Barbell Design Hoodie",
    "design_images_list": "m2n0OOY2YW7D4u9iproof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Grey ",
    "product_description": "3 L, 2 M, 3",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "32.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "0",
      "M": "2",
      "L": "3",
      "XL": "3",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "4017",
  "order_status": "Active",
  "due_date": "12/10/2014",
  "is_taxed": "0.06",
  "name": "Crossfit Sanction Hoodies "
},
{
  "customer": {
    "first_name": "Jason",
    "last_name": "Myers",
    "email_address": "",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "0",
    "tax_amount": "0",
    "final_total": "0.00",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "200"
  },
  "design_one": {
    "design_name": "Shirts",
    "design_images_list": ""
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "210",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "0.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "0",
      "M": "0",
      "L": "0",
      "XL": "0",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "200"
    }
  },
  "old_db_id": "4018",
  "order_status": "Active",
  "due_date": "12/10/2014",
  "is_taxed": "0.06",
  "name": "LAUNCHED"
},
{
  "customer": {
    "first_name": "brittney",
    "last_name": "heatherington",
    "email_address": "brittney.heatherington@gmail.com",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "2750",
    "tax_amount": "0",
    "final_total": "2750.00",
    "payments": "0",
    "balance": "2750.00",
    "total_pieces": "500"
  },
  "design_one": {
    "design_name": "T-shirt",
    "design_images_list": "alkwphoQpzULXd8Knewproof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Navy",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "5.50",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "75",
      "M": "150",
      "L": "200",
      "XL": "50",
      "2X": "25",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "4013",
  "order_status": "Active",
  "due_date": "12/09/2014",
  "is_taxed": "0.00",
  "name": "Ski Club Aspen Trip"
},
{
  "customer": {
    "first_name": "Angela",
    "last_name": "Magbag",
    "email_address": "angelamagbag101@yahoo.com",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "220",
    "tax_amount": "0",
    "final_total": "220.00",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "22"
  },
  "design_one": {
    "design_name": "T-shirt",
    "design_images_list": "Wx5VK3HXtRYv8L4zwaverlyinteract.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Charcoal",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "10.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "sizes": {
      "S": "10",
      "M": "8",
      "L": "2",
      "XL": "2",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "3990",
  "order_status": "Shirts Received",
  "due_date": "12/05/2014",
  "is_taxed": "0.00",
  "name": "Waverly Interact"
},
{
  "customer": {
    "first_name": "Lauren",
    "last_name": "",
    "email_address": "hopkinslauren@gmail.com",
    "phone_number": "(989) 475-2149",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "432",
    "tax_amount": "0",
    "final_total": "432.00",
    "payments": "0",
    "balance": "16.00",
    "total_pieces": "23"
  },
  "design_one": {
    "design_name": "Hoodies",
    "design_images_list": "yqW2dJQv3efQBEKfproof-(2).gif"
  },
  "design_two": {
    "design_name": "Quarter Zip ",
    "design_images_list": "CVXj0kJ9epOCp2nJquarterzip.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Dark Heather",
    "product_description": "Tooth w/bow (front) Class of 2016 (back) white/bright blue",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "16.00",
    "product_socialprice": "0.00",
    "product_type_visible": "RD010 - Hooded Sweatshirt",
    "sizes": {
      "S": "0",
      "M": "5",
      "L": "1",
      "XL": "1",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_two": {
    "item_name": "Quarter Zip ",
    "design_images_list": "CVXj0kJ9epOCp2nJquarterzip.gif",
    "product_category": "Academic",
    "product_colors": "Dark Heather ",
    "product_description": "Tooth w/bow (front) Class of 2016 (back) white/bright blue",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "20.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "6",
      "M": "7",
      "L": "3",
      "XL": "0",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "3991",
  "order_status": "Shirts Received",
  "due_date": "12/05/2014",
  "is_taxed": "0.00",
  "name": "Dental Hygiene"
},
{
  "customer": {
    "first_name": "George",
    "last_name": "Hoover",
    "email_address": "ghoover@cottageinn.com",
    "phone_number": " 248-249-6000",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "383",
    "tax_amount": "22.98",
    "final_total": "405.98",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "33"
  },
  "design_one": {
    "design_name": "Design 1 ",
    "design_images_list": "NFymJCzsvAvygHbWDesign1.gif"
  },
  "design_two": {
    "design_name": "Design 2 ",
    "design_images_list": "R1k13jUZkPX0WynGDesign2.gif"
  },
  "design_three": {
    "design_name": "Design 3",
    "design_images_list": "aeNEX73Hmr8JpVPgDesign3.gif"
  },
  "design_four": {
    "design_name": "Design 4 ",
    "design_images_list": "aeNEX73Hmr8JpVPgdesign4.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Forest",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "11.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "4",
      "M": "3",
      "L": "6",
      "XL": "1",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "1",
      "QUOTE": "0"
    }
  },
  "cat_item_two": {
    "item_name": "Design 2 ",
    "design_images_list": "R1k13jUZkPX0WynGDesign2.gif",
    "product_category": "Job Category",
    "product_colors": "Forest",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "15.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "0",
      "M": "0",
      "L": "4",
      "XL": "1",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "cat_item_three": {
    "item_name": "Design 3",
    "design_images_list": "aeNEX73Hmr8JpVPgDesign3.gif",
    "product_category": "Job Category",
    "product_colors": "Forest",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "11.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "4",
      "M": "1",
      "L": "1",
      "XL": "0",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "1",
      "QUOTE": "0"
    }
  },
  "cat_item_four": {
    "item_name": "Design 4 ",
    "design_images_list": "aeNEX73Hmr8JpVPgdesign4.gif",
    "product_category": "Job Category",
    "product_colors": "Forest",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "11.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "1",
      "M": "2",
      "L": "2",
      "XL": "1",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "4005",
  "order_status": "Shirts Received",
  "due_date": "12/05/2014",
  "is_taxed": "0.06",
  "name": "Cottage Inn"
},
{
  "customer": {
    "first_name": "Deshawn",
    "last_name": "Mims",
    "email_address": "mimsdesh@gmail.com",
    "phone_number": "313.658.5551",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "287",
    "tax_amount": "0",
    "final_total": "287.00",
    "payments": "0",
    "balance": "147.00",
    "total_pieces": "41"
  },
  "design_one": {
    "design_name": "Tee Shirt",
    "design_images_list": "AMRSAX49y57RNKPIFINAL.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Royal",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "7.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "sizes": {
      "S": "18",
      "M": "15",
      "L": "5",
      "XL": "3",
      "2X": "0",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "3932",
  "order_status": "Completed - Unpaid",
  "due_date": "12/04/2014",
  "is_taxed": "0.00",
  "name": "RAWR "
}
];
