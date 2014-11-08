// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.utils = {

  searchInterval: 400,

  currentTopZIndex: 1000,

  currentOpenForms: [],
  currentOpenFormFields: [],

  currentlyViewingFormName: false,
  currentlyViewingFormFields: false,

  toTitleCase: function(str) {
    return str.replace(/\w\S*/g,
        function(txt){return txt.charAt(0).toUpperCase() +
        txt.substr(1).toLowerCase();
    });
  },

  clearSearchFilters: function() {
    duckburg.searchFilters = undefined;
  },

  inputIsCheckbox: function(field) {
    if (duckburg.config.checkboxInputList.indexOf(field) != -1) {
      return true;
    }
    return false;
  },

  isSearchableValue: function(field, value) {

    // All date fields should be ignored.
    if (field.search('date') != -1) {
      return false;
    }

    // Ignore any url values.
    if (value.search('http://') != -1) {
      return false;
    }

    if (duckburg.config.invalidSearchableFields.indexOf(field) != -1) {
      return false;
    }

    return true;
  },

  lightboxImage: function(url) {
    $('.imageLightboxBlackout')
      .show()
      .click(function() {
        $('.imageLightboxBlackout').hide();
      });
    $('.imageLightboxHolder').css({
        'background': 'url(' + url + ')',
        'background-size' : '100%'
    });
  }
};
