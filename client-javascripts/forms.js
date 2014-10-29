// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.forms = {

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
  },

  globalLoader: function() {
    duckburg.forms.clearFormFields();
    duckburg.forms.populateEmptyForm();

    $('.' + duckburg.currentForm).attr(
        'class', duckburg.currentForm + ' form-visible');
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


  /*
   * Customer form functions
   */
  customers: function() {
    duckburg.currentFormFields = ['first_name', 'last_name', 'email_address',
    'phone_number', 'company', 'address_one', 'address_two', 'address_city',
    'address_state', 'address_zip', 'customer_notes'];
    duckburg.currentForm = 'formCustomer';
    duckburg.forms.globalLoader();
  },

  validateCustomerForm: function() {

    // Validate required fields.
    var first_name = $('#first_name').val();
    var last_name = $('#last_name').val();
    var email_address = $('#email_address').val();
    var phone_number = $('#phone_number').val();

    if (first_name == '' || last_name == '' || email_address == '' ||
        phone_number == '') {
      var msg = 'Required fields: first name, last name, email & phone.';
      duckburg.errorMessage(msg);
      return false;
    }

    if (email_address.search('@') == -1) {
      var msg = 'Email address has no @ symbol.  Sup with that?';
      duckburg.errorMessage(msg);
      return false;
    }

    duckburg.requests.customers.create();
  },

  /*
   * Product form functions
   */
  products: function() {
    duckburg.currentFormFields = ['first_name', 'last_name', 'email_address',
    'phone_number', 'company', 'address_one', 'address_two', 'address_city',
    'address_state', 'address_zip', 'customer_notes'];
    duckburg.currentForm = 'formProducts';
    duckburg.forms.globalLoader();
  },

  suppliers: function() {
    duckburg.currentFormFields = ['supplier_name', 'website',
        'contact_person', 'contact_number', 'contact_email'];
    duckburg.currentForm = 'formSuppliers';
    duckburg.forms.globalLoader();
  },

  validateSupplierForm: function() {
      // Validate required fields.
      var supplier_name = $('#supplier_name').val();

      if (supplier_name == '') {
        var msg = 'Supplier name cannot be empty.';
        duckburg.errorMessage(msg);
        return false;
      }
      duckburg.requests.suppliers.create();
  },

  template: function() {
    // duckburg.currentFormFields = [ARRAY_OF_FIELD_NAMES];
    // duckburg.currentForm = 'CURRENTFORMNAME';
    // duckburg.forms.globalLoader();
  },

  templateValidate: function() {
      // Validate required fields.
      // ..........

      // if (SOME_CONDITION) {
      //   var msg = 'Explain why its wrong';
      //   duckburg.errorMessage(msg);
      //   return false;
      // }
      //
      // duckburg.requests.CURRENT_NODE.create();
  },


};
