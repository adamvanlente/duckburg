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
        console.log('searching');
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
        .html('Create new ' + model.display_name));

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

    // All other form fields.
    } else {
      formDiv.append(
        $('<input>')
        .attr('class', field.input_size)
        .attr('type', field.input)
        .attr('placeholder', placeholder)
        .attr('id', fieldName));
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
      function(result) {
        var msg = 'Created new item.';
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
      .attr('class', 'objectListLegend');

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
    $('.objectResultListItemSpan').each(function() {
      this.remove();
    });

    // Let the user know a search is being performed.
    duckburg.objects.showLoadingResultsMessage();

    duckburg.requests.findObjects(type,

        // Success CB
        duckburg.objects.renderListOfObjects,

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
    $('.wrapper-content').append($('<div>')
      .attr('class', 'loadingMessage')
      .html('searching for items'));
  },

  // With results, render the list of objects.
  renderListOfObjects: function(results) {

    // TODO array of random  responsese like no, nope, nada, found nothing, etc.
    if (results.length == 0 || !results) {
      duckburg.objects.showZeroResultsMessage();
    } else {
      duckburg.renderListOfObjects(results);
    }
  },

  renderListOfObjects: function(results) {

    $('.loadingMessage').remove();

    var validFields = duckburg.objects.currentlyViewingFields;

    for (var i = 0; i < results.length; i++) {

      var span = $('<span>')
        .attr('class', 'objectResultListItemSpan');

      var obj = results[i];
      var items = obj['attributes'];

      for (var field in validFields) {

        span.append($('<label>')
          .html(items[field]));
      }

      $('.wrapper-content').append(span);
    }

  },

  // Show the user that no results have been found.
  showZeroResultsMessage: function() {
    $('.wrapper-content').append($('<div>')
      .attr('class', 'zeroResultsForListDiv')
      .html('no results for this search'));
  },

  hideNewObjectForm: function() {
    $('.newObjectFormHolder')
      .html('')
      .hide();
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
