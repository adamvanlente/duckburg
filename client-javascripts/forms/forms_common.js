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

  },

  closeCurrentForm: function() {
    var form = $('.' + duckburg.currentForm);
    var formClass = form.attr('class');
    formClass = formClass.replace('visible', 'hidden');
    form.attr('class', formClass);

    // Be sure this div is not visible.
    // TODO(adam) be sure to create a more reasonable way of closing stuff
    //            if there are more divs like this around.
    var messageDiv = $('.existingCustomerMessage');
    messageDiv.attr('class', 'existingCustomerMessage hidden');
    duckburg.parseEditingObject = undefined;
    duckburg.existingEditingDesignImages = undefined;
    $('.inputPopupSelector').each(function() {
      this.remove();
    });
  },

  populateEmptyForm: function () {
    if (duckburg.parseEditingObject) {
      var fields = duckburg.parseEditingObject.attributes;
      for (var attribute in fields) {

        $('#' + attribute).val(fields[attribute]);
      }
    }
  },

  clearFormFields: function() {
    for (var i = 0; i < duckburg.currentFormFields.length; i++) {
      var field = duckburg.currentFormFields[i];
      $('#' + field).val('');
    }
  },

  createPopupForInput: function(e, parseObject, targetClass) {


    this.appendInputPopup(e);

    // Set a loading message.
    var span = $('<span></span>')
      .html('loading items');
    $('.inputPopupSelector').append(span);

    this.getListOfItemsForPopup(parseObject, targetClass);
  },

  getListOfItemsForPopup: function(parseObject, targetClass) {
    duckburg.requests.common.genericFind(parseObject,
      function(results) {

        // Clear div.
        $('.inputPopupSelector').html('');

        // Determine if results exist.
        if (results.length == 0 || !results) {
          var span = $('<span></span>')
            .html('Create some items!');
          $('.inputPopupSelector').append(span);
          return false;
        } else {
          duckburg.forms.common.inputPopupFilterControl();
        }

        // Create a holder for the list of items.
        var div = $('<div></div>')
          .attr('class', 'inputPopupListHolder');

        duckburg.forms.common.getAndAppendFilteredOptions(
            div, results, targetClass);

    })
  },

  getAndAppendFilteredOptions: function(div, results, targetClass) {
    for (var i = 0; i < results.length; i++) {
      var item = results[i].attributes['supplier_name'];

      var span = $('<span></span>')
        .html(item);

      span.click(function(event) {
          $(targetClass).val(event.currentTarget.innerHTML);
          $('.inputPopupSelector').remove();
      })

      div.append(span);
    }
    $('.inputPopupSelector').append(div);

    var button = $('<button></button>')
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
  },

  appendInputPopup: function(e) {

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
          'top': '150px'
      }
    }

    // Create, style and append the div.
    var div = $('<div>')
      .css(css)
      .attr('class', 'inputPopupSelector');
    $(document.body).append(div);
  },

  imagePickerListener: function(e) {

    // Update hidden field with image url
    var curId = e.currentTarget.id;
    var targetInputId = curId + '_ref';

    if (e.currentTarget.value != '') {
      duckburg.forms.common.appendNewImagePicker('.designImageHolder');

      // Save the image.
      duckburg.currentlySavingImage = true;
      duckburg.requests.files.save(curId, function(result) {
        $('#' + targetInputId).val(result._url);
        duckburg.forms.common.addImageToDesignForm(result._url, targetInputId);
      });

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

    var fieldCount = 0;
    $('.designImagePicker').each(function() {
      if (this.value != '') {
        fieldCount++;
      }
    });

    var id = 'design_image_' + fieldCount;

    var labelContent = fieldCount == 0 ? 'Add images' : '&nbsp;';

    // append a blank label for spacing.
    $('.designImageHolder').append($('<label></label>')
      .html(labelContent)
      .attr('class', 'imagePickerLabel'));

    var label = $('<label></label>');

    // Create image picker.
    var imgPicker = $('<input>')
      .attr('type', 'file')
      .attr('id', id)
      .attr('class', 'designImagePicker');
    label.append(imgPicker);

    // Create image ref.
    var imgRef = $('<input>')
      .attr('type', 'hidden')
      .attr('id', id + '_ref')
      .attr('class', 'designImageUrl');
    label.append(imgRef);

    // append the label that contains inputs.
    $('.designImageHolder').append(label);
    $('.designImageHolder').append('<br>');
  },

  addImageToDesignForm: function(url, isNew) {
    var div = $('<div>');
    var imgCss = {
        'background': 'url(' + url + ')',
        'background-size': '100%'
    }

    var id = isNew ? isNew : url;

    var img = $('<img>')
      .css(imgCss);
    var label = $('<label>')
      .attr('class', 'cancel')
      .html('remove')
      .attr('id', id)
      .click(function(e) {
        if (!isNew) {
          var url = e.currentTarget.id;
          var index = duckburg.existingEditingDesignImages.indexOf(url);
          duckburg.existingEditingDesignImages.splice(index, 1);
        } else {
          var clickedId = e.currentTarget.id;

          clickedId = clickedId.replace('_ref', '');

          var newInput = $('<input>')
            .attr('id', clickedId)
            .attr('type', 'file')
            .attr('class', 'designImagePicker');
          $('#' + clickedId).replaceWith(newInput);

          // Since there are new pickers, reapply the listener.
          $('.designImagePicker').change(function(e) {
            duckburg.forms.common.imagePickerListener(e);
          });
        }

        var parent = e.currentTarget.parentElement;
        parent.parentElement.removeChild(parent);
      });

    div.append(img);
    div.append(label);
    $('.existingImages').append(div);
  },

  displayExistingDesignImages: function() {

    var imagesList =
        duckburg.parseEditingObject.attributes.design_images_list.split(',');

    duckburg.existingEditingDesignImages = imagesList;

    for (var i = 0; i < imagesList.length; i++) {
      var url = imagesList[i];
      duckburg.forms.common.addImageToDesignForm(url);
    }
  }
};
