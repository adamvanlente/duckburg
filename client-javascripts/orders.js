// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.orders = {

  toggleForm: function() {

    duckburg.forms.globalLoader(
        duckburg.config.ORDER_FORM_FIELDS, 'formOrders');
  }

};
