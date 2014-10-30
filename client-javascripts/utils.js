// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.utils = {

  searchInterval: 400,

  toTitleCase: function(str) {
    return str.replace(/\w\S*/g,
        function(txt){return txt.charAt(0).toUpperCase() +
        txt.substr(1).toLowerCase();
    });
  },

  clearSearchFilters: function() {
    duckburg.searchFilters = undefined;
  }

};
