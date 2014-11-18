// DuckBurg namespace.
var duckburg = duckburg || {};

/**
 * These are some methods to help the forms work properly.  Separated
 * from the rest of the JS to keep things tidy.
 */
duckburg.forms = {

  // Create a new object form, so that a user can create a new object.
  createNewObjectFormForObject: function(modelType, parentClass) {

    // Get model and fields for form.
    var model = duckburg.models[modelType];
    var fields = model.values;

    // Hold the type in memory.
    duckburg.forms.currentlyCreatingItemWithType = modelType;

    // Create a heading/message for the form.
    $(parentClass)
      .html('')
      .append($('<h3>')
        .html(model.display_name));

    // Create the form elements.
    var formDiv = $('<div>')
      .attr('class', 'newObjectFormFields');

    for (var field in fields) {
      duckburg.forms.createFieldForNewObjectForm(fields[field], formDiv, field);
    }

    // Append form to the holder.
    $(parentClass)
      .append(formDiv)
      .show();

    // Save and Cancel buttons for the form.
    duckburg.forms.createNewObjectFormButtons(modelType, parentClass);
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

      var inputType = field.input == 'date' ? 'text' : field.input;

      var inputClass = field.input == 'date' ?
          field.input_size + ' makeMeHighsmith' : field.input_size;

      var input = $('<input>')
        .attr('class', inputClass)
        .attr('type', inputType)
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

      // Make calendars out of date fields.
      if (field.input == 'date') {
        setTimeout(function () {

          $('.makeMeHighsmith').each(function() {
            var id = this.id;

            var calConfig = {
              style: {
                disable: true
              },
              killButton: true
            };

            var cal = new Highsmith(id, calConfig);
          })

        }, 100)
      }
    }
  },

  createNewObjectFormButtons: function(type, parentClass) {

    $(parentClass)
      .append($('<div>')
        .attr('class', 'createNewObjectFormButtons'));

    if (parentClass != '.newCustomerForm') {

      $('.createNewObjectFormButtons')
        .append($('<button>')
          .html('cancel')
          .attr('class', 'cancelButton')
          // Cancel create new object.
          .click(function() {
            duckburg.objects.hideNewObjectForm();
          }));

    }

    $('.createNewObjectFormButtons')
      .append($('<button>')
        .html('save')
        .attr('class', 'saveButton')
        .attr('id', type)
        .click(function(e) {
          duckburg.objects.saveNewObject(e);
        }));
  },

  // An image picker for within the create new item form.
  createImagePicker: function(parent, inputId) {

    // Create a holder for the picker.
    var imagePickerHolder = $('<div>')
      .attr('class', 'newObjectFormImagePicker full')

    // make the image picker.
    var imgPicker = duckburg.forms.makeImagePickerDomElement(inputId);
    imagePickerHolder.append(imgPicker);

    // Create a holder for any images that might get added
    imagePickerHolder.append(
      $('<div>')
        .attr('class', 'imagePickerImageHolder'));

    // Create a hidden input that will store the file urls.
    parent.append($('<input>')
      .attr('type', 'hidden')
      .attr('id', inputId));

    // Append the image picker.
    parent.append(imagePickerHolder);
  },

  makeImagePickerDomElement: function(inputId) {
    // Create image picker.
    var imgPicker = $('<input>')
      .attr('type', 'file')
      .attr('id', 'newInputFilePicker')
      .attr('class', 'editingCatalogImageDesignPicker')
      .change(function(e) {
        duckburg.requests.files.save(e.currentTarget, function(results) {

          // Update the image listing.
          duckburg.forms.updateImageListing(results._url, inputId);
        })
      });

    return imgPicker;
  },

  // Update the images that are being stored, as well as the actual images
  // that appear in the form.
  updateImageListing: function(url, inputId) {

    // Create a fresh input.
    var imgPicker = duckburg.forms.makeImagePickerDomElement(inputId);
    $('#newInputFilePicker').replaceWith(imgPicker);

    // Get the list of image urls.
    var existingImages = $('#' + inputId).val();
    var imageArray = existingImages.split(',');

    // Make sure the image isn't empty or just a comma.
    if (imageArray.length == 1 && imageArray[0] == '') {
      imageArray = [];
    }

    // Update the list of stored urls.
    imageArray.push(url);
    $('#' + inputId).val(imageArray.join(','));

    // Display images.
    duckburg.forms.displayImagesInsideNewObjectForm(imageArray, inputId);
  },

  removeImageFromImageList: function(event, inputId) {

    // Remove image from UI.
    var el = $('#' + event.currentTarget.id);
    el[0].parentNode.remove();

    // Get the list of images.
    var val = $('#' + inputId).val();

    // Remove the selected item from the list of images.
    var imgArray = val.split(',');
    var index = el.attr('id');
    imgArray.splice(index, 1);

    $('#' + inputId).val(imgArray.join(','));
  },

  viewImageDetail: function(event, inputId) {

    // Get the span that contains the image.
    var el = $('#' + event.currentTarget.id);

    // Get the list of images.
    var val = $('#' + inputId).val();

    // Get the url from the list of images.
    var imgArray = val.split(',');
    var index = el.attr('id');
    var url = imgArray[index];

    // Reveal image detail div.
    $('.imgDetail')
      .show()
      .click(function() {
        $('.imgDetail').hide();
      });

    // Assign url to background of image detail.
    $('.imgDetailContent')
      .css({'background': '#F1F1F1 url(' + url + ')',
            'background-size': '100%'});

  },

  // Display images within the form.
  displayImagesInsideNewObjectForm: function(imageArray, inputId) {
    var parent = $('.imagePickerImageHolder');
    parent.html('');

    for (var i = imageArray.length - 1; i >= 0; i--) {
      var url = imageArray[i];
      if (url != '') {
          parent.append(
            $('<span>')
              .css({'background': 'url(' + url + ')',
                'background-size': '100%'})
              .append($('<label>')
                .attr('class', 'delete')
                .html('remove')
                .attr('id', i)
                .click(function(e) {
                  duckburg.forms.removeImageFromImageList(e, inputId);
                }))
              .append($('<label>')
                .attr('class', 'view')
                .attr('id', i)
                .html('view')
                .click(function(e) {
                  duckburg.forms.viewImageDetail(e, inputId);
                })));
      }
    }
  }
};
