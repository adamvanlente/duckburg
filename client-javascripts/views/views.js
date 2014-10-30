// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.views = {

  /*
   * Unique from the other items in this script;
   * this simply lists all of the objects for the user,
   * and reveals the object's available methods.
   */
  objects: {

    // Load the object list.
    load: function() {
      $('.inner-wrapper').html('');
      this.customers();
      this.products();
      this.suppliers();
      this.colors();
      this.designs();
    },

    // Create order object list item.
    orders: function() {
      this.makeObjectListing(
        'Orders', duckburg.forms.orders, duckburg.views.orders.load);
    },

    // Create customer object list item.
    customers: function() {
      this.makeObjectListing(
        'Customers', duckburg.forms.customers, duckburg.views.customers.load);
    },

    // Create customer object list item.
    products: function() {
      this.makeObjectListing(
        'Products', duckburg.forms.products, duckburg.views.products.load);
    },

    // Create customer object list item.
    suppliers: function() {
      this.makeObjectListing(
        'Suppliers', duckburg.forms.suppliers, duckburg.views.suppliers.load);
    },

    // Create customer object list item.
    colors: function() {
      this.makeObjectListing(
        'Colors', duckburg.forms.colors, duckburg.views.colors.load);
    },

    // Create customer object list item.
    designs: function() {
      this.makeObjectListing(
        'Designs', duckburg.forms.designs, duckburg.views.designs.load);
    },

    // Make an item for the list of objects.
    makeObjectListing: function(title, createFn, listFn) {

      // List item heading.
      var header = $('<h1></h1>').html(title);

      // Button for creating an object.
      var create = $('<button></button>')
        .html('CREATE')
        .attr('class', 'create-button')
        .click(createFn);

      // Button for listing objects.
      var list = $('<button></button>')
        .html('LIST')
        .attr('class', 'list-button')
        .click(listFn);

      // Append the dom elements.
      $('.inner-wrapper').append(header);
      $('.inner-wrapper').append(create);
      $('.inner-wrapper').append(list);
    }
  },

  customers: {

    load: function(filteredLoad) {

      // Determine the visible fields for this object.
      var fields = ['first_name', 'last_name', 'email_address', 'phone_number'];
      duckburg.views.common.setup(
            'customerListContainer', 'customers', fields, filteredLoad,
            'DuckburgCustomer');
    }
  },

  products: {

    load: function(filteredLoad) {

      // Determine the visible fields for this object.
      var fields = ['product_name', 'colors', 'sizes', 'rd_item_id',
          'supplier_item_id', 'supplier_price'];

      duckburg.views.common.setup(
            'productsListContainer', 'products', fields, filteredLoad,
            'DuckburgProduct');
    }
  },

  suppliers: {

    load: function(filteredLoad) {

      // Determine the visible fields for this object.
      var fields =
          ['supplier_name', 'website', 'contact_person', 'contact_number'];
      duckburg.views.common.setup(
            'suppliersListContainer', 'suppliers', fields, filteredLoad,
            'DuckburgSupplier');
    }
  },

  colors: {

    load: function(filteredLoad) {

      // Determine the visible fields for this object.
      var fields = ['color_name', 'hex_code'];

      duckburg.views.common.setup(
            'colorsListContainer', 'colors', fields, filteredLoad,
            'DuckburgColor');
    }
  },

  designs: {

    load: function(filteredLoad) {

      // Determine the visible fields for this object.
      var fields = ['design_name', 'design_notes'];

      duckburg.views.common.setup(
            'designListContainer', 'designs', fields, filteredLoad,
            'DuckburgDesign');
    }
  },

  template: {

    load: function(filteredLoad) {

      // Determine the visible fields for this object.
      var fields = ['PARAM_NAME'];

      duckburg.views.common.setup(
            'OBJECTListContainer', 'suppliers', fields, filteredLoad,
            'ParseName');
    }
  },

};
