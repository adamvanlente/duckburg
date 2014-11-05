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

      var objects = duckburg.config.VISIBLE_OBJECTS;
      for (var object in objects) {
        var prettyName = objects[object];
        duckburg.views.objects.makeObjectListing(prettyName, object);
      }
    },

    // Make an item for the list of objects.
    makeObjectListing: function(title, objectName) {

      var createFn = duckburg.forms[objectName];
      var listFn = duckburg.views[objectName].load;

      // List item heading.
      var header = $('<h1>').html(title);

      // Button for creating an object.
      var create = $('<button>')
        .html('CREATE')
        .attr('class', 'create-button')
        .click(createFn);

      // Button for listing objects.
      var list = $('<button>')
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
          ['supplier_name', 'supplier_account_number', 'website',
           'contact_person', 'contact_number'];
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

  catalog_item: {

    load: function(filteredLoad) {

      // Determine the visible fields for this object.
      var fields = ['item_name', 'item_product_name', 'product_category',
          'product_price', 'product_design_id'];

      duckburg.views.common.setup(
            'catalogItemListContainer', 'catalog_item', fields, filteredLoad,
            'DuckburgCatalogItem');
    }
  },

  licensing_type: {

    load: function(filteredLoad) {

      // Determine the visible fields for this object.
      var fields = ['licensing_type', 'contact_name', 'contact_email'];

      duckburg.views.common.setup(
            'licensingTypeListContainer', 'licensing_type', fields,
            filteredLoad, 'DuckburgLicensingType');
    }
  },

  shipping_methods: {

    load: function(filteredLoad) {

      // Determine the visible fields for this object.
      var fields = ['shipping_method'];

      duckburg.views.common.setup(
            'shippingMethodsListContainer', 'shipping_methods', fields,
            filteredLoad, 'DuckburgShippingMethod');
    }
  },

  job_status: {

    load: function(filteredLoad) {

      // Determine the visible fields for this object.
      var fields = ['job_status_name'];

      duckburg.views.common.setup(
            'jobStatusListContainer', 'job_status', fields,
            filteredLoad, 'DuckburgJobStatus');
    }
  },

  job_positions: {

    load: function(filteredLoad) {

      // Determine the visible fields for this object.
      var fields = ['position_name', 'end_search_date', 'position_description'];

      duckburg.views.common.setup(
            'jobPositionsListContainer', 'job_positions', fields,
            filteredLoad, 'DuckburgJobPosition');
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
