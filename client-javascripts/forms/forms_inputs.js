/*
 * This file contains some special methods for some form inputs.
 * These form inputs reveal a popup with options (in place of a select menu).
 * It allows the user to select from a list, filter the list, or add a new
 * item.
 *
 */

// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.forms.inputs = {

  // Create a popup over an input field.
  createPopupForInput: function(
      e, parseObject, targetClass, objectName, formType, hideAddButton) {

    // Some globals in case a new object is created, so we'll know what
    // to do it with it when its done.
    duckburg.filteringInput = true;
    duckburg.filterInputParseObject = parseObject;
    duckburg.filterInputTargetClass = targetClass;
    duckburg.filterInputObjectName = objectName;
    duckburg.filterCurrentObjectType = formType;
    duckburg.filterAllowAdd = !hideAddButton;

    // Create a popup.
    this.appendInputPopup(e);

    // Add a filter control and 'add new' button.
    duckburg.forms.inputs.inputPopupFilterControl();

    // Get the list of items for the popup.
    this.getListOfItemsForPopup();
  },

  getListOfItemsForPopup: function() {

    duckburg.forms.inputs.setupListHolder();

    duckburg.requests.common.genericFind(duckburg.filterInputParseObject,
      function(results) {

        // Determine if results exist.
        if (results.length == 0 || !results) {
          var span = $('<span>')
            .html('Create some items!');
          $('.inputPopupListHolder').append(span);
        } else {
          duckburg.forms.inputs.getAndAppendFilteredOptions(results);
        }
    })
  },

  setupListHolder: function() {
    // Clear div.
    $('.inputPopupListHolder').each(function() {
      this.remove();
    });

    // Clear div.
    $('.filterCancel').each(function() {
      this.remove();
    });

    // Create a holder for the list of items.
    var div = $('<div>')
      .attr('class', 'inputPopupListHolder');

    $('.inputPopupSelector').append(div);

    // Set a loading message within the popup.
    var span = $('<em>')
      .html('loading items');
    $('.inputPopupListHolder').append(span);
  },

  getAndAppendFilteredOptions: function(results) {

    $('.inputPopupListHolder').html('');

    duckburg.filterPopupCurrentResults = results;
    for (var i = 0; i < results.length; i++) {

      var item = results[i].attributes;
      var string = item[duckburg.filterInputObjectName];

      var span = $('<span>')
        .attr('id', i)
        .html(string);

      span.click(function(event) {
          duckburg.forms.inputs.placeStringInsideInput(event);
      })

      $('.inputPopupListHolder').append(span);
    }

    var button = $('<button>')
      .attr('class', 'filterCancel')
      .html('cancel')
      .click(function() {
        $('.inputPopupSelector').remove();
      });
    $('.inputPopupSelector').append(button);
  },

  inputPopupFilterControl: function() {
    var input = $('<input>')
      .attr('placeholder', 'filter')
      .attr('class', 'popupFilterInput');

    $('.inputPopupSelector').append(input);

    // Add a listener to the new input for filtering.
    duckburg.forms.inputs.filterListener();

    duckburg.forms.inputs.addNewObjectButton();
  },

  filterListener: function() {
    $('.popupFilterInput').keyup(function(e) {
      var el = e.currentTarget;
      var val = el.value;

      // Delay a quick second and set this value as a search filter.
      setTimeout(function() {
        duckburg.searchFilters = val.toLowerCase();
      }, 10);

      // Clear timers that waiting to search.
      if (duckburg.searchFilterTimer) {
        window.clearInterval(duckburg.searchFilterTimer);
      }

      // Perform a new (filtered) search after the interval.
      duckburg.searchFilterTimer = setTimeout(function() {
        duckburg.forms.inputs.getListOfItemsForPopup();
      }, duckburg.utils.searchInterval);


    });
  },

  addNewObjectButton: function() {
    if (!duckburg.filterAllowAdd) {
      return false;
    }
    var button = $('<button>')
      .attr('class', 'filterAdd')
      .html('add');
    $('.inputPopupSelector').append(button);

    duckburg.forms.inputs.addNewObjectButtonListener();
  },

  addNewObjectButtonListener: function() {
    $('.filterAdd').click(function() {
      duckburg.forms[duckburg.filterCurrentObjectType]();

      // Remove existing popups.
      duckburg.forms.inputs.removeFilterPopups();

      duckburg.filteringInput = true;
    });
  },

  appendInputPopup: function(e) {

    // Remove existing popups.
    duckburg.forms.inputs.removeFilterPopups();

    // Get location of mouse click.
    var x = e.pageX + 'px';
    var y = (e.pageY - 50) + 'px';

    // Set CSS styles for div.
    var css = {
        'position': 'absolute',
        'left': x,
        'top': y
      };

    // Conditions for iphones/smaller screens.
    var width = $(window).width();
    if (width < 500) {
      css = {
          'position': 'absolute',
          'left': '30px',
          'right': '30px',
          'top': '75px'
      }
    }

    // Create, style and append the div.
    var div = $('<div>')
      .css(css)
      .attr('class', 'inputPopupSelector');
    $(document.body).append(div);
  },

  // Remove any popups that exist.
  removeFilterPopups: function() {
    $('.inputPopupSelector').each(function() {
      this.remove();
    });
    duckburg.filteringInput = false;
    duckburg.searchFilters = false;
  },

  placeStringInsideInput: function(e) {

    var newItem;
    var string;
    var attributes;
    if (e) {
        var span = e.currentTarget;
        string = span.innerHTML;
        var index = span.id;
        newItem = duckburg.filterPopupCurrentResults[index];
        attributes = newItem.attributes;
    } else {
        newItem = duckburg.filterPopupCurrentResults;
        attributes = newItem.attributes;
        string = attributes[duckburg.filterInputObjectName];
    }

    $(duckburg.filterInputTargetClass).val(string);
    $('.inputPopupSelector').remove();

    // Special behavior for product input in new catalog item form.
    if (duckburg.filterInputTargetClass == '.formCatalogItemProductListener') {
      $('#product_colors').val(attributes.colors);
      $('#product_sizes').val(attributes.sizes);
    }

    // Special behavior for design input in new catalog item form.
    if (duckburg.filterInputTargetClass == '.formCatalogItemDesignListener') {
      $('#product_design_id').val(newItem.id);
      duckburg.filterPopupEditingDesign = newItem;
      // Let's get super dope and show the user some design details on the
      // fly.
      duckburg.forms.inputs.displayEditableDesign();
    }
  },
  displayEditableDesign: function() {
    var item = duckburg.filterPopupEditingDesign;
    $('.editingCatalogItemDesignDetails')
      .show()
      .html('hi!');
    console.log(item);

  }
};
