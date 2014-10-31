// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.views.common = {

  // First view to load.
  loadFirst: function() {
    duckburg.views.objects.load();
    duckburg.forms.catalog_item();
  },

  clearWrapper: function() {
    $('.inner-wrapper').html('');
  },

  /*
   * Functions that help create a list view.
   *
   */
  setHeader: function(fields) {
    var header = $('<span>')
      .attr('class', 'wrapperHeader');

    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      header.append($('<span>')
        .attr('class', 'listItem')
        .html(field));
    }

    $('.inner-wrapper').append(header);
  },

  setTitle: function(title) {
    $('.inner-wrapper').append($('<h2>').html(title));

    var filterIdSuffix = 'FilterInput';

    var filterInput = $('<input/>')
      .attr('type', 'text')
      .attr('id', title + filterIdSuffix)
      .attr('class', 'filterInput')
      .attr('placeholder', 'filter');
    $('.inner-wrapper').append(filterInput);

    var addButton = $('<button>')
      .html('add new item')
      .attr('id', title)
      .attr('class', 'addNewItemListViewButton')
      .click(function(e) {
        var type = e.currentTarget.id
        duckburg.forms[type]();
        duckburg.currentListView = type;
      }) ;
    $('.inner-wrapper').append(addButton);

    this.setSearchFilter(title, filterIdSuffix);
  },

  setSearchFilter: function(title, filterIdSuffix) {
    $('#' + title + filterIdSuffix).keyup(function(e) {

      // Delay setting of filter, input needs a second to be seen.
      setTimeout(function() {
        var term = e.currentTarget.value.toLowerCase();
        if (term == '') {
          duckburg.searchFilters = undefined;
        } else {
          duckburg.searchFilters = e.currentTarget.value.toLowerCase();
        }
      }, 10);

      // Clear timers that waiting to search.
      if (duckburg.searchFilterTimer) {
        window.clearInterval(duckburg.searchFilterTimer);
      }

      // Perform a new (filtered) search after the interval.
      duckburg.searchFilterTimer = setTimeout(function() {
        var mode = $('.filterInput').attr('id');
        mode = mode.replace('FilterInput', '');
        duckburg.views[mode].load('filtering');
      }, duckburg.utils.searchInterval);

    });
  },

  setup: function(
      containerClass, title, fields, filtering, parseName) {

    // Only create these on the first load, not when filtering.
    if (filtering != 'filtering') {

      // Clear the wrapper that holds all dynamic content.
      duckburg.views.common.clearWrapper();
      duckburg.views.common.objectListViewHeader();
      duckburg.utils.clearSearchFilters();
      duckburg.views.common.setTitle(title);
      duckburg.views.common.setHeader(fields);
    }

    // Remove the list container if it exists already.
    $('.' + containerClass).remove();

    // Create container.
    var container = $('<div>')
      .attr('class', containerClass);

    duckburg.currentView = title;
    duckburg.views.common.populate(container, fields, title, parseName);
  },

  objectListViewHeader: function() {
    var header = $('<div>')
      .attr('class', 'objectListViewHeader');

    var button = $('<button>')
      .html('&larr; back to objects')
      .click(function() {
        duckburg.views.objects.load();
      });
    header.append(button);

    var objectList = duckburg.config.VISIBLE_OBJECTS;
    for (var object in objectList) {
      var span = $('<span>')
        .html(object)
        .click(function(e) {
          var node = e.currentTarget.innerHTML;
          duckburg.views[node].load();
        });
      header.append(span);
    }

    $('.inner-wrapper').append(header);
  },

  populate: function(container, fields, title, parseName) {

    duckburg.requests.common.genericFind(parseName, function(results) {

      if (!results || results.length == 0) {

        duckburg.views.common.showEmptyResultsMessage(container);
        return false;
      }

      duckburg.currentResults = results;
      var filteredItems = $('<div>');

      for (var i = 0; i < results.length; i++) {
        var customer = results[i].attributes;

        var span = $('<span>')
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
          span.append($('<span>')
            .html(fieldVal)
            .attr('class', 'listItem'));
        }
        filteredItems.append(span);
      }
      container.append(filteredItems);
      $('.inner-wrapper').append(container);
      duckburg.filteredSearchOccured = true;
    });
  },

  populateCustomers: function(container, fields, title) {

    duckburg.requests[title].find({}, function(results) {

      if (!results || results.length == 0) {

        duckburg.views.common.showEmptyResultsMessage(container);
        return false;
      }

      duckburg.currentResults = results;
      var filteredItems = $('<div>');

      for (var i = 0; i < results.length; i++) {
        var customer = results[i].attributes;

        var span = $('<span>')
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
          span.append($('<span>')
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
    var emptyResultsDiv = $('<div>')
      .attr('class', 'noResultsNoteDiv')
      .html('no results');
    container.append(emptyResultsDiv);
    $('.inner-wrapper').append(container);
  }

};
