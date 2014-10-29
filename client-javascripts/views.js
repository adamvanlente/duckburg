// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.views = {

  // First view to load.
  loadFirst: function() {
    duckburg.views.objects.load();
  },

  clearWrapper: function() {
    $('.inner-wrapper').html('');
  },

  /*
   * Functions that help create a list view.
   *
   */
  setHeader: function(fields) {
    var header = $('<span></span>')
      .attr('class', 'wrapperHeader');

    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      header.append($('<span></span>')
        .attr('class', 'listItem')
        .html(field));
    }

    $('.inner-wrapper').append(header);
  },

  setTitle: function(title) {
    $('.inner-wrapper').append($('<h2></h2>').html(title));

    var filterIdSuffix = 'FilterInput';

    var filterInput = $('<input/>')
      .attr('type', 'text')
      .attr('id', title + filterIdSuffix)
      .attr('class', 'filterInput')
      .attr('placeholder', 'filter');
    $('.inner-wrapper').append(filterInput);

    this.setSearchFilter(title, filterIdSuffix);
  },

  setSearchFilter: function(title, filterIdSuffix) {
    $('#' + title + filterIdSuffix).keyup(function(e) {
      duckburg.requests.setSearchFilters(e.currentTarget);
      duckburg.searchOcurring = true;

      // Delay setting of filter, input needs a second to be seen.
      setTimeout(function() {
        var term = e.currentTarget.value;
        if (term == '') {
          duckburg.searchFilters = undefined;
        } else {
          duckburg.searchFilters = e.currentTarget.value;
        }
      }, 10)

      setTimeout(function() {
        duckburg.searchOcurring = false;
      }, 100);
    });
  },

  setup: function(containerClass, title, fields, filtering, filterFields) {

    // Only create these on the first load, not when filtering.
    if (filtering != 'filtering') {
      // Clear the wrapper that holds all dynamic content.
      duckburg.views.clearWrapper();

      duckburg.views.setTitle(title);
      duckburg.views.setHeader(fields);
    }

    // Remove the list container if it exists already.
    $('.' + containerClass).remove();

    // Create container.
    var container = $('<div></div>')
      .attr('class', containerClass);

    if (title == 'customers') {
      duckburg.views.populateCustomers(container, fields, title);
    } else {
      duckburg.currentView = title;
      duckburg.views.populate(container, fields, title, filterFields);
    }
  },

  populate: function(container, fields, title, fieldsForFiltering) {

    duckburg.requests.genericFind('DuckburgSupplier', fieldsForFiltering,
      function(results) {

      if (!results || results.length == 0) {

        duckburg.views.showEmptyResultsMessage(container);
        return false;
      }

      duckburg.currentResults = results;
      var filteredItems = $('<div></div>');

      for (var i = 0; i < results.length; i++) {
        var customer = results[i].attributes;

        var span = $('<span></span>')
          .attr('class', 'listItemHolder')
          .attr('id', i)
          .click(function(e) {
            var index = e.currentTarget.id;
            var resultItem = duckburg.currentResults[index];
            duckburg.parseEditingObject = resultItem;
            duckburg.forms[title]();
          });

        for (var j = 0; j < fields.length; j++) {
          var field = fields[j];
          var fieldVal = customer[field];
          span.append($('<span></span>')
            .html(fieldVal)
            .attr('class', 'listItem'));
        }
        filteredItems.append(span);
      }
      container.append(filteredItems);
      $('.inner-wrapper').append(container);
    });
  },

  populateCustomers: function(container, fields, title) {

    duckburg.requests[title].find({}, function(results) {

      if (!results || results.length == 0) {

        duckburg.views.showEmptyResultsMessage(container);
        return false;
      }

      duckburg.currentResults = results;
      var filteredItems = $('<div></div>');

      for (var i = 0; i < results.length; i++) {
        var customer = results[i].attributes;

        var span = $('<span></span>')
          .attr('class', 'listItemHolder')
          .attr('id', i)
          .click(function(e) {
            var index = e.currentTarget.id;
            var resultItem = duckburg.currentResults[index];
            duckburg.parseEditingObject = resultItem;
            duckburg.forms[title]();
          });

        for (var j = 0; j < fields.length; j++) {
          var field = fields[j];
          var fieldVal = customer[field];
          span.append($('<span></span>')
            .html(fieldVal)
            .attr('class', 'listItem'));
        }
        filteredItems.append(span);
      }
      container.append(filteredItems);
      $('.inner-wrapper').append(container);
    });
  },

  showEmptyResultsMessage: function(container) {
    var emptyResultsDiv = $('<div></div>')
      .attr('class', 'noResultsNoteDiv')
      .html('no results');
    container.append(emptyResultsDiv);
    $('.inner-wrapper').append(container);
  },

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
  },

  customers: {

    load: function(filteredLoad) {

      // Determine the visible fields for this object.
      var fields = ['first_name', 'last_name', 'email_address', 'phone_number'];
      duckburg.views.setup(
            'customerListContainer', 'customers', fields, filteredLoad);
    }
  },

  products: {

    load: function(filteredLoad) {

      // Determine the visible fields for this object.
      var fields = ['product_desc'];
      duckburg.views.setup(
            'productsListContainer', 'products', fields, filteredLoad);
    }
  },

  suppliers: {

    load: function(filteredLoad) {

      // Determine the visible fields for this object.
      var fields =
          ['supplier_name', 'website', 'contact_person', 'contact_phone'];

      // When a user searches for items in a list, these are the object params
      // we will look inside on Parse.
      var filterFields = ['supplier_name'];

      duckburg.views.setup(
            'suppliersListContainer', 'suppliers', fields, filteredLoad,
            filterFields);
    }
  },

  colors: {

    load: function(filteredLoad) {

      // Determine the visible fields for this object.
      var fields = ['color'];
      duckburg.views.setup(
            'colorsListContainer', 'colors', fields, filteredLoad);
    }
  }

};
