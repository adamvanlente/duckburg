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
      }, 5000);
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

    count = duckburg.orderMaker.index + 1;
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

    var itemDict = {
      'GD110': {
        'key': 'Tv6wzkNpmD',
        'vis': '50/50 T-Shirt'
      },
      'GD210': {
       'key': 'xAE7OqOzFp',
       'vis': '100% Cotton T-Shirt'
      },
      'GD184': {
       'key': 'YCVhknr4CK',
       'vis': 'Gildan YOUTH Ultra Blend Pique Sport Shirt'
      },
      'GD342': {
       'key': 'xftemmTGBN',
       'vis': 'Gildan Heavy Blend Hooded Sweatshirt'
      },
     'TR401': {
       'key': 'gCA6t1UDg8',
       'vis': 'American Apparel Tri-Blend Short Sleeve Track Tee'
     },
     'GD201': {
       'key': 'aiWTKZapVG',
       'vis': 'Gildan Ultra Cotton Pocket T-Shirt'
     },
     'SF241': {
       'key': 'YCVhknr4CK',
       'vis': 'Gildan YOUTH Ultra Blend Pique Sport Shirt'
     },
     'GD342': {
       'key': 'xftemmTGBN',
       'vis': 'Gildan Heavy Blend™ Hooded Sweatshirt'
     },
     'GD344': {
       'key': 'ITOkPQLwtk',
       'vis': 'Gildan Youth Heavy Blend™ Hooded Sweatshirt'
     },
     'GD220': {
       'key': 'ei0JuR7g6C',
       'vis': 'Gildan Youth Heavy Cotton™ T-Shirt'
     },
     'AR081': {
       'key': 'XARecaZOWK',
       'vis': 'American Apparel Women\'s Tri-Blend Racerback Tank'
     },
     'BA280': {
       'key': '2GOnsb0hmu',
       'vis': 'Badger C2 Sport Performance Tee'
     },
     'GD207': {
       'key': '1MrjLcOzXr',
       'vis': 'Gildan Softstyle T-Shirt'
     },
     'GD178': {
       'key': 'BwLb87BYUP',
       'vis': 'Gildan Performance Double Pique Sport Shirt'
     },
     'JA268': {
       'key': 'YHlLVu6ovW',
       'vis': 'J America Game Day Jersey'
     },
     'AR110': {
       'key': 'AW8ORpnJSU',
       'vis': 'American Apparel Poly-Cotton Short Sleeve Tee'
     },
     'SF239': {
       'key': 'ncmFxQo17j',
       'vis': 'Soffe Baseball Jersey'
     },
     'GD102': {
       'key': 'eJjNKRhruP',
       'vis': 'Gildan DryBlend Pocket T-Shirt'
     },
     'GD006': {
       'key': 'umckTnU7jH',
       'vis': 'Gildan Ladies Softstyle V-Neck T-Shirt'
     },
     'BA238': {
       'key': 'jMuvdenR6N',
       'vis': 'Badger B-Core Baseball Undershirt'
     },
     'CV205': {
       'key': 'hOrkcQLtuk',
       'vis': 'BELLA + CANVAS Unisex Triblend Short Sleeve Tee'
     },
     'CV207': {
       'key': 'ggx7tfGA0R',
       'vis': 'BELLA + CANVAS Unisex Jersey Short Sleeve Tee'
     },
     'BL056': {
       'key': 'yVdF0RZZvN',
       'vis': 'BELLA + CANVAS Women\'s The Favorite Tee'
     },
     'CV250': {
       'key': 'RahogQcIqa',
       'vis': 'BELLA + CANVAS Unisex Jersey Tank'
     },
     'JZ385': {
       'key': '3Nsy5SMJjL',
       'vis': 'Jerzees NuBlend Pocketed Open Bottom Sweatpants'
     },
     'Gd094': {
       'key': 'GrvNaW0QK7',
       'vis': 'Gildan Ladies Heavy Blend Open Bottom Sweatpants'
     },
     'GD026': {
       'key': '9amwmqOJUF',
       'vis': 'Gildan Ladies Ultra Cotton T-Shirt'
     },
     'GD184': {
       'key': 'ItWxx45LZH',
       'vis': 'Gildan Ultra Cotton Long Sleeve T-Shirt'
     },
     'AR205': {
       'key': 'gCA6t1UDg8',
       'vis': 'American Apparel Tri-Blend Short Sleeve Track Tee'
     },
     'NB083': {
       'key': 'nSKQPuSWFQ',
       'vis': 'New Balance Ladies NDurance Athletic V-Neck T-Shirt'
     },
     'A4282': {
       'key': 'sBFboQg5jS',
       'vis': 'A4 Cooling Performance Crew'
     },
     'TD952': {
       'key': 'JHxwapmlhj',
       'vis': 'Tie Dye Spider Tie Dye T-Shirt'
     },
     'EZ031': {
       'key': 'weGuzTO9ym',
       'vis': 'Enza Ladies Essential Tank'
     },
     'GD024': {
       'key': 'xhLKyhUwAp',
       'vis': 'Gildan Ladies Heavy Cotton T-Shirt'
     },
     'GD046': {
       'key': 'um9DOLzeV2',
       'vis': 'Gildan Ladies Heavy Cotton V-Neck T-Shirt'
     },
     'GD360': {
       'key': 'zobeDSZMv0',
       'vis': 'Gildan Heavy Blend Crewneck Sweatshirt'
     }
    };

    var productTypeVisible = String(ci.product_type_visible).toUpperCase();
    productTypeVisible = productTypeVisible.split(' ').join('');
    if (productTypeVisible == '210') {
      productTypeVisible = 'GD210';
    }
    if (!productTypeVisible) {
      productTypeVisible = 'GD210';
    }
    var productType;

    console.log('PRODUCT------->', productTypeVisible);
    console.log('MAPPING------->', itemDict[productTypeVisible])

    if (!itemDict[productTypeVisible]) {
      var Unknown = Parse.Object.extend('dbUnknownCatalogItem');
      var unknownItem = new Unknown();
      unknownItem.set('item_name', productTypeVisible);
      unknownItem.save();
      productTypeVisible = '100% Cotton T-Shirt';
      productType = 'xAE7OqOzFp';
    } else {
      productType = itemDict[productTypeVisible].key;
      productTypeVisible = itemDict[productTypeVisible].vis;
    }

    parseCatalogItem.set('item_name', ci.item_name);
    parseCatalogItem.set('parse_search_string', ci.item_name.toLowerCase());
    parseCatalogItem.set('product_colors', ci.product_colors);
    parseCatalogItem.set('product_description', ci.product_description);
    parseCatalogItem.set('product_ishidden', ci.product_ishidden);
    parseCatalogItem.set('product_isindexed', ci.product_isindexed);
    parseCatalogItem.set('product_price', ci.product_price);
    parseCatalogItem.set('product_socialprice', ci.product_socialprice);
    parseCatalogItem.set('product_type_visible', productTypeVisible);
    parseCatalogItem.set('product_type', productType);
    parseCatalogItem.set('design_images_list', ci.design_images_list);
    parseCatalogItem.set('color_count', ci.color_count);
    parseCatalogItem.set('design_id', id);

    // Default to no Licensor.
    parseCatalogItem.set('design_licensor', '2TTmlcsPRY');
    parseCatalogItem.set('design_licensor_visible', 'NONE');

    parseCatalogItem.set('pickup_time', '10am');

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
            "first_name": "Ivy",
            "last_name": "Maday",
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
            "design_name": "American Apparel 50/50 Tee",
            "design_images_list": "YJ5OHpxREfI4vYJtfinal.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "Black Tri Blend ",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "10.00",
            "product_socialprice": "16.00",
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
        "old_db_id": "4660",
        "order_status": "Placed",
        "due_date": "08/31/2016",
        "is_taxed": "0.00",
        "name": "Arnesens Rocky Point"
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
            "total_pieces": "0"
        },
        "design_one": {
            "design_name": "Shirts",
            "design_images_list": "Zc6VaHCyvha9a9bzspartan-sprint.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "",
            "product_description": "",
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
        "old_db_id": "4772",
        "order_status": "Active",
        "due_date": "10/07/2015",
        "is_taxed": "0.06",
        "name": "Spartan Sprint "
    },
    {
        "customer": {
            "first_name": "Michelle",
            "last_name": "Carlson",
            "email_address": "mcarlson@cityofeastlansing.com",
            "phone_number": "517-930-1203",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "2265",
            "tax_amount": "135.9",
            "final_total": "2400.90",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "391"
        },
        "design_one": {
            "design_name": "Volunteer T-Shirts",
            "design_images_list": "qrokh0ivlXWKN8Hfvolunteer.gif"
        },
        "design_two": {
            "design_name": "T-Shirts",
            "design_images_list": "qrokh0ivlXWKN8Hfproof.gif"
        },
        "design_three": {
            "design_name": "Long Sleeve",
            "design_images_list": "qrokh0ivlXWKN8Hflong.gif"
        },
        "design_four": {
            "design_name": "Hoodies",
            "design_images_list": "qrokh0ivlXWKN8Hfhoodie.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "Cardinal Red",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd210 ",
            "color_count": {
                "front": "4",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "12",
                "M": "31",
                "L": "26",
                "XL": "20",
                "2X": "11",
                "3X": "1",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "0",
                "QUOTE": "0"
            }
        },
        "cat_item_two": {
            "item_name": "T-Shirts",
            "design_images_list": "qrokh0ivlXWKN8Hfproof.gif",
            "product_category": "Job Category",
            "product_colors": "Card Red",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd210 ",
            "color_count": {
                "front": "4",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "20",
                "M": "20",
                "L": "67",
                "XL": "114",
                "2X": "6",
                "3X": "1",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "0",
                "QUOTE": "0"
            }
        },
        "cat_item_three": {
            "item_name": "Long Sleeve",
            "design_images_list": "qrokh0ivlXWKN8Hflong.gif",
            "product_category": "Job Category",
            "product_colors": "Card Red ",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "8.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd184 ",
            "color_count": {
                "front": "4",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "5",
                "M": "10",
                "L": "10",
                "XL": "5",
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
        "cat_item_four": {
            "item_name": "Hoodies",
            "design_images_list": "qrokh0ivlXWKN8Hfhoodie.gif",
            "product_category": "Job Category",
            "product_colors": "Card Red ",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "12.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd342",
            "color_count": {
                "front": "4",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "5",
                "M": "10",
                "L": "10",
                "XL": "5",
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
        "old_db_id": "4479",
        "order_status": "Completed",
        "due_date": "09/30/2015",
        "is_taxed": "0.06",
        "name": "East Lansing Art Festival"
    },
    {
        "customer": {
            "first_name": "Marc",
            "last_name": "Colcer",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "1080",
            "tax_amount": "64.8",
            "final_total": "1144.80",
            "payments": "0",
            "balance": "1144.80",
            "total_pieces": "103"
        },
        "design_one": {
            "design_name": "Sports Bra",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "White",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "12.00",
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
                "QUOTE": "25"
            }
        },
        "old_db_id": "4670",
        "order_status": "Active",
        "due_date": "09/14/2015",
        "is_taxed": "0.06",
        "name": "MSU Competitive Cheer"
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
            "total_pieces": "0"
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
        "old_db_id": "4886",
        "order_status": "Active",
        "due_date": "09/14/2015",
        "is_taxed": "0.06",
        "name": "Nuthouse"
    },
    {
        "customer": {
            "first_name": "Adam",
            "last_name": "Phelps",
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
            "design_name": "Baseball Tees",
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
        "old_db_id": "4905",
        "order_status": "Active",
        "due_date": "09/14/2015",
        "is_taxed": "0.06",
        "name": "HOT SHOTS"
    },
    {
        "customer": {
            "first_name": "Mike",
            "last_name": "Romigh",
            "email_address": "neatmiker@gmail.com",
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
            "product_category": "Job Category",
            "product_colors": "",
            "product_description": "",
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
        "old_db_id": "4771",
        "order_status": "Active",
        "due_date": "09/11/2015",
        "is_taxed": "0.06",
        "name": "JACK - NO EXCUSES"
    },
    {
        "customer": {
            "first_name": "Michelle",
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
            "order_total": "323.5",
            "tax_amount": "0",
            "final_total": "323.50",
            "payments": "0",
            "balance": "323.50",
            "total_pieces": "35"
        },
        "design_one": {
            "design_name": "Womens V neck ",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "Navy",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "9.50",
            "product_socialprice": "0.00",
            "product_type_visible": "An031",
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
                "QUOTE": "17"
            }
        },
        "old_db_id": "4776",
        "order_status": "Active",
        "due_date": "09/11/2015",
        "is_taxed": "0.00",
        "name": "Vorys Houston"
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
            "total_pieces": "0"
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
        "old_db_id": "4833",
        "order_status": "Active",
        "due_date": "09/11/2015",
        "is_taxed": "0.06",
        "name": "Adam Reminder"
    },
    {
        "customer": {
            "first_name": "Megan",
            "last_name": "Henriksen",
            "email_address": "meganboone24@yahoo.com",
            "phone_number": "(630) 854-1591",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "888",
            "tax_amount": "0",
            "final_total": "888.00",
            "payments": "0",
            "balance": "888.00",
            "total_pieces": "150"
        },
        "design_one": {
            "design_name": "T-shirt ",
            "design_images_list": "rNhVbYMajFXLiTY9new.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "Naby",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.92",
            "product_socialprice": "0.00",
            "product_type_visible": "gd210",
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
                "QUOTE": "150"
            }
        },
        "old_db_id": "4889",
        "order_status": "Active",
        "due_date": "09/11/2015",
        "is_taxed": "0.00",
        "name": "Mi Remembers 2015 "
    },
    {
        "customer": {
            "first_name": "Victoria",
            "last_name": "Bowles",
            "email_address": "bowlesvi@gmail.com",
            "phone_number": "810 429 1079",
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
            "product_category": "Job Category",
            "product_colors": "",
            "product_description": "V-necks Regular T-Shirts Canvas/Gildan Softstyle American Apparel",
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
        "old_db_id": "4904",
        "order_status": "Active",
        "due_date": "09/11/2015",
        "is_taxed": "0.06",
        "name": "MSU ComArtSci"
    },
    {
        "customer": {
            "first_name": "Colter",
            "last_name": "Tupper",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "192",
            "tax_amount": "11.52",
            "final_total": "203.52",
            "payments": "0",
            "balance": "203.52",
            "total_pieces": "96"
        },
        "design_one": {
            "design_name": "Customer Supplied",
            "design_images_list": "hUxSH5snUpSsJVK3proof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "NEON ",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "2.00",
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
                "QUOTE": "96"
            }
        },
        "old_db_id": "4908",
        "order_status": "Active",
        "due_date": "09/11/2015",
        "is_taxed": "0.06",
        "name": "In Memory"
    },
    {
        "customer": {
            "first_name": "Matt",
            "last_name": "",
            "email_address": "elunderground@live.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "168",
            "tax_amount": "10.08",
            "final_total": "178.08",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "24"
        },
        "design_one": {
            "design_name": "50/50 T-shirt",
            "design_images_list": "MWK14ynReQgR9l9sproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "Navy ",
            "product_description": "4860",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.00",
            "product_socialprice": "0.00",
            "product_type_visible": "",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "2",
                "M": "0",
                "L": "10",
                "XL": "9",
                "2X": "2",
                "3X": "1",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "0",
                "QUOTE": "0"
            }
        },
        "old_db_id": "4911",
        "order_status": "Active",
        "due_date": "09/11/2015",
        "is_taxed": "0.06",
        "name": "East Lansing Underground Martial Arts"
    },
    {
        "customer": {
            "first_name": "Henry",
            "last_name": "Brimmer",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "780",
            "tax_amount": "0",
            "final_total": "780.00",
            "payments": "0",
            "balance": "780.00",
            "total_pieces": "120"
        },
        "design_one": {
            "design_name": "T-shirt",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "Black",
            "product_description": "10 XL 30 L 40 M 40 S ",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "6.50",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd210 ",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "40",
                "M": "40",
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
        "old_db_id": "4912",
        "order_status": "Active",
        "due_date": "09/11/2015",
        "is_taxed": "0.00",
        "name": "Minds Wide Open"
    },
    {
        "customer": {
            "first_name": "Deb",
            "last_name": "Zale",
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
            "total_pieces": "6"
        },
        "design_one": {
            "design_name": "Black w White Logo/Gloves",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "Black",
            "product_description": "4763",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "0.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd210 ",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
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
        "old_db_id": "4780",
        "order_status": "Quote",
        "due_date": "09/10/2015",
        "is_taxed": "0.06",
        "name": "MOS SHIRTS"
    },
    {
        "customer": {
            "first_name": "Aleida",
            "last_name": "Martinez",
            "email_address": "amtz06@gmail.com",
            "phone_number": "(956) 458 - 1926",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "330",
            "tax_amount": "0",
            "final_total": "330.00",
            "payments": "0",
            "balance": "330.00",
            "total_pieces": "60"
        },
        "design_one": {
            "design_name": "T-shirt",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "Maroon",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.50",
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
                "QUOTE": "60"
            }
        },
        "old_db_id": "4800",
        "order_status": "Active",
        "due_date": "09/10/2015",
        "is_taxed": "0.00",
        "name": "LTAs Volunteer "
    },
    {
        "customer": {
            "first_name": "Greg",
            "last_name": "",
            "email_address": "gregdarrow22@gmail.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "2794",
            "tax_amount": "167.64",
            "final_total": "2961.64",
            "payments": "0",
            "balance": "1481.64",
            "total_pieces": "479"
        },
        "design_one": {
            "design_name": "White Ink These sizes in 4 colors",
            "design_images_list": "SFCNqu2j8vJOyQwAcharcoal.gif"
        },
        "design_two": {
            "design_name": "Black Ink",
            "design_images_list": "RpyzyEsYOl3Fba1Zblackletter.gif"
        },
        "design_three": {
            "design_name": "Youth Tees ",
            "design_images_list": "Kx1dOReOEVzbgGecYouth.gif"
        },
        "design_four": {
            "design_name": "Hoodies White Ink",
            "design_images_list": "Kx1dOReOEVzbgGechoodie.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "See Note",
            "product_description": "Design 1 Dark Heather Heather Red Heather Sapphire Safety Orange",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd210",
            "color_count": {
                "front": "2",
                "back": "2",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "10",
                "M": "10",
                "L": "20",
                "XL": "20",
                "2X": "10",
                "3X": "0",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "0",
                "QUOTE": "210"
            }
        },
        "cat_item_two": {
            "item_name": "Black Ink",
            "design_images_list": "RpyzyEsYOl3Fba1Zblackletter.gif",
            "product_category": "Job Category",
            "product_colors": "Safety Green Heather Orange",
            "product_description": "Design 1 Dark Heather Heather Red Heather Sapphire Safety Orange",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd210 gd20",
            "color_count": {
                "front": "2",
                "back": "2",
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
                "QUOTE": "136"
            }
        },
        "cat_item_three": {
            "item_name": "Youth Tees ",
            "design_images_list": "Kx1dOReOEVzbgGecYouth.gif",
            "product_category": "Job Category",
            "product_colors": "Pink Irish Green Purple",
            "product_description": "Design 1 Dark Heather Heather Red Heather Sapphire Safety Orange",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.00",
            "product_socialprice": "0.00",
            "product_type_visible": "GD220",
            "color_count": {
                "front": "2",
                "back": "2",
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
        "cat_item_four": {
            "item_name": "Hoodies White Ink",
            "design_images_list": "Kx1dOReOEVzbgGechoodie.gif",
            "product_category": "Job Category",
            "product_colors": "Dark Heather and youth ",
            "product_description": "Design 1 Dark Heather Heather Red Heather Sapphire Safety Orange",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "12.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd344 gd34",
            "color_count": {
                "front": "2",
                "back": "2",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "10",
                "M": "10",
                "L": "10",
                "XL": "15",
                "2X": "10",
                "3X": "0",
                "4X": "0",
                "YXS": "0",
                "YS": "1",
                "YM": "1",
                "YL": "0",
                "QUOTE": "0"
            }
        },
        "old_db_id": "4899",
        "order_status": "Placed",
        "due_date": "09/10/2015",
        "is_taxed": "0.06",
        "name": "Darrow "
    },
    {
        "customer": {
            "first_name": "Erin",
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
            "order_total": "520",
            "tax_amount": "0",
            "final_total": "520.00",
            "payments": "0",
            "balance": "520.00",
            "total_pieces": "130"
        },
        "design_one": {
            "design_name": "Forest Green Tee",
            "design_images_list": "lxUCxlhto0Wqq97mproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "Forest ",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "4.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd210",
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
                "QUOTE": "130"
            }
        },
        "old_db_id": "4906",
        "order_status": "Active",
        "due_date": "09/10/2015",
        "is_taxed": "0.00",
        "name": "MPC Shirts"
    },
    {
        "customer": {
            "first_name": "Jessica",
            "last_name": "",
            "email_address": "rosieglynn1@gmail.com",
            "phone_number": "517 505 0788",
            "address_one": "2787 Moyer Road",
            "address_two": "",
            "address_city": "Williamston",
            "address_state": "MI",
            "address_zip": "48895"
        },
        "order_summary": {
            "order_total": "60",
            "tax_amount": "3.6",
            "final_total": "63.60",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "4"
        },
        "design_one": {
            "design_name": "American Apparel Racer",
            "design_images_list": "HewQUIjerxKrcuSBorchid.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Leisure",
            "product_colors": "orchid",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "15.00",
            "product_socialprice": "0.00",
            "product_type_visible": "ar081",
            "color_count": {
                "front": "1",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "3",
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
        "old_db_id": "4907",
        "order_status": "Placed",
        "due_date": "09/10/2015",
        "is_taxed": "0.06",
        "name": "Hey Violet"
    },
    {
        "customer": {
            "first_name": "Justin",
            "last_name": "Gouthro",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "150",
            "tax_amount": "9",
            "final_total": "159.00",
            "payments": "0",
            "balance": "159.00",
            "total_pieces": "15"
        },
        "design_one": {
            "design_name": "Tech Jersey",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "red",
            "product_description": "Sizes and Numbers: S - 1, 3, 13 (Total: 3) M - 4, 7, 12, 19, 27, 33 (Total: 6) L - 17, 21, 34 (Total: 3) XL - 11 (Total: 1) XXL - 5, 9 (Tot",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "10.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Ba280",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "3",
                "M": "6",
                "L": "3",
                "XL": "1",
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
        "old_db_id": "4910",
        "order_status": "Active",
        "due_date": "09/10/2015",
        "is_taxed": "0.06",
        "name": "Jerseys "
    },
    {
        "customer": {
            "first_name": "Maddie",
            "last_name": "",
            "email_address": "maddie.whitton@gmail.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "732",
            "tax_amount": "43.92",
            "final_total": "775.92",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "70"
        },
        "design_one": {
            "design_name": "Crop Tank",
            "design_images_list": "WlUKnc05hDj83Tp3tank.gif"
        },
        "design_two": {
            "design_name": "Bandeau ",
            "design_images_list": "WlUKnc05hDj83Tp3bandeau.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "White ",
            "product_description": "they need these SEPT 10",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "10.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Bella Crop",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "15",
                "M": "20",
                "L": "2",
                "XL": "0",
                "2X": "0",
                "3X": "0",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "0",
                "QUOTE": "1"
            }
        },
        "cat_item_two": {
            "item_name": "Bandeau ",
            "design_images_list": "WlUKnc05hDj83Tp3bandeau.gif",
            "product_category": "Job Category",
            "product_colors": "White",
            "product_description": "they need these SEPT 10",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "11.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Bella",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "9",
                "M": "20",
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
        "old_db_id": "4662",
        "order_status": "Shirts Ordered",
        "due_date": "09/09/2015",
        "is_taxed": "0.06",
        "name": "Theta Tanks and Tops"
    },
    {
        "customer": {
            "first_name": "Kimberly",
            "last_name": "",
            "email_address": "kimberlylevon@gmail.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "340",
            "tax_amount": "20.4",
            "final_total": "360.40",
            "payments": "0",
            "balance": "360.40",
            "total_pieces": "30"
        },
        "design_one": {
            "design_name": "T-Shirts",
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
                "QUOTE": "10"
            }
        },
        "old_db_id": "4706",
        "order_status": "Placed",
        "due_date": "09/09/2015",
        "is_taxed": "0.06",
        "name": "Mike's"
    },
    {
        "customer": {
            "first_name": "Jeff",
            "last_name": "",
            "email_address": "jefferymarsh.85@gmail.com",
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
            "total_pieces": "12"
        },
        "design_one": {
            "design_name": "Tall Pocket Tees",
            "design_images_list": "ifbzF8tarsi6Jt5iproof.gif"
        },
        "design_two": {
            "design_name": "Tall Pocket Tees",
            "design_images_list": "ifbzF8tarsi6Jt5isport.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "Charcoal",
            "product_description": "4668",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "0.00",
            "product_socialprice": "0.00",
            "product_type_visible": "HS4506t",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "0",
                "L": "6",
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
            "item_name": "Tall Pocket Tees",
            "design_images_list": "ifbzF8tarsi6Jt5isport.gif",
            "product_category": "Job Category",
            "product_colors": "Sport Grey",
            "product_description": "4668",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "0.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Hs450t",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "0",
                "L": "6",
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
        "old_db_id": "4789",
        "order_status": "Shirts Received",
        "due_date": "09/09/2015",
        "is_taxed": "0.06",
        "name": "Hosco"
    },
    {
        "customer": {
            "first_name": "Allison",
            "last_name": "Jeter",
            "email_address": "",
            "phone_number": " 734.677.4692",
            "address_one": "ATTN: Allison Jeter",
            "address_two": "2850 South Industrial Hwy",
            "address_city": "Ann Arbor",
            "address_state": "MI",
            "address_zip": "48104"
        },
        "order_summary": {
            "order_total": "126",
            "tax_amount": "0",
            "final_total": "126.00",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "14"
        },
        "design_one": {
            "design_name": "T-shirt",
            "design_images_list": "MnJQ5Z6KpoYccLwnproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "Navy",
            "product_description": "Last order: 4814 CC #9678 Payment: walkers@umich.edu NEEDS TO ARRIVE BY SEPT 10",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "9.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd207",
            "color_count": {
                "front": "2",
                "back": "2",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "0",
                "L": "0",
                "XL": "7",
                "2X": "5",
                "3X": "0",
                "4X": "0",
                "YXS": "1",
                "YS": "1",
                "YM": "0",
                "YL": "0",
                "QUOTE": "0"
            }
        },
        "old_db_id": "4852",
        "order_status": "Active",
        "due_date": "09/09/2015",
        "is_taxed": "0.00",
        "name": " U of M /Ann Arbor Kidney Walk"
    },
    {
        "customer": {
            "first_name": "Jason",
            "last_name": "",
            "email_address": "",
            "phone_number": "517.719.0897",
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
            "total_pieces": "17"
        },
        "design_one": {
            "design_name": "Charcoal TriBlend",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "",
            "product_description": "4798",
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
                "L": "5",
                "XL": "12",
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
        "old_db_id": "4853",
        "order_status": "Shirts Received",
        "due_date": "09/09/2015",
        "is_taxed": "0.06",
        "name": "IQ Fit Missing Shirts"
    },
    {
        "customer": {
            "first_name": "Kari",
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
            "order_total": "795",
            "tax_amount": "0",
            "final_total": "795.00",
            "payments": "0",
            "balance": "795.00",
            "total_pieces": "79"
        },
        "design_one": {
            "design_name": "Crew Neck Sweatshirt",
            "design_images_list": "RRMaMV7mZL2t90FDproof.gif"
        },
        "design_two": {
            "design_name": "Men's Tech Polos",
            "design_images_list": "NJLgqcMrRA6Gi9Xapolo.gif"
        },
        "design_four": {
            "design_name": "Long Sleeve Tee ",
            "design_images_list": "n1XWhvODTMReKtX1longsleeve.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "Sport Grey",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "12.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "7",
                "M": "9",
                "L": "3",
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
            "item_name": "Men's Tech Polos",
            "design_images_list": "NJLgqcMrRA6Gi9Xapolo.gif",
            "product_category": "Job Category",
            "product_colors": "Forest",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "0.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd178",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "2",
                "M": "6",
                "L": "6",
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
            "item_name": "Long Sleeve Tee ",
            "design_images_list": "n1XWhvODTMReKtX1longsleeve.gif",
            "product_category": "Job Category",
            "product_colors": "Black",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "20.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Ja268",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "7",
                "M": "7",
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
        "old_db_id": "4873",
        "order_status": "Active",
        "due_date": "09/09/2015",
        "is_taxed": "0.00",
        "name": "BROAD SENATE "
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
            "order_total": "308",
            "tax_amount": "18.48",
            "final_total": "326.48",
            "payments": "0",
            "balance": "276.48",
            "total_pieces": "28"
        },
        "design_one": {
            "design_name": "AA poly cotton",
            "design_images_list": "Sjwz1tTgVZVGMEjwproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "heather kelly",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "11.00",
            "product_socialprice": "0.00",
            "product_type_visible": "AR110",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "7",
                "M": "4",
                "L": "11",
                "XL": "5",
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
        "old_db_id": "4877",
        "order_status": "Placed",
        "due_date": "09/09/2015",
        "is_taxed": "0.06",
        "name": "Community Crossfit Sanction"
    },
    {
        "customer": {
            "first_name": "Gail",
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
            "order_total": "770",
            "tax_amount": "46.2",
            "final_total": "816.20",
            "payments": "0",
            "balance": "816.20",
            "total_pieces": "120"
        },
        "design_one": {
            "design_name": "Wuck",
            "design_images_list": "U8U3gOs17Jm0E4ULWuck.gif"
        },
        "design_two": {
            "design_name": "Fathead Benny Shirts",
            "design_images_list": "pjqBxcAijrYu8rx4proof.gif"
        },
        "design_three": {
            "design_name": "Free Pizza!",
            "design_images_list": "pjqBxcAijrYu8rx4free-pizza-day.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "Forest",
            "product_description": "3721 pizza day is this day 5-6",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.00",
            "product_socialprice": "0.00",
            "product_type_visible": "GD210",
            "color_count": {
                "front": "1",
                "back": "3",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "5",
                "L": "10",
                "XL": "10",
                "2X": "5",
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
            "item_name": "Fathead Benny Shirts",
            "design_images_list": "pjqBxcAijrYu8rx4proof.gif",
            "product_category": "Job Category",
            "product_colors": "Black",
            "product_description": "3721 pizza day is this day 5-6",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "8.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd210",
            "color_count": {
                "front": "4",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "10",
                "M": "10",
                "L": "20",
                "XL": "20",
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
        "cat_item_three": {
            "item_name": "Free Pizza!",
            "design_images_list": "pjqBxcAijrYu8rx4free-pizza-day.gif",
            "product_category": "Job Category",
            "product_colors": "gold",
            "product_description": "3721 pizza day is this day 5-6",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "0.00",
            "product_socialprice": "0.00",
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
                "L": "8",
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
        "old_db_id": "4884",
        "order_status": "Shirts Received",
        "due_date": "09/09/2015",
        "is_taxed": "0.06",
        "name": "Goombas "
    },
    {
        "customer": {
            "first_name": "Ivy",
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
            "total_pieces": "36"
        },
        "design_one": {
            "design_name": "T-shirt AA ",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "Tri-Black",
            "product_description": "ORDER 2X FROM TSC",
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
                "S": "6",
                "M": "8",
                "L": "10",
                "XL": "8",
                "2X": "4",
                "3X": "0",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "0",
                "QUOTE": "0"
            }
        },
        "old_db_id": "4892",
        "order_status": "Shirts Ordered",
        "due_date": "09/09/2015",
        "is_taxed": "0.06",
        "name": "Rocky Point "
    },
    {
        "customer": {
            "first_name": "Jeremy",
            "last_name": "Sprague",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "819",
            "tax_amount": "49.14",
            "final_total": "868.14",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "111"
        },
        "design_one": {
            "design_name": "Crew Neck Tee",
            "design_images_list": "Frx5h855zgnqnzFgproof.gif"
        },
        "design_two": {
            "design_name": "Ladies Crew",
            "design_images_list": "XL4gvLCS1sI7iM4nbellacrew.gif"
        },
        "design_three": {
            "design_name": "Ladies V-neck",
            "design_images_list": "D1TlAoQz5DpSDuz0vneck.gif"
        },
        "design_four": {
            "design_name": "Hooded Sweatshirt",
            "design_images_list": "D1TlAoQz5DpSDuz0hoodie.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "Various Colors",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.00",
            "product_socialprice": "0.00",
            "product_type_visible": "GD210",
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
                "QUOTE": "58"
            }
        },
        "cat_item_two": {
            "item_name": "Ladies Crew",
            "design_images_list": "XL4gvLCS1sI7iM4nbellacrew.gif",
            "product_category": "Job Category",
            "product_colors": "Various",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "6.00",
            "product_socialprice": "0.00",
            "product_type_visible": "bl056 ",
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
                "QUOTE": "21"
            }
        },
        "cat_item_three": {
            "item_name": "Ladies V-neck",
            "design_images_list": "D1TlAoQz5DpSDuz0vneck.gif",
            "product_category": "Job Category",
            "product_colors": "various",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "8.00",
            "product_socialprice": "0.00",
            "product_type_visible": "bl055",
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
                "QUOTE": "11"
            }
        },
        "cat_item_four": {
            "item_name": "Hooded Sweatshirt",
            "design_images_list": "D1TlAoQz5DpSDuz0hoodie.gif",
            "product_category": "Job Category",
            "product_colors": "Various",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "15.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd342 ",
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
                "QUOTE": "21"
            }
        },
        "old_db_id": "4881",
        "order_status": "Shirts Ordered",
        "due_date": "09/08/2015",
        "is_taxed": "0.06",
        "name": "Sleepwalker"
    },
    {
        "customer": {
            "first_name": "Madison",
            "last_name": "Levy",
            "email_address": "mcatlvy@gmail.com",
            "phone_number": "5177409598",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "272",
            "tax_amount": "16.32",
            "final_total": "288.32",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "17"
        },
        "design_one": {
            "design_name": "T-shirt",
            "design_images_list": "qGPmOKXq9WQtUgCBproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "Black",
            "product_description": "Quote 1:10",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "16.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "11",
                "M": "3",
                "L": "2",
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
        "old_db_id": "4890",
        "order_status": "Shirts Ordered",
        "due_date": "09/08/2015",
        "is_taxed": "0.06",
        "name": "HanToes 21st"
    },
    {
        "customer": {
            "first_name": "Stavros",
            "last_name": "",
            "email_address": "stavros.lee@gmail.com",
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
            "product_colors": "",
            "product_description": "",
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
        "old_db_id": "4903",
        "order_status": "Shirts Ordered",
        "due_date": "09/08/2015",
        "is_taxed": "0.06",
        "name": "Ticktr Missing Items"
    },
    {
        "customer": {
            "first_name": "Jayden",
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
            "order_total": "310",
            "tax_amount": "18.6",
            "final_total": "328.60",
            "payments": "0",
            "balance": "164.30",
            "total_pieces": "20"
        },
        "design_one": {
            "design_name": "Pocket Tee",
            "design_images_list": "aduiscvBmk6iF4MTproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "White",
            "product_description": "15 Large, 10 Medium and 5 Small f add 2 Small, 7 Medium and 11 Large",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "15.50",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd102",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "2",
                "M": "7",
                "L": "11",
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
        "old_db_id": "4900",
        "order_status": "Shirts Ordered",
        "due_date": "09/08/2015",
        "is_taxed": "0.06",
        "name": "Phi Tau "
    },
    {
        "customer": {
            "first_name": "Deb",
            "last_name": "Zale",
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
            "total_pieces": "26"
        },
        "design_one": {
            "design_name": "Azalea V-NECK Fitted White Ink",
            "design_images_list": "q3YkDiPQe0ROnomTvneck.gif"
        },
        "design_two": {
            "design_name": "Black Fitted Round White Ink ",
            "design_images_list": "q3YkDiPQe0ROnomTRBR.gif"
        },
        "design_three": {
            "design_name": "Unisex Black",
            "design_images_list": "q3YkDiPQe0ROnomTRBR.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Job Category",
            "product_colors": "Azalea",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.75",
            "product_socialprice": "0.00",
            "product_type_visible": "gd006",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "2",
                "M": "1",
                "L": "1",
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
            "item_name": "BlackFittedRoundWhiteInk",
            "design_images_list": "q3YkDiPQe0ROnomTRBR.gif",
            "product_category": "JobCategory",
            "product_colors": "Black",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.75",
            "product_socialprice": "0.00",
            "product_type_visible": "gd026",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "5",
                "M": "3",
                "L": "4",
                "XL": "3",
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
            "item_name": "Unisex Black",
            "design_images_list": "q3YkDiPQe0ROnomTRBR.gif",
            "product_category": "Job Category",
            "product_colors": "Black",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd210",
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
        "old_db_id": "4909",
        "order_status": "ShirtsOrdered",
        "due_date": "09/08/2015",
        "is_taxed": "0.06",
        "name": ""
    },
    {
        "customer": {
            "first_name": "Michael",
            "last_name": "Cass",
            "email_address": "cassmich@msu.edu",
            "phone_number": "(586)747-3902",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "1425",
            "tax_amount": "85.5",
            "final_total": "1510.50",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "300"
        },
        "design_one": {
            "design_name": "T-shirt",
            "design_images_list": "ZnRyEWmr8ez0fifQproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "Red",
            "product_description": "S: 105M: 105L: 60XL: 30",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "4.75",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd210",
            "color_count": {
                "front": "3",
                "back": "2",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "105",
                "M": "105",
                "L": "60",
                "XL": "30",
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
        "old_db_id": "4888",
        "order_status": "ShirtsOrdered",
        "due_date": "09/07/2015",
        "is_taxed": "0.06",
        "name": "SpartanSkiClub2015"
    },
    {
        "customer": {
            "first_name": "Juan",
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
            "total_pieces": "10"
        },
        "design_one": {
            "design_name": "Tees",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "HeatherGray",
            "product_description": "Dueatnoon",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "0.00",
            "product_socialprice": "0.00",
            "product_type_visible": "210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "1",
                "M": "4",
                "L": "5",
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
        "old_db_id": "4717",
        "order_status": "Completed",
        "due_date": "09/04/2015",
        "is_taxed": "0.06",
        "name": "StateSkate"
    },
    {
        "customer": {
            "first_name": "Debra",
            "last_name": "K.",
            "email_address": "drousseau@ingham.org",
            "phone_number": "(517)483-6211",
            "address_one": "",
            "address_two": "5172857428Cell",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "358.5",
            "tax_amount": "0",
            "final_total": "358.50",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "50"
        },
        "design_one": {
            "design_name": "BaseballJerseys(Cotton",
            "design_images_list": "rqRBVWA1zpFXvUc6proof.gif"
        },
        "design_two": {
            "design_name": "Tri-BlendUnisexCanvasTees",
            "design_images_list": "rqRBVWA1zpFXvUc6proof2.gif"
        },
        "design_three": {
            "design_name": "TechBaseballTee",
            "design_images_list": "ENDxHAedCGHj2yfAproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "NonProfit",
            "product_colors": "White/RoyalBlue",
            "product_description": "NEEDSbySEPT7(absolutelatestsept8)",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.75",
            "product_socialprice": "0.00",
            "product_type_visible": "sf239",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "1",
                "M": "7",
                "L": "8",
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
            "item_name": "Tri-BlendUnisexCanvasTees",
            "design_images_list": "rqRBVWA1zpFXvUc6proof2.gif",
            "product_category": "NonProfit",
            "product_colors": "Royal",
            "product_description": "NEEDSbySEPT7(absolutelatestsept8)",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "6.59",
            "product_socialprice": "0.00",
            "product_type_visible": "Cv205",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "1",
                "M": "7",
                "L": "8",
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
        "cat_item_three": {
            "item_name": "TechBaseballTee",
            "design_images_list": "ENDxHAedCGHj2yfAproof.gif",
            "product_category": "NonProfit",
            "product_colors": "Badger",
            "product_description": "NEEDSbySEPT7(absolutelatestsept8)",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "11.00",
            "product_socialprice": "0.00",
            "product_type_visible": "ba238",
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
        "old_db_id": "4836",
        "order_status": "Completed",
        "due_date": "09/04/2015",
        "is_taxed": "0.00",
        "name": "SmallTalk"
    },
    {
        "customer": {
            "first_name": "Louis",
            "last_name": "",
            "email_address": "fkmatic@gmail.com",
            "phone_number": "2488967677",
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
            "total_pieces": "12"
        },
        "design_one": {
            "design_name": "T-Shirts",
            "design_images_list": "hu9vRz1ewCj2BZMhproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "white",
            "product_description": "4304",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "13.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Retrofit",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "2",
                "L": "4",
                "XL": "4",
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
        "old_db_id": "4856",
        "order_status": "Completed",
        "due_date": "09/04/2015",
        "is_taxed": "0.06",
        "name": "PaidDaCostFishbowl"
    },
    {
        "customer": {
            "first_name": "Dionnedra",
            "last_name": "Bond",
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
            "design_name": "BlackTee",
            "design_images_list": "DdBr8oTwhq35iAnnproof-2.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "Black",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "12.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd210",
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
        "old_db_id": "4879",
        "order_status": "Archive",
        "due_date": "09/04/2015",
        "is_taxed": "0.06",
        "name": "L.SoulTees"
    },
    {
        "customer": {
            "first_name": "Nina",
            "last_name": "",
            "email_address": "nina.santucci@gmail.com",
            "phone_number": "(517)679-6309",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "456",
            "tax_amount": "27.36",
            "final_total": "483.36",
            "payments": "0",
            "balance": "483.36",
            "total_pieces": "52"
        },
        "design_one": {
            "design_name": "PurpleCarrotShirtssizesineachcolor",
            "design_images_list": "maoBGfoYrvpQ8lJgteal.gif"
        },
        "design_two": {
            "design_name": "RedHavenShirts",
            "design_images_list": "maoBGfoYrvpQ8lJgcrew.gif"
        },
        "design_three": {
            "design_name": "RedHavenLadiestee",
            "design_images_list": "maoBGfoYrvpQ8lJgcrew.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "9.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Cv207",
            "color_count": {
                "front": "3",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "2",
                "M": "5",
                "L": "2",
                "XL": "1",
                "2X": "0",
                "3X": "0",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "0",
                "QUOTE": "20"
            }
        },
        "cat_item_two": {
            "item_name": "RedHavenShirts",
            "design_images_list": "maoBGfoYrvpQ8lJgcrew.gif",
            "product_category": "Academic",
            "product_colors": "Black",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "9.00",
            "product_socialprice": "0.00",
            "product_type_visible": "CV207",
            "color_count": {
                "front": "3",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "2",
                "M": "5",
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
        "cat_item_three": {
            "item_name": "RedHavenLadiestee",
            "design_images_list": "maoBGfoYrvpQ8lJgcrew.gif",
            "product_category": "Academic",
            "product_colors": "black",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "8.00",
            "product_socialprice": "0.00",
            "product_type_visible": "bl056",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "3",
                "L": "5",
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
        "old_db_id": "4882",
        "order_status": "ShirtsReceived",
        "due_date": "09/04/2015",
        "is_taxed": "0.06",
        "name": "RedHaven/PurpleCarrot"
    },
    {
        "customer": {
            "first_name": "Erik",
            "last_name": "",
            "email_address": "erikf1210@hotmail.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "170",
            "tax_amount": "10.2",
            "final_total": "180.20",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "85"
        },
        "design_one": {
            "design_name": "Tees",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "Black",
            "product_description": "4838",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "2.00",
            "product_socialprice": "0.00",
            "product_type_visible": "210",
            "color_count": {
                "front": "1",
                "back": "5",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "15",
                "L": "26",
                "XL": "7",
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
        "old_db_id": "4896",
        "order_status": "Completed",
        "due_date": "09/04/2015",
        "is_taxed": "0.06",
        "name": "PSIUFallRushShortSleeve"
    },
    {
        "customer": {
            "first_name": "Lyndra",
            "last_name": "Tingley",
            "email_address": "ltingley@wcusd200.org",
            "phone_number": "",
            "address_one": "3201HerculesRd",
            "address_two": "",
            "address_city": "Woodstock",
            "address_state": "IL",
            "address_zip": "60098"
        },
        "order_summary": {
            "order_total": "495",
            "tax_amount": "0",
            "final_total": "495.00",
            "payments": "0",
            "balance": "495.00",
            "total_pieces": "99"
        },
        "design_one": {
            "design_name": "CottonT-shirt",
            "design_images_list": "E0VWcG1wcdZxoVUV4.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "SportGrey",
            "product_description": "3741design4AS45AM30AL10AXL1A2XL1YM4YL8",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "45",
                "M": "30",
                "L": "10",
                "XL": "1",
                "2X": "1",
                "3X": "0",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "4",
                "YL": "8",
                "QUOTE": "0"
            }
        },
        "old_db_id": "4787",
        "order_status": "Completed-Unpaid",
        "due_date": "09/03/2015",
        "is_taxed": "0.00",
        "name": "CreeksideOrchestra"
    },
    {
        "customer": {
            "first_name": "Roland",
            "last_name": "",
            "email_address": "healthycoachrol@gmail.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "354",
            "tax_amount": "21.24",
            "final_total": "375.24",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "22"
        },
        "design_one": {
            "design_name": "TankTop",
            "design_images_list": "4gl44eqIq9yqE0ottanks.gif"
        },
        "design_two": {
            "design_name": "Men'sPants",
            "design_images_list": "4gl44eqIq9yqE0otpants.gif"
        },
        "design_three": {
            "design_name": "LadiesPants",
            "design_images_list": "4gl44eqIq9yqE0otpants.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "Black",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "15.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Cv250",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "2",
                "M": "5",
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
        "cat_item_two": {
            "item_name": "Men'sPants",
            "design_images_list": "4gl44eqIq9yqE0otpants.gif",
            "product_category": "JobCategory",
            "product_colors": "Black",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "17.00",
            "product_socialprice": "0.00",
            "product_type_visible": "JZ385",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "1",
                "M": "3",
                "L": "3",
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
            "item_name": "LadiesPants",
            "design_images_list": "4gl44eqIq9yqE0otpants.gif",
            "product_category": "JobCategory",
            "product_colors": "Black",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "17.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd094",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "2",
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
        "old_db_id": "4878",
        "order_status": "Completed",
        "due_date": "09/03/2015",
        "is_taxed": "0.06",
        "name": "GetRoFit"
    },
    {
        "customer": {
            "first_name": "Ian",
            "last_name": "Darling",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "224",
            "tax_amount": "13.44",
            "final_total": "237.44",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "28"
        },
        "design_one": {
            "design_name": "PocketTee",
            "design_images_list": "gicIBYE5bAatu7Ltproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "White",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "8.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd102",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "6",
                "L": "11",
                "XL": "7",
                "2X": "4",
                "3X": "0",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "0",
                "QUOTE": "0"
            }
        },
        "old_db_id": "4885",
        "order_status": "Completed",
        "due_date": "09/03/2015",
        "is_taxed": "0.06",
        "name": "AlphaGammaRho"
    },
    {
        "customer": {
            "first_name": "Deb",
            "last_name": "Zale",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "84.75",
            "tax_amount": "5.085",
            "final_total": "89.84",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "12"
        },
        "design_one": {
            "design_name": "T-shirt",
            "design_images_list": "XRzVEUarE0bw5Ae2redflag.gif"
        },
        "design_two": {
            "design_name": "Women'sFittedTee",
            "design_images_list": "6YBpnW95FnQe8rgzredflag.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "Red",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "1",
                "L": "4",
                "XL": "4",
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
            "item_name": "Women'sFittedTee",
            "design_images_list": "6YBpnW95FnQe8rgzredflag.gif",
            "product_category": "JobCategory",
            "product_colors": "Red",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.75",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd026",
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
        "old_db_id": "4893",
        "order_status": "Completed",
        "due_date": "09/03/2015",
        "is_taxed": "0.06",
        "name": "MOSShirts"
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
            "order_total": "131",
            "tax_amount": "0",
            "final_total": "144.00",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "16"
        },
        "design_one": {
            "design_name": "Design1T-shirt",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "Red",
            "product_description": "Quotes=CustomerSupplied////Shipping=1PoloXLAdultGD174red",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "1",
                "L": "1",
                "XL": "2",
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
        "old_db_id": "4894",
        "order_status": "Completed",
        "due_date": "09/03/2015",
        "is_taxed": "0.00",
        "name": "RedFriday"
    },
    {
        "customer": {
            "first_name": "Ryan",
            "last_name": "Balderas",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "50",
            "tax_amount": "3",
            "final_total": "53.00",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "9"
        },
        "design_one": {
            "design_name": "CustomerSupplied",
            "design_images_list": "E8J5GzUrfdSZkWvsproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "various",
            "product_description": "",
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
                "QUOTE": "8"
            }
        },
        "old_db_id": "4901",
        "order_status": "Completed",
        "due_date": "09/03/2015",
        "is_taxed": "0.06",
        "name": "MCFoucault"
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
            "total_pieces": "0"
        },
        "design_one": {
            "design_name": "",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "",
            "product_description": "",
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
        "old_db_id": "4880",
        "order_status": "Completed",
        "due_date": "09/02/2015",
        "is_taxed": "0.06",
        "name": "Shy"
    },
    {
        "customer": {
            "first_name": "Leslie",
            "last_name": "",
            "email_address": "armelllemsu@gmail.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "125",
            "tax_amount": "0",
            "final_total": "125.00",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "25"
        },
        "design_one": {
            "design_name": "Tees",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "athleticheather",
            "product_description": "9small9medium7large",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "9",
                "M": "9",
                "L": "7",
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
        "old_db_id": "4897",
        "order_status": "Completed",
        "due_date": "09/02/2015",
        "is_taxed": "0.00",
        "name": "CRC"
    },
    {
        "customer": {
            "first_name": "Michelle",
            "last_name": "Kryska",
            "email_address": "michkryska@gmail.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "90",
            "tax_amount": "5.4",
            "final_total": "95.40",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "9"
        },
        "design_one": {
            "design_name": "UnisexT-Shirts",
            "design_images_list": "nlbfSVqCt22jFdIlbad-bad-girl.jpg"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "Red",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "10.00",
            "product_socialprice": "0.00",
            "product_type_visible": "GD210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "3",
                "M": "5",
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
        "old_db_id": "4898",
        "order_status": "Completed",
        "due_date": "09/02/2015",
        "is_taxed": "0.06",
        "name": "Zoombathon"
    },
    {
        "customer": {
            "first_name": "George",
            "last_name": "Hoover",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "283.75",
            "tax_amount": "17.025",
            "final_total": "300.78",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "227"
        },
        "design_one": {
            "design_name": "OrangeKoozie",
            "design_images_list": "qKYXBSGic73m0UgDcottage.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "",
            "product_description": "needs10amTuesday",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "1.25",
            "product_socialprice": "0.00",
            "product_type_visible": "",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "227",
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
        "old_db_id": "4837",
        "order_status": "Completed",
        "due_date": "09/01/2015",
        "is_taxed": "0.06",
        "name": "CottageInnKoozie"
    },
    {
        "customer": {
            "first_name": "Elizabeth",
            "last_name": "Brandon",
            "email_address": "elizabeth.brandon@gmail.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "143",
            "tax_amount": "8.58",
            "final_total": "151.58",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "11"
        },
        "design_one": {
            "design_name": "Men",
            "design_images_list": "kBPbJLB99xqK3Zvuspartanaviators.pdf"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "white",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "13.00",
            "product_socialprice": "0.00",
            "product_type_visible": "210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "1",
                "M": "3",
                "L": "4",
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
        "old_db_id": "4865",
        "order_status": "Completed",
        "due_date": "09/01/2015",
        "is_taxed": "0.06",
        "name": "SpartanAviation"
    },
    {
        "customer": {
            "first_name": "Britany",
            "last_name": "Benson",
            "email_address": "bensonb5@msu.edu",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "1175",
            "tax_amount": "0",
            "final_total": "1175.00",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "235"
        },
        "design_one": {
            "design_name": "BroadLovesLansing",
            "design_images_list": "LTW3O7HpwSlWww48both.gif"
        },
        "design_two": {
            "design_name": "GalleryGuide",
            "design_images_list": "LTW3O7HpwSlWww480O0dt96lVViBlgeFproofblack.gif"
        },
        "design_three": {
            "design_name": "Logo",
            "design_images_list": "LTW3O7HpwSlWww48NIaUFRPjlKZCUHaUproof.gif"
        },
        "design_four": {
            "design_name": "Logo2",
            "design_images_list": "LTW3O7HpwSlWww48gr.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "DHeatheryellowandpink",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.00",
            "product_socialprice": "0.00",
            "product_type_visible": "210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "10",
                "M": "10",
                "L": "10",
                "XL": "0",
                "2X": "0",
                "3X": "0",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "4",
                "YL": "6",
                "QUOTE": "0"
            }
        },
        "cat_item_two": {
            "item_name": "GalleryGuide",
            "design_images_list": "LTW3O7HpwSlWww480O0dt96lVViBlgeFproofblack.gif",
            "product_category": "Academic",
            "product_colors": "Black",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.00",
            "product_socialprice": "0.00",
            "product_type_visible": "210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "12",
                "M": "12",
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
            "item_name": "Logo",
            "design_images_list": "LTW3O7HpwSlWww48NIaUFRPjlKZCUHaUproof.gif",
            "product_category": "Academic",
            "product_colors": "charcoal",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.00",
            "product_socialprice": "0.00",
            "product_type_visible": "210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "15",
                "M": "15",
                "L": "15",
                "XL": "10",
                "2X": "6",
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
            "item_name": "Logo2",
            "design_images_list": "LTW3O7HpwSlWww48gr.gif",
            "product_category": "Academic",
            "product_colors": "Forest",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.00",
            "product_socialprice": "0.00",
            "product_type_visible": "210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "25",
                "M": "25",
                "L": "30",
                "XL": "20",
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
        "old_db_id": "4870",
        "order_status": "Completed",
        "due_date": "09/01/2015",
        "is_taxed": "0.00",
        "name": "BroadMassOrder"
    },
    {
        "customer": {
            "first_name": "Steve",
            "last_name": "Trecha",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "288",
            "tax_amount": "17.28",
            "final_total": "305.28",
            "payments": "0",
            "balance": "305.28",
            "total_pieces": "36"
        },
        "design_one": {
            "design_name": "CottonT-shirt",
            "design_images_list": "Z8vOJE1f0TyHdXYZproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "NeonGreen",
            "product_description": "NEEDSBYSEPT1",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "8.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "20",
                "M": "12",
                "L": "2",
                "XL": "0",
                "2X": "0",
                "3X": "0",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "2",
                "QUOTE": "0"
            }
        },
        "old_db_id": "4874",
        "order_status": "Completed",
        "due_date": "09/01/2015",
        "is_taxed": "0.06",
        "name": "ELXC2015"
    },
    {
        "customer": {
            "first_name": "Michelle",
            "last_name": "",
            "email_address": "lucasm10@msu.edu",
            "phone_number": "(313)706-0297",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "350",
            "tax_amount": "0",
            "final_total": "350.00",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "50"
        },
        "design_one": {
            "design_name": "CottonT-shirt",
            "design_images_list": "M8vXOCi3oOH40JYiproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "Gravel",
            "product_description": "1PM",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "9",
                "M": "15",
                "L": "15",
                "XL": "9",
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
        "old_db_id": "4876",
        "order_status": "Completed",
        "due_date": "09/01/2015",
        "is_taxed": "0.00",
        "name": "Wonderbodies"
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
            "total_pieces": "0"
        },
        "design_one": {
            "design_name": "",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "",
            "product_description": "",
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
        "old_db_id": "4887",
        "order_status": "Completed",
        "due_date": "09/01/2015",
        "is_taxed": "0.06",
        "name": "IvySocialOrderReminder"
    },
    {
        "customer": {
            "first_name": "Ivy",
            "last_name": "Maday",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "390",
            "tax_amount": "0",
            "final_total": "390.00",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "60"
        },
        "design_one": {
            "design_name": "HeatherNavyPolyCotton",
            "design_images_list": "2IhcrjwPoqJ4lZViproof2.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "HeatherNaby",
            "product_description": "NEEDSBYFRIDAY",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "6.50",
            "product_socialprice": "0.00",
            "product_type_visible": "cv207",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "4",
                "M": "8",
                "L": "15",
                "XL": "15",
                "2X": "12",
                "3X": "6",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "0",
                "QUOTE": "0"
            }
        },
        "old_db_id": "4891",
        "order_status": "Completed",
        "due_date": "09/01/2015",
        "is_taxed": "0.00",
        "name": "ArnesensRockyPoint"
    },
    {
        "customer": {
            "first_name": "Dillon",
            "last_name": "/",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "20",
            "tax_amount": "1.2",
            "final_total": "21.20",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "1"
        },
        "design_one": {
            "design_name": "CustomerSupplied",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "20.00",
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
                "QUOTE": "1"
            }
        },
        "old_db_id": "4902",
        "order_status": "Completed",
        "due_date": "09/01/2015",
        "is_taxed": "0.06",
        "name": "1morejerseyPAA"
    },
    {
        "customer": {
            "first_name": "James",
            "last_name": "J",
            "email_address": "millarj3@msu.edu",
            "phone_number": "5176148965",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "144",
            "tax_amount": "8.64",
            "final_total": "152.64",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "12"
        },
        "design_one": {
            "design_name": "T-shirt",
            "design_images_list": "Wv9GtYl6qPf8I6w8proof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "CarolinaBlue",
            "product_description": "About12-24Shirts",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "12.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "4",
                "M": "4",
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
        "old_db_id": "4867",
        "order_status": "Completed",
        "due_date": "08/31/2015",
        "is_taxed": "0.06",
        "name": "UNAMSU"
    },
    {
        "customer": {
            "first_name": "Stephanie",
            "last_name": "Cockrell",
            "email_address": "cockrells@broad.msu.edu",
            "phone_number": "520.248.5888",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "1875",
            "tax_amount": "0",
            "final_total": "1875.00",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "500"
        },
        "design_one": {
            "design_name": "T-shirt",
            "design_images_list": "zGZB3fbVkmPGxfC3proof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "Forest",
            "product_description": "6246#Lastfourdigitsofccused",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "3.75",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "75",
                "M": "175",
                "L": "200",
                "XL": "50",
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
        "old_db_id": "4875",
        "order_status": "Completed",
        "due_date": "08/31/2015",
        "is_taxed": "0.00",
        "name": "SupplyChain"
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
            "order_total": "259.3",
            "tax_amount": "15.558",
            "final_total": "274.86",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "80"
        },
        "design_one": {
            "design_name": "50/50T-shirtYellow",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "daisy",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "2.75",
            "product_socialprice": "0.00",
            "product_type_visible": "gd110",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "0",
                "L": "15",
                "XL": "15",
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
        "old_db_id": "4895",
        "order_status": "Completed",
        "due_date": "08/31/2015",
        "is_taxed": "0.06",
        "name": "ShirtsforWill"
    },
    {
        "customer": {
            "first_name": "Gina",
            "last_name": "Barbaglia",
            "email_address": "barbagl5@msu.edu",
            "phone_number": "1847-204-5511",
            "address_one": "1034S.HarrisonRd",
            "address_two": "",
            "address_city": "EastLansing",
            "address_state": "MI",
            "address_zip": "48823"
        },
        "order_summary": {
            "order_total": "900",
            "tax_amount": "54",
            "final_total": "954.00",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "180"
        },
        "design_one": {
            "design_name": "T-shirt",
            "design_images_list": "lhvE4gqFSpYsdlLKproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "Darkgray",
            "product_description": "Quote1: 0",
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
                "S": "75",
                "M": "75",
                "L": "25",
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
        "old_db_id": "4827",
        "order_status": "Completed",
        "due_date": "08/29/2015",
        "is_taxed": "0.06",
        "name": "PrePaShirts"
    },
    {
        "customer": {
            "first_name": "Brian",
            "last_name": "",
            "email_address": "bsegge@gmail.com",
            "phone_number": "3605472572",
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
            "product_colors": "Garnet",
            "product_description": "About75-99Shirts",
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
        "old_db_id": "4796",
        "order_status": "Archive",
        "due_date": "08/28/2015",
        "is_taxed": "0.06",
        "name": "PsiU"
    },
    {
        "customer": {
            "first_name": "ATTN: ",
            "last_name": "Linda",
            "email_address": "",
            "phone_number": "882-5779",
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
            "balance": "0.00",
            "total_pieces": "55"
        },
        "design_one": {
            "design_name": "Gildan100%CottonTees",
            "design_images_list": "EvRiXBiLkaDSu9q5proof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "Cobalt",
            "product_description": "cc: LibbyStrpko/student'smom",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "8.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "19",
                "M": "18",
                "L": "13",
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
        "old_db_id": "4813",
        "order_status": "Completed",
        "due_date": "08/28/2015",
        "is_taxed": "0.00",
        "name": "LansingChristianSeniors"
    },
    {
        "customer": {
            "first_name": "Erik",
            "last_name": "",
            "email_address": "erikf1210@hotmail.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "1020",
            "tax_amount": "61.2",
            "final_total": "1081.20",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "85"
        },
        "design_one": {
            "design_name": "LongSleeveTee",
            "design_images_list": "LCZde5zUg11cQxBrfallrush.gif"
        },
        "design_two": {
            "design_name": "Longsleevetee",
            "design_images_list": "LCZde5zUg11cQxBrwhite.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "Black",
            "product_description": "FridayAfternoon",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "12.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd184",
            "color_count": {
                "front": "1",
                "back": "5",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "15",
                "L": "26",
                "XL": "7",
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
            "item_name": "Longsleevetee",
            "design_images_list": "LCZde5zUg11cQxBrwhite.gif",
            "product_category": "Academic",
            "product_colors": "White",
            "product_description": "FridayAfternoon",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "12.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd184",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "2",
                "M": "17",
                "L": "13",
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
        "old_db_id": "4838",
        "order_status": "Completed",
        "due_date": "08/28/2015",
        "is_taxed": "0.06",
        "name": "PSIUFallRush"
    },
    {
        "customer": {
            "first_name": "Kyle",
            "last_name": "Sims",
            "email_address": "simskyle2307@gmail.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "444",
            "tax_amount": "26.64",
            "final_total": "470.64",
            "payments": "0",
            "balance": "470.64",
            "total_pieces": "74"
        },
        "design_one": {
            "design_name": "T-shirt",
            "design_images_list": "Rnvwk2q5pt1PDsr0final.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "LightBlue",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "6.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "6",
                "M": "18",
                "L": "41",
                "XL": "8",
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
        "old_db_id": "4839",
        "order_status": "Completed",
        "due_date": "08/28/2015",
        "is_taxed": "0.06",
        "name": "LambdaChiFallRush"
    },
    {
        "customer": {
            "first_name": "Jasmine",
            "last_name": "",
            "email_address": "wattsjas@msu.edu",
            "phone_number": "3134337948",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "72",
            "tax_amount": "4.32",
            "final_total": "76.32",
            "payments": "0",
            "balance": "76.32",
            "total_pieces": "6"
        },
        "design_one": {
            "design_name": "CustomerSupplied",
            "design_images_list": "t95Jwu10bMfVsB2Eproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "12.00",
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
        "old_db_id": "4871",
        "order_status": "Completed-Unpaid",
        "due_date": "08/28/2015",
        "is_taxed": "0.06",
        "name": "UrbanDreams"
    },
    {
        "customer": {
            "first_name": "Herm",
            "last_name": "",
            "email_address": "",
            "phone_number": "5172561967",
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
            "balance": "0.00",
            "total_pieces": "100"
        },
        "design_one": {
            "design_name": "T-shirt",
            "design_images_list": "RAMofFWtK2vefwCiFINALPROOF.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "White",
            "product_description": "3886",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "3.50",
            "product_socialprice": "0.00",
            "product_type_visible": "gd210",
            "color_count": {
                "front": "2",
                "back": "2",
                "left": "1",
                "right": "1"
            },
            "sizes": {
                "S": "30",
                "M": "30",
                "L": "40",
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
        "old_db_id": "4872",
        "order_status": "Completed",
        "due_date": "08/28/2015",
        "is_taxed": "0.06",
        "name": "TeamRicksShirts"
    },
    {
        "customer": {
            "first_name": "Roland",
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
            "design_name": "Pants",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "black",
            "product_description": "",
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
                "QUOTE": "1"
            }
        },
        "old_db_id": "4883",
        "order_status": "Completed",
        "due_date": "08/28/2015",
        "is_taxed": "0.06",
        "name": "PantsbiggerprintGetRoFit"
    },
    {
        "customer": {
            "first_name": "Angie",
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
            "order_total": "1020",
            "tax_amount": "0",
            "final_total": "1020.00",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "170"
        },
        "design_one": {
            "design_name": "VolunteerTees",
            "design_images_list": "QnmTdDRWFISsLyqXVOLUN.gif"
        },
        "design_two": {
            "design_name": "OtherTees",
            "design_images_list": "QnmTdDRWFISsLyqXproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "SafetyOrange",
            "product_description": "Quote1: 0Quote2: 0",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "6.00",
            "product_socialprice": "0.00",
            "product_type_visible": "",
            "color_count": {
                "front": "2",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "5",
                "M": "6",
                "L": "6",
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
            "item_name": "OtherTees",
            "design_images_list": "QnmTdDRWFISsLyqXproof.gif",
            "product_category": "JobCategory",
            "product_colors": "Skyblue",
            "product_description": "Quote1: 0Quote2: 0",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "6.00",
            "product_socialprice": "0.00",
            "product_type_visible": "GD210",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "18",
                "M": "27",
                "L": "27",
                "XL": "20",
                "2X": "1",
                "3X": "0",
                "4X": "0",
                "YXS": "0",
                "YS": "14",
                "YM": "25",
                "YL": "18",
                "QUOTE": "0"
            }
        },
        "old_db_id": "4773",
        "order_status": "Completed",
        "due_date": "08/27/2015",
        "is_taxed": "0.00",
        "name": "WhitehillsElementary5K"
    },
    {
        "customer": {
            "first_name": "Dan",
            "last_name": "Romigh",
            "email_address": "wodkilla22@yahoo.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "150",
            "tax_amount": "9",
            "final_total": "159.00",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "10"
        },
        "design_one": {
            "design_name": "AmericanApparelTriBlendTee",
            "design_images_list": "QHIZdSHbrgFA1cRnproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "Tri-Black",
            "product_description": "1womenstanksmall",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "15.00",
            "product_socialprice": "25.00",
            "product_type_visible": "AA-TR401",
            "color_count": {
                "front": "3",
                "back": "3",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "2",
                "M": "0",
                "L": "5",
                "XL": "2",
                "2X": "0",
                "3X": "0",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "0",
                "QUOTE": "1"
            }
        },
        "old_db_id": "4781",
        "order_status": "Completed",
        "due_date": "08/27/2015",
        "is_taxed": "0.06",
        "name": "Crossfit"
    },
    {
        "customer": {
            "first_name": "Greg",
            "last_name": "Darrow",
            "email_address": "gregdarrow22@gmail.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "240",
            "tax_amount": "14.4",
            "final_total": "254.40",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "16"
        },
        "design_one": {
            "design_name": "PerformanceTees",
            "design_images_list": "l3nryWmtAzWM7tWpNEW.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "B2B",
            "product_colors": "Navy",
            "product_description": "4073",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "15.00",
            "product_socialprice": "0.00",
            "product_type_visible": "BA280",
            "color_count": {
                "front": "2",
                "back": "2",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "0",
                "L": "8",
                "XL": "8",
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
        "old_db_id": "4809",
        "order_status": "Completed",
        "due_date": "08/27/2015",
        "is_taxed": "0.06",
        "name": "DarrowWaterHaul"
    },
    {
        "customer": {
            "first_name": "Nathan",
            "last_name": "Feldpausch",
            "email_address": "williamstonstrength@yahoo.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "602",
            "tax_amount": "36.12",
            "final_total": "638.12",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "43"
        },
        "design_one": {
            "design_name": "TriblendTees",
            "design_images_list": "RwF5Tm9UVvAAsn7Ffinal.gif"
        },
        "design_two": {
            "design_name": "TriblendTees",
            "design_images_list": "RwF5Tm9UVvAAsn7Fnoathlete.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "EmeraldTriblend",
            "product_description": "Quote1: 0Quote2: 0",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "14.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Cv205",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "6",
                "M": "15",
                "L": "4",
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
        "cat_item_two": {
            "item_name": "TriblendTees",
            "design_images_list": "RwF5Tm9UVvAAsn7Fnoathlete.gif",
            "product_category": "JobCategory",
            "product_colors": "EmeraldTriblend",
            "product_description": "Quote1: 0Quote2: 0",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "14.00",
            "product_socialprice": "0.00",
            "product_type_visible": "cv205",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "2",
                "M": "5",
                "L": "6",
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
        "old_db_id": "4855",
        "order_status": "Completed",
        "due_date": "08/27/2015",
        "is_taxed": "0.06",
        "name": "WilliamstonCrossfit"
    },
    {
        "customer": {
            "first_name": "Matt",
            "last_name": "",
            "email_address": "elunderground@live.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "210",
            "tax_amount": "12.6",
            "final_total": "222.60",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "30"
        },
        "design_one": {
            "design_name": "50/50T-shirt",
            "design_images_list": "JkzRs84cNbIzCUciproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "Navy",
            "product_description": "OURLOGOPLUS1color4T",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.00",
            "product_socialprice": "0.00",
            "product_type_visible": "",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "4",
                "M": "10",
                "L": "10",
                "XL": "5",
                "2X": "0",
                "3X": "0",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "0",
                "QUOTE": "1"
            }
        },
        "old_db_id": "4860",
        "order_status": "Completed",
        "due_date": "08/27/2015",
        "is_taxed": "0.06",
        "name": "EastLansingUndergroundMartialArts"
    },
    {
        "customer": {
            "first_name": "Steve",
            "last_name": "May",
            "email_address": "smayvball@hotmail.com",
            "phone_number": "5173039776",
            "address_one": "125LexingtonDrive",
            "address_two": "",
            "address_city": "McMurray",
            "address_state": "PA",
            "address_zip": "15317"
        },
        "order_summary": {
            "order_total": "377",
            "tax_amount": "22.62",
            "final_total": "399.62",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "35"
        },
        "design_one": {
            "design_name": "NewBalanceLadiesJerseys",
            "design_images_list": "DrRn4484za1ATbfJprimalnew.gif"
        },
        "design_two": {
            "design_name": "MaleA4TechTees",
            "design_images_list": "q5nZi0VhgQy87P6bprimalnew.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "Navy",
            "product_description": "473313Small16Medium2LargeIntheMale/unisexcut1Medium2Large1XL",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "11.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Nb083",
            "color_count": {
                "front": "4",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "13",
                "M": "16",
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
        "cat_item_two": {
            "item_name": "MaleA4TechTees",
            "design_images_list": "q5nZi0VhgQy87P6bprimalnew.gif",
            "product_category": "Academic",
            "product_colors": "Navy",
            "product_description": "473313Small16Medium2LargeIntheMale/unisexcut1Medium2Large1XL",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "9.00",
            "product_socialprice": "0.00",
            "product_type_visible": "A4282",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "1",
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
        "old_db_id": "4862",
        "order_status": "Completed",
        "due_date": "08/27/2015",
        "is_taxed": "0.06",
        "name": "Primal"
    },
    {
        "customer": {
            "first_name": "Julie",
            "last_name": "Powers",
            "email_address": "jpowers155@gmail.com",
            "phone_number": "3014523693",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "240",
            "tax_amount": "14.4",
            "final_total": "254.40",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "24"
        },
        "design_one": {
            "design_name": "TyeDye",
            "design_images_list": "ABxl8U2U47jUXCSs4851.jpg"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "Kelly",
            "product_description": "About12-24ShirtsSmall-1Medium-5Large-9XL-4XXL-4XXXL-1",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "10.00",
            "product_socialprice": "0.00",
            "product_type_visible": "TD952",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "1",
                "M": "5",
                "L": "9",
                "XL": "4",
                "2X": "4",
                "3X": "1",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "0",
                "QUOTE": "0"
            }
        },
        "old_db_id": "4851",
        "order_status": "Completed",
        "due_date": "08/26/2015",
        "is_taxed": "0.06",
        "name": "SurvivorSquirrells"
    },
    {
        "customer": {
            "first_name": "LaDontaye",
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
            "order_total": "96",
            "tax_amount": "5.76",
            "final_total": "101.76",
            "payments": "0",
            "balance": "101.76",
            "total_pieces": "8"
        },
        "design_one": {
            "design_name": "Tanks",
            "design_images_list": "JIhgWrPn5yeBpnwKfitkick.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "DarkHeather",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "12.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Ez031",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "6",
                "M": "2",
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
        "old_db_id": "4861",
        "order_status": "Completed-Unpaid",
        "due_date": "08/26/2015",
        "is_taxed": "0.06",
        "name": "EliteTanks: FitKICK"
    },
    {
        "customer": {
            "first_name": "Samantha",
            "last_name": "Mitchelson",
            "email_address": "samitchelson@yahoo.com",
            "phone_number": "6166480086",
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
            "product_colors": "AntiqueIrishGreen",
            "product_description": "About12-24Shirts",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "14.00",
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
        "old_db_id": "4866",
        "order_status": "Quote",
        "due_date": "08/26/2015",
        "is_taxed": "0.06",
        "name": "BarCrawlThursdayAm"
    },
    {
        "customer": {
            "first_name": "Samantha",
            "last_name": "Mitchelson",
            "email_address": "samitchelson@yahoo.com",
            "phone_number": "6166480086",
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
            "total_pieces": "13"
        },
        "design_one": {
            "design_name": "T-Shirts",
            "design_images_list": "AHiUkbL3VKOSlWkWPROOF-2.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "AntiqueIrishGreen",
            "product_description": "9Smalls1Medium3Larges",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "10.00",
            "product_socialprice": "0.00",
            "product_type_visible": "",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "9",
                "M": "1",
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
        "old_db_id": "4868",
        "order_status": "Completed",
        "due_date": "08/26/2015",
        "is_taxed": "0.06",
        "name": "BarCrawlShirts"
    },
    {
        "customer": {
            "first_name": "Mandy",
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
            "order_total": "497",
            "tax_amount": "29.82",
            "final_total": "526.82",
            "payments": "0",
            "balance": "-7.42",
            "total_pieces": "71"
        },
        "design_one": {
            "design_name": "RoyalBlueTees",
            "design_images_list": "R00TbIxae9Pi0zipproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "Royal",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.00",
            "product_socialprice": "0.00",
            "product_type_visible": "GD210",
            "color_count": {
                "front": "3",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "5",
                "M": "10",
                "L": "24",
                "XL": "22",
                "2X": "8",
                "3X": "1",
                "4X": "1",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "0",
                "QUOTE": "0"
            }
        },
        "old_db_id": "4723",
        "order_status": "Completed",
        "due_date": "08/25/2015",
        "is_taxed": "0.06",
        "name": "FresMedicalCenter"
    },
    {
        "customer": {
            "first_name": "Michael",
            "last_name": "M",
            "email_address": "spartanspirits@spartanspirits.com",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "270",
            "tax_amount": "16.2",
            "final_total": "286.20",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "60"
        },
        "design_one": {
            "design_name": "Opentil",
            "design_images_list": "29JDaN5JlOsX05PAproof-2.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "B2B",
            "product_colors": "Forest",
            "product_description": "265120M20Women’sM10L10XL",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "4.50",
            "product_socialprice": "0.00",
            "product_type_visible": "gd210",
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
                "QUOTE": "60"
            }
        },
        "old_db_id": "4785",
        "order_status": "Completed",
        "due_date": "08/25/2015",
        "is_taxed": "0.06",
        "name": "SpartanSpirits"
    },
    {
        "customer": {
            "first_name": "Stavros",
            "last_name": "",
            "email_address": "stavros.lee@gmail.com",
            "phone_number": "",
            "address_one": "55pagestreet",
            "address_two": "#727",
            "address_city": "SanFrancisco",
            "address_state": "CA",
            "address_zip": "94102"
        },
        "order_summary": {
            "order_total": "492.5",
            "tax_amount": "29.55",
            "final_total": "522.05",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "80"
        },
        "design_one": {
            "design_name": "Men",
            "design_images_list": "wUvYVFAQOmgV0NbmqHo8AARvSynDtMM7proof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "AN207",
            "product_description": "4230Men'stshirts45(nonvneck)M20L19XL6Women'sbabydoll35S20M15",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.50",
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
                "M": "20",
                "L": "19",
                "XL": "6",
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
        "old_db_id": "4819",
        "order_status": "Completed",
        "due_date": "08/25/2015",
        "is_taxed": "0.06",
        "name": "Ticktr"
    },
    {
        "customer": {
            "first_name": "Connie",
            "last_name": "Benedict",
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
            "product_category": "JobCategory",
            "product_colors": "",
            "product_description": "3–Pink-Small2-Grey-Medium1-Grey-Large(adult)",
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
        "old_db_id": "4848",
        "order_status": "Completed",
        "due_date": "08/25/2015",
        "is_taxed": "0.06",
        "name": "SpartanPerformanceREDO"
    },
    {
        "customer": {
            "first_name": "Deb",
            "last_name": "Zale",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "105",
            "tax_amount": "6.3",
            "final_total": "111.30",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "15"
        },
        "design_one": {
            "design_name": "AzaleaRoundFitted",
            "design_images_list": "WemfkyMpommnfjAdproof.gif"
        },
        "design_two": {
            "design_name": "WhiteV-neckFitted",
            "design_images_list": "nWqbRBtZHWGWAfzgwhite.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "Azalea",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd024",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "4",
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
                "QUOTE": "2"
            }
        },
        "cat_item_two": {
            "item_name": "WhiteV-neckFitted",
            "design_images_list": "nWqbRBtZHWGWAfzgwhite.gif",
            "product_category": "JobCategory",
            "product_colors": "White",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd046",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "2",
                "M": "0",
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
        "old_db_id": "4857",
        "order_status": "Completed",
        "due_date": "08/25/2015",
        "is_taxed": "0.06",
        "name": "RelatedbyRhinestones"
    },
    {
        "customer": {
            "first_name": "Deb",
            "last_name": "Zale",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "105",
            "tax_amount": "6.3",
            "final_total": "111.30",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "15"
        },
        "design_one": {
            "design_name": "WhiteFittedTee",
            "design_images_list": "Usj0iueuMNGJnz0uwhitecrew.gif"
        },
        "design_two": {
            "design_name": "SportGreyWomensVNEck",
            "design_images_list": "hxkwUTS2CHS2jCvIsport-grey.gif"
        },
        "design_three": {
            "design_name": "BlackV-neck",
            "design_images_list": "WryP32Ltw41qUIzdv-neck.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "White",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd024",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "2",
                "M": "1",
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
            "item_name": "SportGreyWomensVNEck",
            "design_images_list": "hxkwUTS2CHS2jCvIsport-grey.gif",
            "product_category": "JobCategory",
            "product_colors": "Sportgrey",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd046",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "2",
                "M": "0",
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
        "cat_item_three": {
            "item_name": "BlackV-neck",
            "design_images_list": "WryP32Ltw41qUIzdv-neck.gif",
            "product_category": "JobCategory",
            "product_colors": "black",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "7.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd046",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "2",
                "M": "1",
                "L": "1",
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
        "old_db_id": "4858",
        "order_status": "Completed",
        "due_date": "08/25/2015",
        "is_taxed": "0.06",
        "name": "RelatedbyRhinestones2"
    },
    {
        "customer": {
            "first_name": "Shelby",
            "last_name": "McComb",
            "email_address": "Shelby.McComb@cumulus.com",
            "phone_number": "517-648-4623",
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
            "total_pieces": "150"
        },
        "design_one": {
            "design_name": "whitetees",
            "design_images_list": "MDgVto2nlZ9P9Dycproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "white",
            "product_description": "60large35xl30med152xl10small",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "0.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd210",
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
                "QUOTE": "150"
            }
        },
        "old_db_id": "4859",
        "order_status": "Completed",
        "due_date": "08/25/2015",
        "is_taxed": "0.06",
        "name": "97.5"
    },
    {
        "customer": {
            "first_name": "Matt",
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
            "order_total": "230",
            "tax_amount": "13.8",
            "final_total": "243.80",
            "payments": "0",
            "balance": "243.80",
            "total_pieces": "38"
        },
        "design_one": {
            "design_name": "T-Shirts",
            "design_images_list": "Ktmc8rrMSHmxkPaXwu.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "black",
            "product_description": "3kidsshirts",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "5.00",
            "product_socialprice": "0.00",
            "product_type_visible": "207",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "7",
                "M": "7",
                "L": "7",
                "XL": "7",
                "2X": "5",
                "3X": "0",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "0",
                "QUOTE": "3"
            }
        },
        "old_db_id": "4869",
        "order_status": "Completed-Unpaid",
        "due_date": "08/25/2015",
        "is_taxed": "0.06",
        "name": "SaddlebackWu-Tang"
    },
    {
        "customer": {
            "first_name": "Kara",
            "last_name": "Richardson",
            "email_address": "kara@msu.edu",
            "phone_number": "517-884-8012",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "180",
            "tax_amount": "0",
            "final_total": "180.00",
            "payments": "0",
            "balance": "180.00",
            "total_pieces": "19"
        },
        "design_one": {
            "design_name": "T-shirt",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "ForestGreen",
            "product_description": "S–3M–5L–6XL–42X-13X–1",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "10.00",
            "product_socialprice": "0.00",
            "product_type_visible": "GD210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "3",
                "M": "5",
                "L": "4",
                "XL": "4",
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
        "old_db_id": "4811",
        "order_status": "Completed-Unpaid",
        "due_date": "08/24/2015",
        "is_taxed": "0.00",
        "name": "AIS"
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
            "total_pieces": "0"
        },
        "design_one": {
            "design_name": "",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "",
            "product_description": "",
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
        "old_db_id": "4829",
        "order_status": "Completed",
        "due_date": "08/24/2015",
        "is_taxed": "0.06",
        "name": "IvySocialOrderReminder"
    },
    {
        "customer": {
            "first_name": "Melissa",
            "last_name": "Lincoln",
            "email_address": "",
            "phone_number": "586.436.5871",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "57",
            "tax_amount": "0",
            "final_total": "57.00",
            "payments": "0",
            "balance": "57.00",
            "total_pieces": "12"
        },
        "design_one": {
            "design_name": "Tee",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "Purple",
            "product_description": "4758",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "4.75",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
                "M": "2",
                "L": "2",
                "XL": "2",
                "2X": "6",
                "3X": "0",
                "4X": "0",
                "YXS": "0",
                "YS": "0",
                "YM": "0",
                "YL": "0",
                "QUOTE": "0"
            }
        },
        "old_db_id": "4835",
        "order_status": "Completed-Unpaid",
        "due_date": "08/24/2015",
        "is_taxed": "0.00",
        "name": "PotterParkZooAAZK"
    },
    {
        "customer": {
            "first_name": "Kate",
            "last_name": "Chen",
            "email_address": "chenyuc2@msu.edu",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "88.2",
            "tax_amount": "0",
            "final_total": "88.20",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "14"
        },
        "design_one": {
            "design_name": "Tee",
            "design_images_list": "5J8IBJDmBp8rjWkQviolet.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "Violet",
            "product_description": "4644",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "6.30",
            "product_socialprice": "0.00",
            "product_type_visible": "an490(TSC",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "8",
                "M": "6",
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
        "old_db_id": "4840",
        "order_status": "Completed",
        "due_date": "08/24/2015",
        "is_taxed": "0.00",
        "name": "ChineseSummerCampREORDER"
    },
    {
        "customer": {
            "first_name": "Kara",
            "last_name": "Richardson",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "10",
            "tax_amount": "0",
            "final_total": "10.00",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "1"
        },
        "design_one": {
            "design_name": "(Samet-shirtasothers",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "forest",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "10.00",
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
        "old_db_id": "4863",
        "order_status": "Completed",
        "due_date": "08/24/2015",
        "is_taxed": "0.00",
        "name": "AIS/1extrashirt"
    },
    {
        "customer": {
            "first_name": "Kara",
            "last_name": "Richardson",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "10",
            "tax_amount": "0",
            "final_total": "10.00",
            "payments": "0",
            "balance": "10.00",
            "total_pieces": "1"
        },
        "design_one": {
            "design_name": "(Samet-shirtasothers",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "forest",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "10.00",
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
        "old_db_id": "4864",
        "order_status": "Quote",
        "due_date": "08/24/2015",
        "is_taxed": "0.00",
        "name": "AIS/1extrashirt"
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
            "total_pieces": "2"
        },
        "design_one": {
            "design_name": "Crewnecksweatshirt",
            "design_images_list": "FzWsIjdSV7nSlam94769.gif"
        },
        "design_two": {
            "design_name": "Longsleeve",
            "design_images_list": "FzWsIjdSV7nSlam94769.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "forest",
            "product_description": "4769",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "0.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd360",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
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
        "cat_item_two": {
            "item_name": "Longsleeve",
            "design_images_list": "FzWsIjdSV7nSlam94769.gif",
            "product_category": "JobCategory",
            "product_colors": "Forest",
            "product_description": "4769",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "0.00",
            "product_socialprice": "0.00",
            "product_type_visible": "gd184",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "0",
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
        "old_db_id": "4826",
        "order_status": "Completed",
        "due_date": "08/21/2015",
        "is_taxed": "0.06",
        "name": "WhenyouprintthoseToddlerTEES"
    },
    {
        "customer": {
            "first_name": "Dillon",
            "last_name": "McGough",
            "email_address": "dillonmcgough@gmail.com",
            "phone_number": "734-934-7293",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "240",
            "tax_amount": "14.4",
            "final_total": "254.40",
            "payments": "0",
            "balance": "0.00",
            "total_pieces": "12"
        },
        "design_one": {
            "design_name": "BaseballJersey",
            "design_images_list": "DHZwrR2wgBFfpE9gproof.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "Whitewithblacksleeves",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "20.00",
            "product_socialprice": "0.00",
            "product_type_visible": "",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "1",
                "M": "4",
                "L": "5",
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
        "old_db_id": "4832",
        "order_status": "Completed",
        "due_date": "08/21/2015",
        "is_taxed": "0.06",
        "name": "PAAbaseballtees"
    },
    {
        "customer": {
            "first_name": "Aleida",
            "last_name": "Martinez",
            "email_address": "amtz06@gmail.com",
            "phone_number": "(956)458-1926",
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
            "total_pieces": "150"
        },
        "design_one": {
            "design_name": "ForestTee",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "Academic",
            "product_colors": "Forest",
            "product_description": "4802",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "0.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Gd210",
            "color_count": {
                "front": "1",
                "back": "1",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "40",
                "M": "60",
                "L": "40",
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
        "old_db_id": "4843",
        "order_status": "Completed",
        "due_date": "08/21/2015",
        "is_taxed": "0.00",
        "name": "CampScholarsREDO"
    },
    {
        "customer": {
            "first_name": "Melissa",
            "last_name": "Davis",
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
            "total_pieces": "12"
        },
        "design_one": {
            "design_name": "",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "",
            "product_description": "",
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
                "QUOTE": "12"
            }
        },
        "old_db_id": "4844",
        "order_status": "Archive",
        "due_date": "08/21/2015",
        "is_taxed": "0.06",
        "name": "ShellyDaviesMielock"
    },
    {
        "customer": {
            "first_name": "Melissa",
            "last_name": "Davis",
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
            "total_pieces": "12"
        },
        "design_one": {
            "design_name": "",
            "design_images_list": ""
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "",
            "product_description": "",
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
                "QUOTE": "12"
            }
        },
        "old_db_id": "4845",
        "order_status": "Archive",
        "due_date": "08/21/2015",
        "is_taxed": "0.06",
        "name": "ShellyDaviesMielock"
    },
    {
        "customer": {
            "first_name": "Melissa",
            "last_name": "Davis",
            "email_address": "",
            "phone_number": "",
            "address_one": "",
            "address_two": "",
            "address_city": "",
            "address_state": "",
            "address_zip": ""
        },
        "order_summary": {
            "order_total": "192",
            "tax_amount": "11.52",
            "final_total": "203.52",
            "payments": "0",
            "balance": "103.52",
            "total_pieces": "12"
        },
        "design_one": {
            "design_name": "LadiesV-Neck",
            "design_images_list": "PxWooxPb0McfBGjzladies.gif"
        },
        "design_two": {
            "design_name": "Men'sCrewNeck",
            "design_images_list": "5e1O8FIlTPuGOVBymen.gif"
        },
        "cat_item_one": {
            "item_name": "",
            "design_images_list": "",
            "product_category": "JobCategory",
            "product_colors": "DarkHeather",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "16.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Softstyle",
            "color_count": {
                "front": "2",
                "back": "2",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "1",
                "M": "2",
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
            "item_name": "Men'sCrewNeck",
            "design_images_list": "5e1O8FIlTPuGOVBymen.gif",
            "product_category": "JobCategory",
            "product_colors": "DarkHeather",
            "product_description": "",
            "product_ishidden": "yes",
            "product_isindexed": "no",
            "product_price": "16.00",
            "product_socialprice": "0.00",
            "product_type_visible": "Softstyle",
            "color_count": {
                "front": "0",
                "back": "0",
                "left": "0",
                "right": "0"
            },
            "sizes": {
                "S": "1",
                "M": "1",
                "L": "2",
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
        "old_db_id": "4846",
        "order_status": "Completed",
        "due_date": "08/21/2015",
        "is_taxed": "0.06",
        "name": "VoteShelly"
    }
];
