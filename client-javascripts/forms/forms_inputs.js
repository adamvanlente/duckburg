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
    var attribs = item.attributes;

    // Get/clear/show div.
    var div = $('.editingCatalogItemDesignDetails');
    div.html('');
    div.show();

    duckburg.forms.inputs.appendEditableDesignFields(div, attribs);
    duckburg.forms.inputs.appendEditableDesignImage(div, attribs);
    duckburg.forms.inputs.addEditingCatalogImageFormListeners();
    duckburg.forms.inputs.editingCatalogItemNewImagePicker(div);
  },

  appendEditableDesignFields: function(div, attribs) {
    // Design details header.
    div.append($('<h3>')
      .html('Design details'));

    div.append($('<input>')
      .val(attribs.design_name)
      .attr('id', 'design_name')
      .attr('type', 'text')
      .attr('placeholder', 'design name')
      .attr('class', 'editingCatalogImageDesignField'));

    // There's a chance this may be empty.
    $('#product_design').val(attribs.design_name);

    div.append($('<input>')
      .val(attribs.design_color_count)
      .attr('id', 'design_color_count')
      .attr('type', 'text')
      .attr('placeholder', 'color count')
      .attr('class', 'editingCatalogImageDesignField'));

    div.append($('<textarea>')
      .val(attribs.design_notes)
      .attr('id', 'design_notes')
      .attr('placeholder', 'notes')
      .attr('class', 'editingCatalogImageDesignField'));
  },

  appendEditableDesignImage: function (div, attribs) {
    var imgHolder = $('<div>')
      .attr('class', 'editingCatalogImageHolder');

    var imgArray = attribs.design_images_list.split(',');

    if (imgArray.length == 0) {
      div.append($('<em>')
        .html('no images'));
    }
    div.append(imgHolder);

    for (var i = 0; i < imgArray.length; i++) {
        var url = imgArray[i];
        duckburg.forms.inputs.appendEditingImageAndOverlays(url)
    }
  },

  appendEditingImageAndOverlays: function(url) {

    var imgLabel = $('<label>')
      .attr('class', 'editingCatalogImageWithUrl')
      .attr('id', url)
      .css({'background': 'url(' + url + ')',
            'background-size': '100%'});

    imgLabel.append($('<em>')
      .attr('class', 'view')
      .attr('id', url)
      .html('view')
      .click(function(e) {
        var el = e.currentTarget;
        var url = el.id
        duckburg.utils.lightboxImage(url);
      }));

    imgLabel.append($('<em>')
      .attr('class', 'remove')
      .attr('id', url)
      .html('remove')
      .click(function(e) {
        var el = e.currentTarget;
        var id = el.id
        var parent = e.currentTarget.parentElement;
        parent.parentElement.removeChild(parent);
        duckburg.forms.inputs.updateEditingCatalogImageDesign();
      }));

    $('.editingCatalogImageHolder').append(imgLabel);
  },

  addEditingCatalogImageFormListeners: function() {

    $('.editingCatalogImageDesignField').keyup(function() {

      if (duckburg.editingCatalogImageUpdaterTimer) {
        window.clearInterval(duckburg.editingCatalogImageUpdaterTimer);
      }

      duckburg.editingCatalogImageUpdaterTimer = setTimeout(function () {
        duckburg.forms.inputs.updateEditingCatalogImageDesign();
      }, 400);
    });
  },

  updateEditingCatalogImageDesign: function() {

    // Currently viewing design.
    var item = duckburg.filterPopupEditingDesign
    $('.editingCatalogImageDesignField').each(function() {
      item.set(this.id, this.value);
    });

    var urlArray = [];
    $('.editingCatalogImageWithUrl').each(function() {
      urlArray.push(this.id);
    });
    var urlString = urlArray.join();
    urlString = urlString == '' || urlString == ',' ? '' : urlString;
    item.set('design_images_list', urlString);

    item.save();

    // Update the current name,  (it may have changed).
    $('#product_design').val(item.attributes.design_name);

  },

  editingCatalogItemNewImagePicker: function(div) {
    // append a blank label for spacing.
    div.append($('<label>')
      .html('Add image')
      .attr('class', 'imagePickerLabel'));

    var label = $('<label>');
    var pickerId = 'cat_item_img_picker';

    // Create image picker.
    var imgPicker = $('<input>')
      .attr('type', 'file')
      .attr('id', pickerId)
      .attr('class', 'editingCatalogImageDesignPicker');
    label.append(imgPicker);

    $('.imagePickerLabel').append(label);

    duckburg.forms.inputs.edtingCatalogItemImagePickerListener();
  },

  edtingCatalogItemImagePickerListener: function() {
    $('.editingCatalogImageDesignPicker').change(function (e) {

      var curId = e.currentTarget.id;

      // Save the image.
      duckburg.currentlySavingImage = true;
      duckburg.requests.files.save(curId, function(result) {
        duckburg.forms.inputs.appendEditingImageAndOverlays(result._url);
        duckburg.forms.inputs.updateEditingCatalogImageDesign();

        var imgPicker = $('<input>')
          .attr('type', 'file')
          .attr('id', 'cat_item_img_picker')
          .attr('class', 'editingCatalogImageDesignPicker');
        $('#cat_item_img_picker').replaceWith(imgPicker);

      });
    });
  }
};
