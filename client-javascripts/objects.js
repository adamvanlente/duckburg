// DuckBurg namespace.
var duckburg = duckburg || {};

/**
 * Objects view
 * @module where objects are created and browsed.
 *
 */
duckburg.objects = {

  /**
   * Load view
   * @function load the object view
   *
   */
  loadObjectView: function() {

    // Load the menu for the object view.
    duckburg.objects.loadObjectsMenu();
  },

  /**
   * Load list of objects.
   * @function loads list of objects and creates a menu.
   *
   */
  loadObjectsMenu: function() {

    // Clear out the menu.
    $('.objectsMenu').html('');

    // Iterate over all objects, or 'models'.
    for (var model in duckburg.models) {
      $('.objectsMenu')
        .append($('<span>')
          .html(duckburg.models[model].display_name)
          .attr('class', 'objectMenuButton')
          .attr('id', model)
          .click(function(e) {
            var clickedModel = e.currentTarget.id;
            duckburg.objects.loadListOfObjectsForObjectType(clickedModel);
          }));
    }
  },

  /**
   * Load a model list.
   * @function fetches list of objects from Parse.
   * @param modelType String model this item is based off of.
   *
   */
  loadListOfObjectsForObjectType: function(modelType) {

    // Remember selected type.
    duckburg.objects.currentlyViewingModelType = modelType;

    // Show the user in the menu which object is selected.
    $('.objectMenuButton').each(function() {
      if (this.id == modelType) {
        this.className = 'objectMenuButton selectedObjectMenuItem';
      } else {
        this.className = 'objectMenuButton';
      }
    });

    // Start the search for objects.
    duckburg.objects.startObjectSearch(modelType);
  },

  /**
   * Search for objects.
   * @function clear list of objects and start new search.
   * @param type String model type
   * @param string String string of filters for searching
   *
   */
  startObjectSearch: function(type, filters) {

    // If type is not passed, grab the global.
    type = type || duckburg.objects.currentlyViewingModelType;

    // Load a filter input for searching.
    duckburg.objects.createFilterInputAndAddNewButton();

    // Perform a search for the objects.
    duckburg.objects.searchForObjects(type, filters);
  },

  /**
   * Search for the objects.
   * @function separated functionality to set a searching message and
   *           perform the actual Parse query.
   * @param type String type of model to search for
   * @param filters String string of filters
   *
   */
  searchForObjects: function(type, filters) {

    // Clear out the results div.
    $('.objectList')
      .html('');

    // Set a 'searching for' message.
    duckburg.objects.setSearchingMessage(type);

    // Get the list of objects.
    duckburg.requests.findObjects(
        type, filters, duckburg.objects.loadObjectsToList);
  },

  /**
   * Searching message
   * @function let the user know a search is being performed.
   * @param type String type of object being search for.
   *
   */
  setSearchingMessage: function(type) {
    var msg = 'Searching for objects with type: ' + type;
    $('.objectList')
      .append($('<span>')
        .attr('class', 'searchingMessage')
        .html(msg));
  },

  /**
   * Error message
   * @function let the user know no search results came back.
   *
   */
  showMessageForNoResults: function() {
    var msg = 'No items found for this search.';
    $('.objectList')
      .append($('<span>')
        .attr('class', 'searchingMessage')
        .html(msg));
  },

  /**
   * Load objects after parse call
   * @function objects have been returned from parse - handle them
   * @param results Array list of results from Parse
   * @param itemsToReturn Array items that were passed, which we need back.
   *
   */
  loadObjectsToList: function(results, itemsToReturn) {

    // Clear out object list.
    $('.objectList')
      .html('');

    // Set a message if no results have come back.
    if (results.length == 0 || !results) {
      duckburg.objects.showMessageForNoResults();
    } else {

      // Capture the current set of results.
      duckburg.objects.lastReturnedResults = results;

      // Load a legend for the list of results.
      duckburg.objects.loadObjectListLegend();

      // Iterate over all results.
      for (var i = 0; i < results.length; i++) {
        var result = results[i];
        duckburg.objects.loadObjectItemToList(result.id, result.attributes, i);
      }
    }
  },

  /**
   * Load filtering input
   * @function creates an input that lets the user filter the results.
   *
   */
  createFilterInputAndAddNewButton: function() {

    $('.objectsFilter')
      .html('')
      .append($('<input>')
        .attr('placeholder', 'filter results')
        .attr('class', 'objectListFilterInput')
        .keyup(function(e) {
          duckburg.objects.performFilteredSearch(e);
        }))
      .append($('<button>')
        .attr('class', 'objectListAddNewButton')
        .append($('<i>')
          .attr('class', 'fa fa-file-o'))
        .click(function() {
          var type = duckburg.objects.currentlyViewingModelType;
          duckburg.utils.createNewObjectForm(type, 'objectPage');
        })
    );
  },

  /**
   * Load list legend
   * @function loads a header/legend for the list.
   *
   */
  loadObjectListLegend: function() {

    // Get the model so we can access its first 5 values.
    var modelType = duckburg.objects.currentlyViewingModelType;
    var model = duckburg.models[modelType];

    // Create a span for the legend.
    var span = $('<span>')
      .attr('class', 'objectListResultItem legend');

    // Create a holder for the top 5 values.
    duckburg.objects.currentViewingObjectTopProperties = [];

    // Get the object's first 5 values.
    var counter = 0;
    for (var param in model.values) {
      if (counter < 5) {
        span.append($('<label>')
          .html(param));
        duckburg.objects.currentViewingObjectTopProperties.push(param);
        counter++;
      }
    }

    // Append the legend to the object list.
    $('.objectList')
      .append(span);
  },

  /**
   * Load an object item to list.
   * @function given an object, create a list item in the object list
   * @param id String parse id of result
   * @param params Array attributes of the parse object.
   * @param index Integer index of item within object:
   *        duckburg.objects.lastReturnedResults
   *
   */
  loadObjectItemToList: function(id, params, index) {

    // Get the current model object.
    var modelType = duckburg.objects.currentlyViewingModelType;
    var model = duckburg.models[modelType];

    // Set a span for the current item.
    var span = $('<span>')
      .attr('class', 'objectListResultItem');

    // Iterate over the properties captured in loadObjectListLegend and get
    // each result's values.
    var props = duckburg.objects.currentViewingObjectTopProperties;
    for (var i = 0; i < props.length; i++) {
      var prop = props[i];
      if (params[prop]) {
        span.append($('<label>')
          .html(params[prop]))
      }
    }

    // Append the span to the list.
    $('.objectList')
      .append(span);
  },

  /**
   * Filtered search
   * @function this is a listener function kicked off when a user enters a
   *           filter term.  This kicks off a search with filters.
   * @param event Object keyup event from input field.
   *
   */
  performFilteredSearch: function(event) {

    // Clear timeout if it exists.
    if (duckburg.objects.filteredSearchTimer) {
      window.clearInterval(duckburg.objects.filteredSearchTimer);
    }

    // Set the filter and make it undefined if it is empty.
    var filter = event.currentTarget.value.toLowerCase();
    filter = filter == '' ? false : filter;

    // Get the search term.
    duckburg.objects.filteredSearchTimer = setTimeout(function() {
      console.log(filter, 'searching');
      var type = duckburg.objects.currentlyViewingModelType;
      duckburg.objects.searchForObjects(type, filter);
    }, 500);
  },

  /**
   * Callback function from a newly created object.
   * @param results Object single result from Parse.
   *
   */
  newObjectCreated: function(result) {

    // Hide the popup.
    duckburg.utils.hidePopup();

    // Search again for items, which will place the newest one at the top.
    var type = duckburg.objects.currentlyViewingModelType;
    duckburg.objects.searchForObjects(type, false);

  }

};
