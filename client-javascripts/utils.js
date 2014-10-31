// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.utils = {

  searchInterval: 400,

  currentTopZIndex: 1000,

  toTitleCase: function(str) {
    return str.replace(/\w\S*/g,
        function(txt){return txt.charAt(0).toUpperCase() +
        txt.substr(1).toLowerCase();
    });
  },

  clearSearchFilters: function() {
    duckburg.searchFilters = undefined;
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

    // Filter out any invalid fields.
    var invalidFields = ['product_price', 'product_sizes', 'product_colors',
        'color_count'];
    if (invalidFields.indexOf(field) != -1) {
      return false;
    }

    return true;

  }

};
