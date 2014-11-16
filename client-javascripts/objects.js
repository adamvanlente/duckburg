// DuckBurg namespace.
var duckburg = duckburg || {};

/*
 * For clarification, objects here refers to database objects; all items
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
          duckburg.objects.createNewObjectFormForObject(e.currentTarget.id);
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

  // Create a new object form, so that a user can create a new object.
  createNewObjectFormForObject: function(modelType) {

    // Get model and fields for form.
    var model = duckburg.models[modelType];
    var fields = model.values;

    // Create a heading/message for the form.
    $('.newObjectFormHolder')
      .html('')
      .append($('<h3>')
        .html(model.display_name));

    // Create the form elements.
    var formDiv = $('<div>')
      .attr('class', 'newObjectFormFields');

    for (var field in fields) {
      duckburg.objects.createFieldForNewObjectForm(fields[field], formDiv, field);
    }

    // Append form to the holder.
    $('.newObjectFormHolder')
      .append(formDiv)
      .show();

    // Save and Cancel buttons for the form.
    duckburg.objects.createNewObjectFormButtons(modelType);
  },

  // Create a field, which can be a text field, checkbox, or many other things.
  createFieldForNewObjectForm: function(field, formDiv, fieldName) {

    // Note if a field is required in the placeholder.
    var placeholder = field.required ?
        field.placeholder + ' (required)' : field.placeholder;

    // Textarea form fields.
    if (field.input == 'textarea') {
      formDiv.append(
        $('<textarea>')
        .attr('class', field.input_size)
        .attr('placeholder', placeholder)
        .attr('id', fieldName));

    // Checkboxes.
    } else if (field.input == 'checkbox') {
        formDiv
          .append($('<label>')
            .html(placeholder))
          .append($('<input>')
            .attr('type', field.input)
            .attr('id', fieldName))
          .append('<br>');

    } else if (field.input == 'image') {

      duckburg.forms.createImagePicker(formDiv, fieldName);

    // All other form fields.
    } else {

      var input = $('<input>')
        .attr('class', field.input_size)
        .attr('type', field.input)
        .attr('placeholder', placeholder)
        .attr('id', fieldName);

      // For some fields, the input is controlled.  For instance, when a user
      // chooses a supplier for a Product (the supplier we order this product
      // from), it must come from our list of existing suppliers, or the user
      // must create a new supplier if neccesary.  For these inputs, we must
      // supress the native behavior, and add a little helper that will make
      // some calls out to the database and give us the info we need.
      if (field.dbObject) {
        input
          .prop('readonly', true)
          .attr('id', fieldName + '_visible_readonly')
          .click(function(e) {
            duckburg.objects.relatedObjectSelector(e, field.dbObject);
          });
        formDiv.append(input);

        // Append a hidden input that will actually store the value.
        formDiv.append($('<input>')
          .attr('type', 'hidden')
          .attr('id', fieldName));

      } else {
        formDiv.append(input);
      }


    }
  },

  createNewObjectFormButtons: function(type) {
    $('.newObjectFormHolder')
      .append($('<div>')
        .attr('class', 'createNewObjectFormButtons')
        .append($('<button>')
          .html('cancel')
          .attr('class', 'cancelButton')

          // Cancel create new object.
          .click(function() {
            duckburg.objects.hideNewObjectForm();
          }))
        .append($('<button>')
          .html('save')
          .attr('class', 'saveButton')
          .attr('id', type)
          .click(function(e) {
            duckburg.objects.saveNewObject(e);
          })));
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
        duckburg.successMessage(msg);
        duckburg.objects.hideNewObjectForm();
        duckburg.objects.beginLoadingObjectView(type);
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
        span.append($('<label>')
          .html(items[field]));
      }
      holder.append(span);
    }
    $('.wrapper-content').append(holder);
  },

  launchObjectEditor: function(event) {
    var el = event.currentTarget;
    var object = duckburg.objects.currentResults[el.id];
    var type = $('.objectListLegend').attr('id');
    duckburg.objects.createNewObjectFormForObject(type);
    duckburg.objects.populateFormForEditing(object, type);

    duckburg.objects.currentlyEditingObject = object;
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
              function(result, returnedItem) {
                var readableValue = result.attributes[pKey];
                $('#' + returnedItem + '_visible_readonly').val(readableValue);
              },
              function(error) {
                duckburg.errorMessage(error.messge);
              },
              attribs[item], item);
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
    duckburg.objects.currentlyEditingObject = false;
  },

  // Get related objects for a particular input field.
  relatedObjectSelector: function(event, object) {

    // Launch related items selector.
    duckburg.objects.launchRelatedItemSelector(event);

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

    // Drop a readable value into the input field.
    var targetField = originalEvent.currentTarget;
    var value = event.currentTarget.innerHTML;
    targetField.value = value;

    // Now drop the id of the elment, the actual value we want to save.
    var hiddenField = $('#' + targetField.id.replace('_visible_readonly', ''));
    hiddenField.val(event.currentTarget.id);
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
