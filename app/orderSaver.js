
// Config for parse.
module.exports = {
    saveOrder: function(orderObject, res, Parse) {
      orderSave.saveOrder(orderObject, res, Parse);
    }
};


orderSave = {

  saveOrder: function(orderObject, res, Parse) {

    // Get the object attributes.
    var id = orderObject.id;
    var attribs = orderObject.obj;

    // Store the attribues.
    orderSave.attribs = attribs;

    // Create a new order object.
    var Order = Parse.Object.extend("dbOrder");
    var query = new Parse.Query(Order);

    var customers = [];
    for (var cust in attribs.customers) {
      var custObj = {};
      custObj.id = cust;
      custObj.isShip = attribs.customers[cust].isShip;
      custObj.isBill = attribs.customers[cust].isBill;
      customers.push(custObj);
    }

    var items = [];
    for (var item in attribs.items) {
      var itemObj = {};
      itemObj.id = item;
      if (attribs.items[item].sizes) {
        itemObj.sizes = JSON.stringify(attribs.items[item].sizes);
      }
      items.push(itemObj);
    }

    // // Fetch the order using the Parse id.
    query.get(id, {
      success: function(existingOrder) {

        // Update the existing order.
        var parseSearchString = '';

        for (var prop in attribs) {
          if (typeof attribs[prop] == 'string') {
            existingOrder.set(prop, attribs[prop]);
            if (prop == 'order_name' || prop == 'printable_id') {
              parseSearchString += attribs[prop];
            }
          }
        }

        existingOrder.set('parse_search_string', parseSearchString);
        existingOrder.set('customers', JSON.stringify(customers));
        existingOrder.set('items', JSON.stringify(items));

        existingOrder.save();

        // Save the updated order Object.
        orderSave.existingOrder = existingOrder;

        // Kick off the side tasks of updating the sub-objects.
        orderSave.saveCustomers(attribs.customers, Parse, res);
      },

      error: function(object, error) {

        res.json({
          'success': false,
          'order': error.message
        });
      }
    });
  },

  saveCatalogItems: function(items, Parse, res) {

    // Create a new order object.
    var CatalogItem = Parse.Object.extend("dbCatalogItem");
    var query = new Parse.Query(CatalogItem);

    for (var item in items) {
      query.get(item, {
        success: function(existingItem) {

          // Update the existing order.
          var parseSearchString = '';

          var props = items[item];
          for (var prop in props) {
            var val = props[prop];
            existingItem.set(prop, val);
            if (prop == 'item_name') {
              parseSearchString = val;
            }
          }

          existingItem.set('parse_search_string', parseSearchString);
          existingItem.save();

          res.json({
            'success': true,
            'order': orderSave.existingOrder
          });

          return;
        },

        error: function(object, error) {
          res.json({
            'success': false,
            'order': error.message
          });
          return;
        }
      });
    }

    res.json({
      'success': true,
      'order': orderSave.existingOrder
    });

  },

  saveCustomers: function(customers, Parse, res) {

    for (var customer in customers) {

      var attributes = customers[customer];

      // Create a new order object.
      var Customer = Parse.Object.extend("dbCustomer");
      var query = new Parse.Query(Customer);

      query.get(customer, {
        success: function(existingCustomer) {

          // Update the existing order.
          var parseSearchString = '';

          for (var param in attributes) {
            existingCustomer.set(param, attributes[param]);
            if (param != 'parse_search_string') {
              parseSearchString += ' ' + attributes[param];
            }
          }
          existingCustomer.set('parse_search_string', parseSearchString);
          existingCustomer.save();

          // Save the catalog items.
          orderSave.saveCatalogItems(orderSave.attribs.items, Parse, res);
          return
        },

        error: function(object, error) {
          res.json({
            'success': false,
            'order': error.message
          });
          return;
        }
      });
    }

    // Save the catalog items.
    orderSave.saveCatalogItems(orderSave.attribs.items, Parse, res);
  }
}
