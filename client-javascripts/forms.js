// DuckBurg namespace.
var duckburg = duckburg || {};

/**
 * These are some methods to help the forms work properly.  Separated
 * from the rest of the JS to keep things tidy.
 */
duckburg.forms = {

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
      .css({'background': 'url(' + url + ')',
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
