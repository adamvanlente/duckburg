// DuckBurg namespace.
var duckburg = duckburg || {};

/*
 * For clarification, objects here refer to database objects; all items
 * that are stored in the parse/DuckBurg database, all of which are building
 * blocks for an order, such as colors, customers, products, distributors, etc.
 * This portion of DuckBurg reveals these objects to users so they can easily
 * create new products, add new customers, etc.  This is a sort of 'manual'
 * view, as users will be able to create these objects on-the-fly, as they
 * create an order.  This is simply an advanced, concentrated method, and will
 * likely be used when, for instance, a new line of shirts is added as an
 * offering to customers, or when several new salespeople need to be created,
 * or when a customer calls to update their address, and so on.
 */
duckburg.objects = {

  // Reveals the object menu.
  objectView: function() {
    this.loadObjectMenu();
  },

  // Load all object menu items and add click listener.
  loadObjectMenu: function() {
    $('.objectMenu').show();
    $('.objectMenu').html('');

    var buttonCounter = 0;

    // Load a menu item for all objects.
    for (var model in duckburg.models) {

      // Set alternating colors/styles for buttons.
      var buttonClass = buttonCounter % 2 == 0 ? 'evenClass' : 'oddClass';

      // Create and append the button.
      var button = $('<button>')
        .attr('class', buttonClass)
        .attr('id', model)
        .html(duckburg.models[model].display_name)
        .click(function(event) {
          duckburg.objects.loadObjectViewForObjectFromEvent(event);
        });
      $('.objectMenu').append(button);

      buttonCounter++;
    }
  },

  // User has clicked on an object in the menu.  Show them a list of said
  // objects and allow them to edit/create new ones & filter results.
  loadObjectViewForObjectFromEvent: function(event) {

    // Check if an order form is open.
    if (duckburg.orders.activeOrderExists) {
      var msg = 'An order is being edited.  Please save it first.';
      duckburg.errorMessage(msg);
      $('.objectMenu').hide();
      return false;
    }

    // Determine clicked object type.
    var objectType = event.currentTarget.id;

    // Kick off the loading of the object view.
    duckburg.objects.beginLoadingObjectView(objectType);
  },

  // Load the object view.
  beginLoadingObjectView: function(objectType) {

    // Hide the menu of object types.
    $('.objectMenu').hide();

    // Create a header for the object list.
    duckburg.objects.createObjectListHeader(objectType);

    // Create a holder for a form, if a new item is created.
    duckburg.objects.createObjectListNewItemFormHolder();

    // Render a legend for the object list.
    duckburg.objects.createObjectListLegend(objectType);

    // Render the list of objects.
    duckburg.objects.fetchListOfObjects(objectType);
  },

  // Set a header item for the list of object items.
  createObjectListHeader: function(model) {

    // Create header with object type text and button for creating new objects.
    var header = $('<h2>')
      .html(duckburg.models[model].display_name)

      // Create an input for filtering results/searching.
      .append($('<input>')
        .attr('type', 'text')
        .attr('class', 'objectListFilterInput')
        .attr('placeholder', 'filter results')
        .keyup(function(e) {
          duckburg.objects.filterObjectList(e, model);
        }))

      // Create a button for making new objects.
      .append($('<button>')
        .html('+')
        .attr('id', model)
        .attr('class', 'objectListCreateNewButton')
        .click(function(e) {
          duckburg.forms.createNewObjectFormForObject(
              e.currentTarget.id, '.newObjectFormHolder');
        }));

    // Append header to wrapper.
    $('.wrapper-content').html(header);
  },

  filterObjectList: function(event, model) {

    // The search term entered.
    var filterTerm = event.currentTarget.value;

    // Clear the search timer if it exists
    if (duckburg.objects.searchTimeout) {
      window.clearInterval(duckburg.objects.searchTimeout);
    }

    duckburg.objects.searchTimeout = setTimeout(function() {
        duckburg.objects.fetchListOfObjects(model, filterTerm)
      }, 200);
  },

  // Prepare to save a new object to the database.  Abort if form is invalid.
  saveNewObject: function(event) {

    // Get the form fields so we can iterate over them and check for validity
    // and hopefully create the new object from their values.
    var type = event.currentTarget.id;
    var form = event.currentTarget.parentElement.parentElement;
    var fields = form.children[1].children;
    var invalidForm = duckburg.objects.validateNewObjectForm(type, fields);

    if (invalidForm) {
      var msg = 'The following required fields are incomplete: ' +
          invalidForm.join(', ');
      duckburg.errorMessage(msg);
    } else {

      // Save it!
      duckburg.objects.saveNewObjectFromForm(type, fields);
    }
  },

  // Validate the new form by checking if required fields are valid.
  validateNewObjectForm: function(type, fields) {
    var invalidFields = [];
    var model = duckburg.models[type];
    var values = model.values;

    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      var id = field.id;
      if (values[id] && values[id].required && field.value == '') {
        invalidFields.push(id);
      }
    }
    return invalidFields.length > 0 ? invalidFields : false;
  },

  saveNewObjectFromForm: function(type, fields) {
    duckburg.requests.saveObject(type, fields,

      // Success Cb
      function(result, verb) {
        var model = duckburg.models[type];
        var name = model.display_name;

        var msg = name + ' was ' + verb;

        // New object is being created within an order.
        if ($('.newCustomerForm').length > 0) {
          $('.offClicker').hide();
          $('.popupItemHolder').hide();

          // Check if it is within an order form.
          if (verb == 'updated' && $('.customerWithinOrder').length) {
            duckburg.orders.replaceCustomerWithNewCustomer(result);
          } else {
            duckburg.orders.addCustomerToOrder(result);
          }

        // Object was created using object forms.
        } else {
          duckburg.successMessage(msg);
          duckburg.objects.hideNewObjectForm();
          duckburg.objects.beginLoadingObjectView(type);
        }
      },

      // Error Cb
      function(errorMsg) {
        duckburg.errorMessage(errorMsg);
      });
  },

  // Create a holder in which a new item form can be created/destroyed.
  createObjectListNewItemFormHolder: function() {
    var formHolder = $('<div>')
      .attr('class', 'newObjectFormHolder');
    $('.wrapper-content').append(formHolder);
  },

  // Create the legend/header for a list of items.
  createObjectListLegend: function(type) {

    duckburg.objects.currentlyViewingFields = {};

    // Create a legend that will be a header containing the object properties.
    var listLegend = $('<div>')
      .attr('class', 'objectListLegend')
      .attr('id', type);

    // Create a label for each property.
    var fields = duckburg.models[type].values;
    var counter = 0;
    for (var value in fields) {
      if (counter < 6) {
        duckburg.objects.currentlyViewingFields[value] = true;
        listLegend.append($('<label>')
          .html(value));
        counter++;
      }
    }

    $('.wrapper-content').append(listLegend);
  },

  // Fetch a list of objects.
  fetchListOfObjects: function(type, filters) {

    // Remove any of the previous list elements.
    $('.objectResultsHolder').each(function() {
      this.remove();
    });

    // Let the user know a search is being performed.
    duckburg.objects.showLoadingResultsMessage();

    duckburg.requests.findObjects(type,

        // Success CB
        duckburg.objects.handleObjectResults,

        // Error CB
        function(message) {
          duckburg.errorMessage(message);
          duckburg.showZeroResultsMessage();
        },

        // Include filters in request.
        filters);
  },

  // Show the user that no results have been found.
  showLoadingResultsMessage: function() {
    $('.zeroResultsForListDiv').remove();
    $('.loadingMessage').remove();
    $('.wrapper-content').append($('<div>')
      .attr('class', 'loadingMessage')
      .html('<em>searching for items</em>'));
  },

  // With results, render the list of objects.
  handleObjectResults: function(results) {

    duckburg.objects.currentResults = results;

    // TODO array of random  responsese like no, nope, nada, found nothing, etc.
    if (results.length == 0 || !results) {
      duckburg.objects.showZeroResultsMessage();
    } else {
      duckburg.objects.renderListOfObjects(results);
    }
  },

  renderListOfObjects: function(results) {

    $('.loadingMessage').remove();

    var validFields = duckburg.objects.currentlyViewingFields;
    var holder = $('<div>')
      .attr('class', 'objectResultsHolder');

    for (var i = 0; i < results.length; i++) {

      var span = $('<span>')
        .attr('class', 'objectResultListItemSpan')
        .attr('id', i)
        .click(function(e) {
          duckburg.objects.launchObjectEditor(e);
        });

      var obj = results[i];
      var items = obj['attributes'];

      for (var field in validFields) {

        var val = items[field] == '' ? '<em>--------------</em>' : items[field];
         span.append($('<label>')
          .html(val));
      }
      holder.append(span);
    }
    $('.wrapper-content').append(holder);
  },

  // TODO this function can be used for "spotlight search" edit option.
  launchObjectEditor: function(event) {
    var el = event.currentTarget;
    var object = duckburg.objects.currentResults[el.id];
    var type = $('.objectListLegend').attr('id');

    duckburg.forms.createNewObjectFormForObject(type, '.newObjectFormHolder');
    duckburg.objects.populateFormForEditing(object, type);
    duckburg.forms.currentlyEditingObject = object;
  },

  // Edit an object - fill a 'new item' form with existing details.
  populateFormForEditing: function(object, type) {

    // Get the attributes and type for the object.
    var attribs = object.attributes;
    var model = duckburg.models[type];

    // Iterate over all attributes and fill each field.
    for (var item in attribs) {

      // If there is a target field to fill...
      var modelItem = model.values[item];
      if (modelItem) {

        // Checkbox behavior (can't simply fill an input)
        if (modelItem.input == 'checkbox') {
          var checked = attribs[item] == 'yes';
          $('#' + item).prop('checked', checked);

        // All other text based inputs.
        } else if (modelItem.input == 'image') {

          var imgArray = attribs[item].split(',');
          duckburg.forms.displayImagesInsideNewObjectForm(imgArray, item);

          // Still assign value like normal.
          $('#' + item).val(attribs[item]);

        } else {

          // Set the value of an input.
          $('#' + item).val(attribs[item]);

          // Special case for an event where the input contains a reference to
          // another object.  For example, name is simply a string, but supplier
          // may contain the id of another object.  In this case, take the
          // value (which will be a unique id) and store it in a hidden field.
          // Fetch a readable value from the DB, and set both.
          if (modelItem.dbObject) {

            // Type of object to fetch, and the value we want off of the object.
            var type = modelItem.dbObject.type;
            var pKey = modelItem.dbObject.primary_key;

            // Get the object by its id, fetch our readable value.
            duckburg.requests.quickFind(type,
              function(result, returnedItem, key) {
                var readableValue = result.attributes[key];
                $('#' + returnedItem + '_visible_readonly').val(readableValue);
              },
              function(error) {
                duckburg.errorMessage(error.messge);
              },
              attribs[item], item, pKey);
          }
        }
      }
    }
  },

  // Show the user that no results have been found.
  showZeroResultsMessage: function() {
    $('.zeroResultsForListDiv').remove();
    $('.loadingMessage').remove();
    $('.wrapper-content')
      .append($('<div>')
      .attr('class', 'zeroResultsForListDiv')
      .html('no results for this search'));
  },

  hideNewObjectForm: function() {
    $('.newObjectFormHolder')
      .html('')
      .hide();

    // Clear out editing item if it exists.
    duckburg.forms.currentlyEditingObject = false;
  },

  // Get related objects for a particular input field.
  relatedObjectSelector: function(event, object) {

    // Launch related items selector.
    duckburg.objects.launchRelatedItemSelector(event);

    if (object.type == 'BOOL') {
      console.log(event)
      $('.inputPopupSelector')
        .append($('<div>')
          .attr('class', 'relatedObjectResultsHolder'));

      $('.relatedObjectResultsHolder')
        .append($('<span>')
          .html('YES')
          .attr('id', 'YES')
          .click(function(e) {
            var obj = {
              currentTarget: {
                id: 'YES',
                innerHTML: 'YES'
              }
            }
            duckburg.objects.selectRelatedObject(obj, event);
          }));

      $('.relatedObjectResultsHolder')
        .append($('<span>')
          .html('NO')
          .attr('id', 'NO')
          .click(function(e) {
            var obj = {
              currentTarget: {
                id: 'NO',
                innerHTML: 'NO'
              }
            }
            duckburg.objects.selectRelatedObject(obj, event);
          }));

      return;
    }

    // Set a header and filter input.
    duckburg.objects.loadInputPopupHeader(object, event);

    // Fetch and drop the results into the selector.
    duckburg.objects.fetchRelatedObjects(object.type, object.primary_key, event);
  },

  loadInputPopupHeader: function(object, event) {

    var type = duckburg.models[object.type].display_name;

    $('.inputPopupSelector')
      .append($('<input>')
        .attr('class', 'filterForRelatedObjectPicker')
        .attr('placeholder', 'Select a ' + type)
        .keyup(function(e) {
          duckburg.objects.relatedObjectFilterSearch(e, object, event);
        }));

    $('.inputPopupSelector')
      .append($('<a>')
        .html('+')
        .attr('href', '/make/' + object.type)
        .attr('target', 'new')
        .attr('class', 'makeNewObjectInNewWindow'));

    $('.inputPopupSelector')
      .append($('<div>')
        .attr('class', 'relatedObjectResultsHolder'));
  },

  relatedObjectFilterSearch: function(e, object, originalEvent) {

    if (duckburg.objects.relatedObjectFilterSearchTimeout) {
      window.clearInterval(duckburg.objects.relatedObjectFilterSearchTimeout);
    }

    var el = e.currentTarget;
    var val = el.value;

    duckburg.objects.relatedObjectFilterSearchTimeout = setTimeout(function() {
      duckburg.objects.fetchRelatedObjects(
          object.type, object.primary_key, originalEvent, val);
    }, 200);

  },

  fetchRelatedObjects: function(type, key, originalEvent, filters) {

    // Clear out the existing list.
    $('.relatedObjectResultsHolder').html('');

    duckburg.requests.findObjects(type,

        // Success CB
        function(results) {

          duckburg.objects.currentRelatedResults = results;
          for (var i = 0; i < results.length; i++) {
            var item = results[i];
            var attribs = item.attributes;
            var value = attribs[key];
            $('.relatedObjectResultsHolder')
              .append($('<span>')
                .html(value)
                .attr('id', item.id)
                .click(function(e) {
                  duckburg.objects.selectRelatedObject(e, originalEvent);
                }));
          }

          if (results.length == 0 || !results) {
            $('.relatedObjectResultsHolder')
              .append($('<span>')
                .html('no results found'));
          }
        },

        // Error CB
        function(message) {
          duckburg.errorMessage(message);
        },

        // Include filters in request.
        filters);
  },

  selectRelatedObject: function(event, originalEvent) {


    // Remove the selector.
    $('.inputPopupSelector').remove();
    $('.offClicker').hide();

    if ($('.orderForm').length > 0) {

      // We're in an order, kick back to order form for simple value drop.
      duckburg.orders.simplePlaceObject(event.currentTarget, originalEvent);
      return;
    }

    // Drop a readable value into the input field.
    var targetField = originalEvent.currentTarget;
    var value = event.currentTarget.innerHTML;
    targetField.value = value;

    // Now drop the id of the elment, the actual value we want to save.
    var rootName = targetField.id.replace('_visible_readonly', '');
    var hiddenField = $('#' + rootName);
    hiddenField.val(event.currentTarget.id);

    duckburg.objects.setRelatedProductFields(event, rootName);
  },

  setRelatedProductFields: function(event, value) {
    var selectedItemId = event.currentTarget.id;
    var model = duckburg.models[duckburg.forms.currentlyCreatingItemWithType];

    for (var i = 0; i < duckburg.objects.currentRelatedResults.length; i++) {
      var item = duckburg.objects.currentRelatedResults[i];
      if (item.id == selectedItemId) {
        var attributes = item.attributes;
        var maps = model.values[value].dbObject.additional_mappings;
        for (var map in maps) {

          // Special logic for the order form.  Make sure we are dropping
          // the item number into the Nth item, n being the last clicked
          // element.
          var designCount = $('.catalogItemWithinOrder').length;
          if (maps[map] == 'supplier_item_id' && designCount > 0) {
            var parent = duckburg.orders.lastClickedProductButton.parentElement;

            // Save the product number for the database.
            for (var j = 0; j < parent.children.length; j++) {
              var el = parent.children[j];
              if (el.id == 'product_type') {
                el.value = item.id;
              }
            }

            // Place the visible values in the form for the user.
            for (var kid in parent.children) {
              if (parent.children[kid].className == 'designInFormProductNumber') {
                parent.children[kid].value = attributes[map];
              }
            }

          // Standard logic for regular forms.
          } else {
            $('#' + maps[map]).val(attributes[map]);
          }

        }
      }
    }
  },

  launchRelatedItemSelector: function(e) {

    // Remove any existing popups.
    $('.inputPopupSelector').remove();

    // Show offclicker element.
    $('.offClicker')
      .show()
      .click(function() {
        $('.inputPopupSelector').remove();
        $('.offClicker').hide();
      });

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
  }
}


/*
 * Objects menu item
 * Show all objects in a sub-menu when object menu item is clicked.
 * Hide this menu if it is already visible onclick.
 *
 */
$('.menuObjectsButton').click(function() {
  var display = $('.objectMenu').css('display');
  if (display == 'block') {
    $('.objectMenu').hide();
  } else {
    duckburg.objects.objectView();
  }
});
