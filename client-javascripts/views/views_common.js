// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.views.common = {

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
      duckburg.utils.clearSearchFilters();
      duckburg.views.common.setTitle(title);
      duckburg.views.common.setHeader(fields);
    }

    // Remove the list container if it exists already.
    $('.' + containerClass).remove();

    // Create container.
    var container = $('<div></div>')
      .attr('class', containerClass);

    // if (title == 'customers') {
    //   duckburg.views.common.populateCustomers(container, fields, title);
    // } else {

      duckburg.currentView = title;
      duckburg.views.common.populate(container, fields, title, parseName);
    // }

  },

  populate: function(container, fields, title, parseName) {

    

    duckburg.requests.common.genericFind(parseName, function(results) {

      if (!results || results.length == 0) {

        duckburg.views.common.showEmptyResultsMessage(container);
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
  }

};
