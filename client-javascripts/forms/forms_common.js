// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.forms.common = {

  /*
   * Some global functions for all forms
   */
  saveCurrentForm: function() {
    var form = duckburg.currentForm;

    if (form == 'formCustomer') {
      duckburg.forms.validateCustomerForm();
    }

    if (form == 'formSuppliers') {
      duckburg.forms.validateSupplierForm();
    }

    if (form == 'formColors') {
      duckburg.forms.validateColorForm();
    }

    if (form == 'formProducts') {
      duckburg.forms.validateProductForm();
    }

    if (form == 'formDesigns') {
      duckburg.forms.validateDesignForm();
    }

    if (form == 'formCatalogItem') {
      duckburg.forms.validateCatalogItem();
    }

  },

  closeCurrentForm: function() {

    // Hide the current form.
    var form = $('.' + duckburg.currentForm);
    var formClass = form.attr('class');
    formClass = formClass.replace('visible', 'hidden');
    form.attr('class', formClass);
    $('.' + formClass).css('z-index', '12');

    // If the close call is coming because someone has created a new item
    // using the filter input, don't remove all form elements - there's
    // still another one beneath it.
    if (duckburg.filteringInput) {

      // Set current form to the previous form.
      duckburg.currentForm = duckburg.previousForm;
      duckburg.currentFormFields = duckburg.previousFormFields;
      duckburg.filteringInput = false;
      return false;
    }

    // Be sure this div is not visible.
    // TODO(adam) be sure to create a more reasonable way of closing stuff
    //            if there are more divs like this around.
    var messageDiv = $('.existingCustomerMessage');
    messageDiv.attr('class', 'existingCustomerMessage hidden');
    duckburg.parseEditingObject = undefined;
    duckburg.existingEditingDesignImages = undefined;
    duckburg.forms.inputs.removeFilterPopups();
    $('.whiteOut').hide();
  },

  populateEmptyForm: function () {
    if (duckburg.parseEditingObject) {

      var fields = duckburg.parseEditingObject.attributes;
      for (var attribute in fields) {

        $('#' + attribute).val(fields[attribute]);
      }
    }

    if (duckburg.parseEditingObject.attributes.product_design_id) {
      var id = duckburg.parseEditingObject.attributes.product_design_id;
      duckburg.forms.common.getImageInfoFromParseUsingImageId(id);
    }
  },

  getImageInfoFromParseUsingImageId: function(id) {
    console.log('gonna get some product info');

    var Design = Parse.Object.extend('DuckburgDesign');
    var query = new Parse.Query(Design);
    query.equalTo('objectId', id);

    query.find({
      success: function(existingDesign) {
        duckburg.filterPopupEditingDesign = existingDesign[0];
        // Let's get super dope and show the user some design details on the
        // fly.
        duckburg.forms.inputs.displayEditableDesign();
      },
      error: function(error) {
        var msg = 'Tried to load a design and failed:' + error.message;
        duckburg.errorMessage(msg);
      }
    });



  },

  clearFormFields: function() {
    for (var i = 0; i < duckburg.currentFormFields.length; i++) {
      var field = duckburg.currentFormFields[i];
      $('#' + field).val('');
    }
  },

  imagePickerListener: function(e) {

    // Update hidden field with image url
    var curId = e.currentTarget.id;
    var targetInputId = curId + '_ref';

    if (e.currentTarget.value != '') {

      // Save the image.
      duckburg.currentlySavingImage = true;
      duckburg.requests.files.save(curId, function(result) {
        $('#' + targetInputId).val(result._url);
        duckburg.forms.common.addImageToDesignForm(result._url, targetInputId);
      });

      duckburg.forms.common.resetImagePicker();

      // Since there are new pickers, reapply the listener.
      $('.designImagePicker').change(function(e) {
        duckburg.forms.common.imagePickerListener(e);
      });

    } else {
      // Don't store value if customer has removed an image.
      $('#' + targetInputId).val('');
    }
  },

  appendNewImagePicker: function() {

    // append a blank label for spacing.
    $('.designImageHolder').append($('<label>')
      .html('Add images')
      .attr('class', 'imagePickerLabel'));

    var label = $('<label>');

    // Create image picker.
    var imgPicker = $('<input>')
      .attr('type', 'file')
      .attr('id', 'design_image')
      .attr('class', 'designImagePicker');
    label.append(imgPicker);

    // Create image ref.
    var imgRef = $('<input>')
      .attr('type', 'hidden')
      .attr('id', 'design_image_ref')
      .attr('class', 'designImageUrl');
    label.append(imgRef);

    // append the label that contains inputs.
    $('.designImageHolder').append(label);
    $('.designImageHolder').append('<br>');
  },

  resetImagePicker: function() {
    var newInput = $('<input>')
      .attr('id', 'design_image')
      .attr('type', 'file')
      .attr('class', 'designImagePicker');
    $('#design_image').replaceWith(newInput);
  },

  addImageToDesignForm: function(url, isNew) {
    var imgCss = {
        'background': 'url(' + url + ')',
        'background-size': '100%'
    }

    var id = isNew ? isNew : url;

    var imgLabel = $('<div>')
      .attr('class', 'designFormImageThumb')
      .css(imgCss);

    var viewEm = $('<em>')
      .attr('id', url)
      .attr('class', 'view')
      .html('view')
      .click(function(e) {
        var url = e.currentTarget.id;
        duckburg.utils.lightboxImage(url);
      })

    var removeEm = $('<em>')
      .attr('class', 'remove')
      .html('remove')
      .attr('id', id)
      .click(function(e) {
        if (!isNew) {
          var url = e.currentTarget.id;
          var index = duckburg.existingEditingDesignImages.indexOf(url);
          duckburg.existingEditingDesignImages.splice(index, 1);
        } else {
          // Since there are new pickers, reapply the listener.
          $('.designImagePicker').change(function(e) {
            duckburg.forms.common.imagePickerListener(e);
          });
        }

        var parent = e.currentTarget.parentElement;
        parent.parentElement.removeChild(parent);
      });

    imgLabel.append(viewEm);
    imgLabel.append(removeEm);

    $('.existingImages').append(imgLabel);
  },

  displayExistingDesignImages: function() {

    var imagesList =
        duckburg.parseEditingObject.attributes.design_images_list.split(',');

    duckburg.existingEditingDesignImages = imagesList;

    for (var i = 0; i < imagesList.length; i++) {
      var url = imagesList[i];
      if (url != '') {
        duckburg.forms.common.addImageToDesignForm(url);
      }
    }
  }
};
