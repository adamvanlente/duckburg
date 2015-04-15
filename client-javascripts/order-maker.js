duckburg = duckburg || {};

/**
 * @TEMP module for transporting old RD orders to new system.
 *
 * TODO need to auto-assign shirt types when transferring for real.  Logic should
 *      exist for testing, but it requires having all products in db
 *
 * TODO carrying over social orders.
 *
 * TODO calculate the print time.
 *
 * TODO double check color count - perhaps nothing is being totalled
 *
 * TODO are some images getting lost?  MSU Science festival as example
 *
 */
duckburg.orderMaker = {

  index: 0,

  // Loads the orders and makes orders with them.
  load: function() {

    var i = duckburg.orderMaker.index;

    // if (duckburg.oldOrderData[i] && duckburg.orderMaker.index < 1) {
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

    // TODO additional logic for product type visible

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
    parseCatalogItem.set('color_count', ci.color_count);
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

    item.sizes = {};
    if (ci.sizes) {

      for (var size in ci.sizes) {
        var q = ci.sizes[size];

        if (q && q != '' && q != 0) {
          totalItems += parseInt(q);
          item.sizes[size] = parseInt(q);
        }
      }
    }

    var totalCost = (ci.product_price * totalItems).toFixed(2);

    item.total_items = totalItems;
    item.total_cost = totalCost;
    // item.sizes = ci.sizes;

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
    "color_count": {
      "front": "2",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
    "first_name": "Karen",
    "last_name": "",
    "email_address": "kjd517@att.net",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "500",
    "tax_amount": "30",
    "final_total": "530.00",
    "payments": "0",
    "balance": "330.00",
    "total_pieces": "100"
  },
  "design_one": {
    "design_name": "Blue Tees",
    "design_images_list": "o6qkYu6aEMdog36pbl.gif"
  },
  "design_two": {
    "design_name": "Pink Tees ",
    "design_images_list": "o6qkYu6aEMdog36ppink.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Blue",
    "product_description": "20 smalls 25 mediums 25 larges 25 xl 5 2x ",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "5.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "10",
      "M": "13",
      "L": "15",
      "XL": "15",
      "2X": "3",
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
    "item_name": "Pink Tees ",
    "design_images_list": "o6qkYu6aEMdog36ppink.gif",
    "product_category": "Job Category",
    "product_colors": "Pink",
    "product_description": "20 smalls 25 mediums 25 larges 25 xl 5 2x ",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "5.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "10",
      "M": "12",
      "L": "10",
      "XL": "10",
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
  "old_db_id": "4064",
  "order_status": "Placed",
  "due_date": "05/22/2015",
  "is_taxed": "0.06",
  "name": "A-Mayes-Ing Race"
},
{
  "customer": {
    "first_name": "Claire",
    "last_name": "LaFave",
    "email_address": "lafavecl@msu.edu",
    "phone_number": "269 967 6982",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "156",
    "tax_amount": "9.36",
    "final_total": "165.36",
    "payments": "0",
    "balance": "165.36",
    "total_pieces": "13"
  },
  "design_one": {
    "design_name": "Crew Neck Sweatshirt",
    "design_images_list": "2rcyejbYBmjeZriaproof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Gildan",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "12.00",
    "product_socialprice": "0.00",
    "product_type_visible": "RD012 - Crew Neck Sweatshirt",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
      "QUOTE": "13"
    }
  },
  "old_db_id": "4053",
  "order_status": "Active",
  "due_date": "04/01/2015",
  "is_taxed": "0.06",
  "name": "Club Volleyball Nationals"
},
{
  "customer": {
    "first_name": "Kyle",
    "last_name": "Mulder",
    "email_address": "mulderky@msu.edu",
    "phone_number": "5178810561",
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
    "design_name": "T-Shirts",
    "design_images_list": "dKGCexHrvlyHE0N3proof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "dark grey",
    "product_description": "About 50-74 Shirts",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "0.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "color_count": {
      "front": "5",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
  "old_db_id": "4173",
  "order_status": "Active",
  "due_date": "03/21/2015",
  "is_taxed": "0.06",
  "name": "Pre-Dental Club"
},
{
  "customer": {
    "first_name": "Phu",
    "last_name": "Nguyen",
    "email_address": "phunguyen3223@gmail.com",
    "phone_number": "586 822 4332",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "260",
    "tax_amount": "15.6",
    "final_total": "275.60",
    "payments": "0",
    "balance": "275.60",
    "total_pieces": "20"
  },
  "design_one": {
    "design_name": "Tanks",
    "design_images_list": "EMdJyZXfNeH10bA8proof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Greek",
    "product_colors": "Royal",
    "product_description": "Quote 1:20",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "13.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "2",
      "M": "12",
      "L": "5",
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
  "old_db_id": "4174",
  "order_status": "Active",
  "due_date": "03/04/2015",
  "is_taxed": "0.06",
  "name": "Kappa Sigma Spring Break 2015"
},
{
  "customer": {
    "first_name": "Juliann",
    "last_name": "Otto",
    "email_address": "jotto@cityofeastlansing.com",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "1650",
    "tax_amount": "0",
    "final_total": "1650.00",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "1000"
  },
  "design_one": {
    "design_name": "",
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
    "product_price": "1.65",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "1000",
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
  "old_db_id": "4091",
  "order_status": "Placed",
  "due_date": "03/03/2015",
  "is_taxed": "0.00",
  "name": "Bags"
},
{
  "customer": {
    "first_name": "Timothy",
    "last_name": "Griffin",
    "email_address": "griffint323@aol.com",
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
    "design_name": "A4 Tech Red Tees",
    "design_images_list": "UVWIbIaIVliw967kredtimothy.gif"
  },
  "design_two": {
    "design_name": "A4 Tech White Tees",
    "design_images_list": "UVWIbIaIVliw967kwhitetimothy.gif"
  },
  "design_three": {
    "design_name": "Cotton Red Tee",
    "design_images_list": "UVWIbIaIVliw967kredtimothy.gif"
  },
  "design_four": {
    "design_name": "Cotton White Tee",
    "design_images_list": "UVWIbIaIVliw967kwhitetimothy.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Red",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "10.00",
    "product_socialprice": "22.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
    "item_name": "A4 Tech White Tees",
    "design_images_list": "UVWIbIaIVliw967kwhitetimothy.gif",
    "product_category": "Academic",
    "product_colors": "White",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "10.00",
    "product_socialprice": "22.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
    "item_name": "Cotton Red Tee",
    "design_images_list": "UVWIbIaIVliw967kredtimothy.gif",
    "product_category": "Academic",
    "product_colors": "Red",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "7.00",
    "product_socialprice": "18.00",
    "product_type_visible": "",
    "color_count": {
      "front": "0",
      "back": "0",
      "left": "0",
      "right": "0"
    },
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
    "item_name": "Cotton White Tee",
    "design_images_list": "UVWIbIaIVliw967kwhitetimothy.gif",
    "product_category": "Academic",
    "product_colors": "White",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "7.00",
    "product_socialprice": "18.00",
    "product_type_visible": "",
    "color_count": {
      "front": "0",
      "back": "0",
      "left": "0",
      "right": "0"
    },
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
  "old_db_id": "4098",
  "order_status": "Archive",
  "due_date": "02/27/2015",
  "is_taxed": "0.06",
  "name": "Jesus Runner : 2 Timothy 4:7"
},
{
  "customer": {
    "first_name": "Timothy",
    "last_name": "Griffin",
    "email_address": "griffint323@aol.com",
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
    "design_name": "A4 Tech Red Tees",
    "design_images_list": "TfjEx3hs11sdJV6Qredhebrews.gif"
  },
  "design_two": {
    "design_name": "A4 Tech White Tees",
    "design_images_list": "TfjEx3hs11sdJV6Qwhitehebrews.gif"
  },
  "design_three": {
    "design_name": "Cotton Red Tee",
    "design_images_list": "TfjEx3hs11sdJV6Qredhebrews.gif"
  },
  "design_four": {
    "design_name": "Cotton White Tee",
    "design_images_list": "TfjEx3hs11sdJV6Qwhitehebrews.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Red",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "10.00",
    "product_socialprice": "22.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
    "item_name": "A4 Tech White Tees",
    "design_images_list": "TfjEx3hs11sdJV6Qwhitehebrews.gif",
    "product_category": "Academic",
    "product_colors": "White",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "10.00",
    "product_socialprice": "22.00",
    "product_type_visible": "",
    "color_count": {
      "front": "0",
      "back": "0",
      "left": "0",
      "right": "0"
    },
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
    "item_name": "Cotton Red Tee",
    "design_images_list": "TfjEx3hs11sdJV6Qredhebrews.gif",
    "product_category": "Academic",
    "product_colors": "Red",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "7.00",
    "product_socialprice": "18.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
    "item_name": "Cotton White Tee",
    "design_images_list": "TfjEx3hs11sdJV6Qwhitehebrews.gif",
    "product_category": "Academic",
    "product_colors": "White",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "7.00",
    "product_socialprice": "18.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
  "old_db_id": "4099",
  "order_status": "Archive",
  "due_date": "02/27/2015",
  "is_taxed": "0.06",
  "name": "Jesus Runner : Hebrews 12: 1"
},
{
  "customer": {
    "first_name": "Timothy",
    "last_name": "Griffin",
    "email_address": "griffint323@aol.com",
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
    "design_name": "A4 Tech Red Tees",
    "design_images_list": "kJronlO6BuIY4nuaredphil.gif"
  },
  "design_two": {
    "design_name": "A4 Tech White Tees",
    "design_images_list": "kJronlO6BuIY4nuawhitephil.gif"
  },
  "design_three": {
    "design_name": "Cotton Red Tee",
    "design_images_list": "kJronlO6BuIY4nuaredphil.gif"
  },
  "design_four": {
    "design_name": "Cotton White Tee",
    "design_images_list": "kJronlO6BuIY4nuawhitephil.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Red",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "10.00",
    "product_socialprice": "22.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
    "item_name": "A4 Tech White Tees",
    "design_images_list": "kJronlO6BuIY4nuawhitephil.gif",
    "product_category": "Academic",
    "product_colors": "White",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "10.00",
    "product_socialprice": "22.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
    "item_name": "Cotton Red Tee",
    "design_images_list": "kJronlO6BuIY4nuaredphil.gif",
    "product_category": "Academic",
    "product_colors": "Red",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "7.00",
    "product_socialprice": "18.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
    "item_name": "Cotton White Tee",
    "design_images_list": "kJronlO6BuIY4nuawhitephil.gif",
    "product_category": "Academic",
    "product_colors": "White",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "7.00",
    "product_socialprice": "18.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
  "old_db_id": "4100",
  "order_status": "Archive",
  "due_date": "02/27/2015",
  "is_taxed": "0.06",
  "name": "Jesus Runner : Philippians 4: 13"
},
{
  "customer": {
    "first_name": "C-Rad",
    "last_name": "",
    "email_address": "joe@conradsgrill.com",
    "phone_number": "517 488 6722",
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
    "design_name": "AA Hoodie 'Know'",
    "design_images_list": "Sxmx7B1dTZeEtzmIknow.gif"
  },
  "design_two": {
    "design_name": "AA Hoodie 'Eat'",
    "design_images_list": "Sxmx7B1dTZeEtzmIeat.gif"
  },
  "design_three": {
    "design_name": "AA Hoodie Plain Back",
    "design_images_list": "Sxmx7B1dTZeEtzmIplain.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "black",
    "product_description": "1899",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "23.00",
    "product_socialprice": "23.00",
    "product_type_visible": "Other",
    "color_count": {
      "front": "2",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
    "item_name": "AA Hoodie 'Eat'",
    "design_images_list": "Sxmx7B1dTZeEtzmIeat.gif",
    "product_category": "Academic",
    "product_colors": "Black",
    "product_description": "1899",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "23.00",
    "product_socialprice": "23.00",
    "product_type_visible": "Other",
    "color_count": {
      "front": "2",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
    "item_name": "AA Hoodie Plain Back",
    "design_images_list": "Sxmx7B1dTZeEtzmIplain.gif",
    "product_category": "Academic",
    "product_colors": "Black",
    "product_description": "1899",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "21.00",
    "product_socialprice": "21.00",
    "product_type_visible": "Other",
    "color_count": {
      "front": "2",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
  "old_db_id": "4116",
  "order_status": "Placed",
  "due_date": "02/27/2015",
  "is_taxed": "0.06",
  "name": "Conrads Hoodies Lighter "
},
{
  "customer": {
    "first_name": "C-Rad",
    "last_name": "",
    "email_address": "joe@conradsgrill.com",
    "phone_number": "517 488 6722",
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
    "design_name": "Hoodie ",
    "design_images_list": "fOE7Pwilx80AoG3Hknow.gif"
  },
  "design_two": {
    "design_name": "Hoodie ",
    "design_images_list": "fOE7Pwilx80AoG3Heat.gif"
  },
  "design_three": {
    "design_name": "Hoodie Plain",
    "design_images_list": "fOE7Pwilx80AoG3Hplain.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Black",
    "product_description": "4116",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "23.00",
    "product_socialprice": "23.00",
    "product_type_visible": "",
    "color_count": {
      "front": "2",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
    "item_name": "Hoodie ",
    "design_images_list": "fOE7Pwilx80AoG3Heat.gif",
    "product_category": "Academic",
    "product_colors": "Black",
    "product_description": "4116",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "23.00",
    "product_socialprice": "23.00",
    "product_type_visible": "",
    "color_count": {
      "front": "2",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
    "item_name": "Hoodie Plain",
    "design_images_list": "fOE7Pwilx80AoG3Hplain.gif",
    "product_category": "Academic",
    "product_colors": "Black",
    "product_description": "4116",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "21.00",
    "product_socialprice": "21.00",
    "product_type_visible": "",
    "color_count": {
      "front": "2",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
  "old_db_id": "4117",
  "order_status": "Placed",
  "due_date": "02/27/2015",
  "is_taxed": "0.06",
  "name": "CONRADS HOODIES Heavier "
},
{
  "customer": {
    "first_name": "Jaimee",
    "last_name": "Gillon",
    "email_address": "jgillon@swcrk.org",
    "phone_number": "",
    "address_one": "1 Dragon Drive",
    "address_two": "",
    "address_city": "Swartz Creek",
    "address_state": "MI",
    "address_zip": "48137"
  },
  "order_summary": {
    "order_total": "280",
    "tax_amount": "16.8",
    "final_total": "296.80",
    "payments": "0",
    "balance": "296.80",
    "total_pieces": "35"
  },
  "design_one": {
    "design_name": "T-shirt",
    "design_images_list": "Xvjf5QDcECJERSTmproof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "White",
    "product_description": "Calling Thursday (13th)",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "8.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
      "QUOTE": "35"
    }
  },
  "old_db_id": "4135",
  "order_status": "Active",
  "due_date": "02/27/2015",
  "is_taxed": "0.06",
  "name": "Hand-Print"
},
{
  "customer": {
    "first_name": "Leigh",
    "last_name": "Graves",
    "email_address": "gravesle@msu.edu",
    "phone_number": "517.432.7195 ",
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
    "design_name": "Baseball Tee",
    "design_images_list": "0jkeJKnrdQldvTZ8Proof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "B2B",
    "product_colors": "Green / White",
    "product_description": "3142",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "18.00",
    "product_socialprice": "0.00",
    "product_type_visible": "RD005 - 3/4 Sleeve Jersey",
    "color_count": {
      "front": "0",
      "back": "0",
      "left": "0",
      "right": "0"
    },
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
  "old_db_id": "4142",
  "order_status": "Active",
  "due_date": "02/27/2015",
  "is_taxed": "0.00",
  "name": "MSU MAET2"
},
{
  "customer": {
    "first_name": "Whitney",
    "last_name": "Gravelle",
    "email_address": "wbgravelle@gmail.com",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "107",
    "tax_amount": "6.42",
    "final_total": "113.42",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "11"
  },
  "design_one": {
    "design_name": "Old Design",
    "design_images_list": "24SJ7MAWproof.gif"
  },
  "design_two": {
    "design_name": "Moot Court",
    "design_images_list": "Yercdauzc7A6gZcuproof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Forest Green",
    "product_description": "Quote 1:0Quote 2:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "9.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "0",
      "M": "2",
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
    "item_name": "Moot Court",
    "design_images_list": "Yercdauzc7A6gZcuproof.gif",
    "product_category": "Academic",
    "product_colors": "White",
    "product_description": "Quote 1:0Quote 2:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "10.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "3",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "3",
      "M": "1",
      "L": "1",
      "XL": "1",
      "2X": "1",
      "3X": "1",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "4172",
  "order_status": "Active",
  "due_date": "02/27/2015",
  "is_taxed": "0.06",
  "name": "MSU NALSA Spring"
},
{
  "customer": {
    "first_name": "Adam",
    "last_name": "Schoonmaker",
    "email_address": "adamschoonmaker12@gmail.com",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "130",
    "tax_amount": "7.8",
    "final_total": "137.80",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "10"
  },
  "design_one": {
    "design_name": "T-Shirt",
    "design_images_list": "30TKRut3xrw4qGt4proof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Dark Heather",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "13.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "3",
      "M": "4",
      "L": "1",
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
  "old_db_id": "4181",
  "order_status": "Active",
  "due_date": "02/25/2015",
  "is_taxed": "0.06",
  "name": "Onesound"
},
{
  "customer": {
    "first_name": "Augie",
    "last_name": "Evered",
    "email_address": "aoevered@gmail.com",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "350",
    "tax_amount": "21",
    "final_total": "371.00",
    "payments": "0",
    "balance": "371.00",
    "total_pieces": "70"
  },
  "design_one": {
    "design_name": "T-shirt",
    "design_images_list": "WSfXDwTacwsOJ7Psproof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Trop Blue?",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "5.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
      "QUOTE": "70"
    }
  },
  "old_db_id": "4180",
  "order_status": "Active",
  "due_date": "02/25/2015",
  "is_taxed": "0.06",
  "name": "Battle of the Bands"
},
{
  "customer": {
    "first_name": "Arun",
    "last_name": "Das",
    "email_address": "dasarun@gmail.com",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "448",
    "tax_amount": "0",
    "final_total": "448.00",
    "payments": "0",
    "balance": "448.00",
    "total_pieces": "14"
  },
  "design_one": {
    "design_name": "Flex Fleece Zip Hoodie",
    "design_images_list": "JUYXn4pUMlbr2gA7new3.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Asphalt",
    "product_description": "1 XXL 2 XL 4 L 4 M 3 S",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "32.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "3",
      "M": "4",
      "L": "4",
      "XL": "2",
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
  "old_db_id": "4183",
  "order_status": "Active",
  "due_date": "02/25/2015",
  "is_taxed": "0.00",
  "name": "Pangea Hoodies"
},
{
  "customer": {
    "first_name": "",
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
    "order_total": "48",
    "tax_amount": "2.88",
    "final_total": "50.88",
    "payments": "0",
    "balance": "50.88",
    "total_pieces": "6"
  },
  "design_one": {
    "design_name": "",
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
    "product_price": "8.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "0",
      "M": "0",
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
  "old_db_id": "4166",
  "order_status": "Active",
  "due_date": "02/24/2015",
  "is_taxed": "0.06",
  "name": "Mommy Says Fitness"
},
{
  "customer": {
    "first_name": "Scott",
    "last_name": "Rolen",
    "email_address": "srolen14@gmail.com",
    "phone_number": "734.649.0596",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "481.25",
    "tax_amount": "28.875",
    "final_total": "510.13",
    "payments": "0",
    "balance": "510.13",
    "total_pieces": "65"
  },
  "design_one": {
    "design_name": "Girls Tanks",
    "design_images_list": "OPgROxKbKm79fVGMtank.gif"
  },
  "design_two": {
    "design_name": "Girls Tanks",
    "design_images_list": "OPgROxKbKm79fVGMteal.gif"
  },
  "design_three": {
    "design_name": "Mens V-necks STAFF",
    "design_images_list": "OPgROxKbKm79fVGMproof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "B2B",
    "product_colors": "Red",
    "product_description": "4092",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "7.25",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "10",
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
    "item_name": "Girls Tanks",
    "design_images_list": "OPgROxKbKm79fVGMteal.gif",
    "product_category": "B2B",
    "product_colors": "Teal",
    "product_description": "4092",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "7.25",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "10",
      "M": "5",
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
    "item_name": "Mens V-necks STAFF",
    "design_images_list": "OPgROxKbKm79fVGMproof.gif",
    "product_category": "B2B",
    "product_colors": "Black",
    "product_description": "4092",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "7.50",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "0",
      "M": "25",
      "L": "10",
      "XL": "5",
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
  "old_db_id": "4176",
  "order_status": "Active",
  "due_date": "02/24/2015",
  "is_taxed": "0.06",
  "name": "Landshark"
},
{
  "customer": {
    "first_name": "Will",
    "last_name": "Benghauser",
    "email_address": "",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "200",
    "tax_amount": "12",
    "final_total": "212.00",
    "payments": "0",
    "balance": "212.00",
    "total_pieces": "25"
  },
  "design_one": {
    "design_name": "Black Tee",
    "design_images_list": "A9N4uzUHFtleXPNSblacktee.gif"
  },
  "design_two": {
    "design_name": "White Tee",
    "design_images_list": "dq0medgJWDul5IFiwhtietee.gif"
  },
  "design_three": {
    "design_name": "Grey Tees",
    "design_images_list": "dq0medgJWDul5IFidarkheath.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Black",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "8.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "0",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "1",
      "M": "2",
      "L": "4",
      "XL": "2",
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
    "item_name": "White Tee",
    "design_images_list": "dq0medgJWDul5IFiwhtietee.gif",
    "product_category": "Job Category",
    "product_colors": "White",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "8.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "0",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "0",
      "M": "0",
      "L": "0",
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
  "cat_item_three": {
    "item_name": "Grey Tees",
    "design_images_list": "dq0medgJWDul5IFidarkheath.gif",
    "product_category": "Job Category",
    "product_colors": "Dark Heather",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "8.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "0",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "1",
      "M": "3",
      "L": "4",
      "XL": "2",
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
  "old_db_id": "4177",
  "order_status": "Placed",
  "due_date": "02/24/2015",
  "is_taxed": "0.06",
  "name": "Geovybe"
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
    "order_total": "30",
    "tax_amount": "0",
    "final_total": "30.00",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "2"
  },
  "design_one": {
    "design_name": "Stripe Zip Hoodie",
    "design_images_list": "tmtjcBQ2xSxYbruximage.png"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Asphalt",
    "product_description": "3933",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "30.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "color_count": {
      "front": "3",
      "back": "0",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "0",
      "M": "0",
      "L": "0",
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
  "old_db_id": "4136",
  "order_status": "Shirts Ordered",
  "due_date": "02/23/2015",
  "is_taxed": "0.00",
  "name": "Boldmethod 1 "
},
{
  "customer": {
    "first_name": "Mike",
    "last_name": "Casner",
    "email_address": "md_casner@yahoo.com",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "428",
    "tax_amount": "25.68",
    "final_total": "473.68",
    "payments": "0",
    "balance": "474.88",
    "total_pieces": "29"
  },
  "design_one": {
    "design_name": "T-shirts",
    "design_images_list": ""
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Various",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "6.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
      "QUOTE": "6"
    }
  },
  "old_db_id": "4140",
  "order_status": "Active",
  "due_date": "02/23/2015",
  "is_taxed": "0.06",
  "name": "CDM 1"
},
{
  "customer": {
    "first_name": "Mariana",
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
    "order_total": "467.5",
    "tax_amount": "0",
    "final_total": "467.50",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "85"
  },
  "design_one": {
    "design_name": "T-Shirt",
    "design_images_list": "UnjPSkqyZ62hqHsbproof2.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Black",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "5.50",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "2",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "25",
      "M": "25",
      "L": "25",
      "XL": "10",
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
  "old_db_id": "4164",
  "order_status": "Placed",
  "due_date": "02/23/2015",
  "is_taxed": "0.00",
  "name": "Spartan Engineering"
},
{
  "customer": {
    "first_name": "Rick",
    "last_name": "",
    "email_address": "rick@dublinsquare.net",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "160",
    "tax_amount": "9.6",
    "final_total": "169.60",
    "payments": "0",
    "balance": "169.60",
    "total_pieces": "20"
  },
  "design_one": {
    "design_name": "Tees",
    "design_images_list": ""
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Safety Orange",
    "product_description": "3730",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "8.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "0",
      "M": "0",
      "L": "10",
      "XL": "10",
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
  "old_db_id": "4182",
  "order_status": "Active",
  "due_date": "02/23/2015",
  "is_taxed": "0.06",
  "name": "Dublin Security"
},
{
  "customer": {
    "first_name": "Alana",
    "last_name": "Assenmacher",
    "email_address": "alanaassenmacher@gmail.com",
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
    "total_pieces": "57"
  },
  "design_one": {
    "design_name": "Long Sleeve Tee",
    "design_images_list": "RqIkSwWGnVhkUJz8proof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Bar Crawl",
    "product_colors": "Forest ",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "0.00",
    "product_socialprice": "12.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
      "QUOTE": "57"
    }
  },
  "old_db_id": "4110",
  "order_status": "Shirts Received",
  "due_date": "02/20/2015",
  "is_taxed": "0.06",
  "name": "Comfy Crawl"
},
{
  "customer": {
    "first_name": "Stephen",
    "last_name": "",
    "email_address": "sgiles2000@gmail.com",
    "phone_number": "517 402 3631",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "132",
    "tax_amount": "7.92",
    "final_total": "139.92",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "11"
  },
  "design_one": {
    "design_name": "Customer Supplied",
    "design_images_list": "tV0hA9rrtBzLoKF8proof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "High School",
    "product_colors": "",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "12.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "2",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
      "QUOTE": "11"
    }
  },
  "old_db_id": "4168",
  "order_status": "Shirts Received",
  "due_date": "02/20/2015",
  "is_taxed": "0.06",
  "name": "Flight School Floor Hockey"
},
{
  "customer": {
    "first_name": "Stephen",
    "last_name": "",
    "email_address": "sgiles2000@gmail.com",
    "phone_number": "517 402 3631",
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
    "design_name": "Customer Supplied",
    "design_images_list": ""
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "High School",
    "product_colors": "",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "12.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
  "old_db_id": "4169",
  "order_status": "Archive",
  "due_date": "02/20/2015",
  "is_taxed": "0.06",
  "name": "Flight School Floor Hockey"
},
{
  "customer": {
    "first_name": "Mike",
    "last_name": "Ayres",
    "email_address": "ayresmic@msu.edu",
    "phone_number": "248 915 8722",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "216",
    "tax_amount": "12.96",
    "final_total": "228.96",
    "payments": "0",
    "balance": "-9.54",
    "total_pieces": "30"
  },
  "design_one": {
    "design_name": "V-Neck",
    "design_images_list": "S4VfbUvQk85GEX35proof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Black",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "7.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "2",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "8",
      "M": "9",
      "L": "6",
      "XL": "2",
      "2X": "3",
      "3X": "0",
      "4X": "0",
      "YXS": "0",
      "YS": "0",
      "YM": "0",
      "YL": "0",
      "QUOTE": "0"
    }
  },
  "old_db_id": "4170",
  "order_status": "Shirts Ordered",
  "due_date": "02/20/2015",
  "is_taxed": "0.06",
  "name": "Landshark Bar Crawl"
},
{
  "customer": {
    "first_name": "Tim",
    "last_name": "Dempsey",
    "email_address": "dempse43@msu.edu",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "110",
    "tax_amount": "6.6",
    "final_total": "116.60",
    "payments": "0",
    "balance": "58.30",
    "total_pieces": "11"
  },
  "design_one": {
    "design_name": "T-Shirt",
    "design_images_list": "3cBrdQyBhnnPmEpRproof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "High School",
    "product_colors": "Lime",
    "product_description": "Small - 2 Medium - 6 Large - 3",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "10.00",
    "product_socialprice": "0.00",
    "product_type_visible": "RD001 - 100% Cotton",
    "color_count": {
      "front": "1",
      "back": "0",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "2",
      "M": "6",
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
  "old_db_id": "4171",
  "order_status": "Shirts Received",
  "due_date": "02/20/2015",
  "is_taxed": "0.06",
  "name": "Hat Trick Floor Hockey"
},
{
  "customer": {
    "first_name": "Julie",
    "last_name": "Banks",
    "email_address": "",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "212.5",
    "tax_amount": "0",
    "final_total": "212.50",
    "payments": "0",
    "balance": "212.50",
    "total_pieces": "28"
  },
  "design_one": {
    "design_name": "Design 1 Tee",
    "design_images_list": ""
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Red",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "5.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "0",
      "M": "1",
      "L": "2",
      "XL": "0",
      "2X": "3",
      "3X": "0",
      "4X": "1",
      "YXS": "0",
      "YS": "2",
      "YM": "2",
      "YL": "1",
      "QUOTE": "0"
    }
  },
  "old_db_id": "4178",
  "order_status": "Shirts Ordered",
  "due_date": "02/20/2015",
  "is_taxed": "0.00",
  "name": "Red Friday"
},
{
  "customer": {
    "first_name": "Julie",
    "last_name": "Banks",
    "email_address": "",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "117",
    "tax_amount": "0",
    "final_total": "117.00",
    "payments": "0",
    "balance": "117.00",
    "total_pieces": "8"
  },
  "design_one": {
    "design_name": "Design 1 Fitted V",
    "design_images_list": ""
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Red ",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "8.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "0",
      "M": "0",
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
  "old_db_id": "4179",
  "order_status": "Shirts Ordered",
  "due_date": "02/20/2015",
  "is_taxed": "0.00",
  "name": "Red Friday"
},
{
  "customer": {
    "first_name": "LCC:",
    "last_name": "Mackenzie",
    "email_address": "draperm2@lcc.edu",
    "phone_number": "517-483-1678",
    "address_one": "Office of Student Life",
    "address_two": "411 N. Grand Ave. Room 25",
    "address_city": "Lansing",
    "address_state": "MI",
    "address_zip": "48933"
  },
  "order_summary": {
    "order_total": "400",
    "tax_amount": "0",
    "final_total": "400.00",
    "payments": "0",
    "balance": "400.00",
    "total_pieces": "100"
  },
  "design_one": {
    "design_name": "T-shirt",
    "design_images_list": "DNJFHtV8Fx07QSkQproof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Royal ",
    "product_description": "#P1502170 ",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "4.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "color_count": {
      "front": "2",
      "back": "2",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "20",
      "M": "50",
      "L": "30",
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
  "old_db_id": "4106",
  "order_status": "Completed - Unpaid",
  "due_date": "02/19/2015",
  "is_taxed": "0.00",
  "name": "LCC Student Life C4"
},
{
  "customer": {
    "first_name": "Laura",
    "last_name": "Zeller",
    "email_address": "zeller@impression5.org",
    "phone_number": "517-485-8116 ext #123",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "395",
    "tax_amount": "0",
    "final_total": "395.00",
    "payments": "0",
    "balance": "197.50",
    "total_pieces": "79"
  },
  "design_one": {
    "design_name": "T-shirt",
    "design_images_list": "N5R9Xq4Gf9347wCIFINAL.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "Navy",
    "product_description": "Quote 1:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "5.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "10",
      "M": "29",
      "L": "23",
      "XL": "17",
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
  "old_db_id": "4109",
  "order_status": "Completed - Unpaid",
  "due_date": "02/19/2015",
  "is_taxed": "0.00",
  "name": "Physics And Astronomy Day"
},
{
  "customer": {
    "first_name": "Lori",
    "last_name": "Fischer",
    "email_address": "lfischer@spartaninnovation.org",
    "phone_number": "517-884-4540",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "450",
    "tax_amount": "27",
    "final_total": "477.00",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "75"
  },
  "design_one": {
    "design_name": "T-shirt",
    "design_images_list": "JV0pUGQkwfPSsMGcFinalProof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Academic",
    "product_colors": "White",
    "product_description": "10 XL, 30 L, 30 M, 5 S",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "6.00",
    "product_socialprice": "0.00",
    "product_type_visible": "",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "5",
      "M": "30",
      "L": "30",
      "XL": "10",
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
  "old_db_id": "4158",
  "order_status": "Completed",
  "due_date": "02/19/2015",
  "is_taxed": "0.06",
  "name": "Lansing Start Up"
},
{
  "customer": {
    "first_name": "Ben",
    "last_name": "",
    "email_address": "benjamin.burton@legacymp.com",
    "phone_number": "734 642 6014",
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
    "design_name": "Canvas Tanks",
    "design_images_list": ""
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "B2B",
    "product_colors": "",
    "product_description": "",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "0.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
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
  "old_db_id": "4175",
  "order_status": "Archive",
  "due_date": "02/19/2015",
  "is_taxed": "0.06",
  "name": "Luke Reminder - Malibu Rum art"
},
{
  "customer": {
    "first_name": "",
    "last_name": "Kaitlyn",
    "email_address": "vaux.kait@gmail.com",
    "phone_number": "",
    "address_one": "6711 Yolanda Avenue",
    "address_two": "",
    "address_city": "Reseda",
    "address_state": "Ca",
    "address_zip": "91335"
  },
  "order_summary": {
    "order_total": "600",
    "tax_amount": "0",
    "final_total": "600.00",
    "payments": "0",
    "balance": "300.00",
    "total_pieces": "120"
  },
  "design_one": {
    "design_name": "Design 1 ",
    "design_images_list": "H9zJsxSDVNlgakUgloho1.gif"
  },
  "design_two": {
    "design_name": "Design 2 ",
    "design_images_list": "o9aW0yMiCAngerumLogo2.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Non Profit",
    "product_colors": "White",
    "product_description": "Quote 1:0Quote 2:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "5.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "0",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "30",
      "M": "27",
      "L": "10",
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
    "item_name": "Design 2 ",
    "design_images_list": "o9aW0yMiCAngerumLogo2.gif",
    "product_category": "Non Profit",
    "product_colors": "White",
    "product_description": "Quote 1:0Quote 2:0",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "5.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "0",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "25",
      "M": "20",
      "L": "3",
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
  "old_db_id": "4141",
  "order_status": "Completed - Unpaid",
  "due_date": "02/18/2015",
  "is_taxed": "0.00",
  "name": "Girls Camps Tees "
},
{
  "customer": {
    "first_name": "Anton",
    "last_name": "",
    "email_address": "anton.deavila@gmail.com",
    "phone_number": "(248) 622-7088",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "595",
    "tax_amount": "35.7",
    "final_total": "630.70",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "85"
  },
  "design_one": {
    "design_name": "T-Shirt",
    "design_images_list": "XSm74XppNYfhHGvkproof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Athletic Heather",
    "product_description": "Due Wednesday @ 10am",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "7.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "3",
      "back": "0",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "30",
      "M": "34",
      "L": "17",
      "XL": "4",
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
  "old_db_id": "4159",
  "order_status": "Completed",
  "due_date": "02/18/2015",
  "is_taxed": "0.06",
  "name": "Spartans Rebuilding Michigan SRM"
},
{
  "customer": {
    "first_name": "",
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
    "order_total": "0",
    "tax_amount": "0",
    "final_total": "0.00",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "1"
  },
  "design_one": {
    "design_name": "",
    "design_images_list": ""
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "",
    "product_description": "4158",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "0.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "1",
      "back": "1",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "1",
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
  "old_db_id": "4161",
  "order_status": "Completed",
  "due_date": "02/18/2015",
  "is_taxed": "0.06",
  "name": "Sample Shirt"
},
{
  "customer": {
    "first_name": "Jessica",
    "last_name": "Bonardelli",
    "email_address": "bonardel@msu.edu",
    "phone_number": "",
    "address_one": "",
    "address_two": "",
    "address_city": "",
    "address_state": "",
    "address_zip": ""
  },
  "order_summary": {
    "order_total": "156",
    "tax_amount": "9.36",
    "final_total": "165.36",
    "payments": "0",
    "balance": "0.00",
    "total_pieces": "13"
  },
  "design_one": {
    "design_name": "T-shirt",
    "design_images_list": "1aaRv5Abgff3RTeLproof.gif"
  },
  "cat_item_one": {
    "item_name": "",
    "design_images_list": "",
    "product_category": "Job Category",
    "product_colors": "Coral Silk",
    "product_description": " 3 small, 6 medium, 2 large, and 2 X-large.",
    "product_ishidden": "yes",
    "product_isindexed": "no",
    "product_price": "12.00",
    "product_socialprice": "0.00",
    "product_type_visible": "Shirt Style",
    "color_count": {
      "front": "2",
      "back": "0",
      "left": "0",
      "right": "0"
    },
    "sizes": {
      "S": "3",
      "M": "6",
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
  "old_db_id": "4163",
  "order_status": "Completed",
  "due_date": "02/18/2015",
  "is_taxed": "0.06",
  "name": "MSU Microbiology Club"
}
];
