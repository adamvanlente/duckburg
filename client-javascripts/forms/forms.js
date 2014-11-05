// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.forms = {

  globalLoader: function(fields, formName) {
    $('.whiteOut').show();

    // TODO have to make this a glbal for all forms just like close global
    $('#product_design').val('');
    $('.editingCatalogItemDesignDetails')
      .html('')
      .hide();

    duckburg.utils.currentTopZIndex++;
    $('.' + formName).css('z-index', duckburg.utils.currentTopZIndex);

    if (duckburg.currentForm) {
      duckburg.previousForm = duckburg.currentForm;
    }

    if (duckburg.currentFormFields) {
      duckburg.previousFormFields = duckburg.currentFormFields;
    }

    duckburg.currentFormFields = fields;
    duckburg.currentForm = formName;
    duckburg.forms.common.clearFormFields();
    duckburg.forms.common.populateEmptyForm();

    $('.' + duckburg.currentForm).attr(
        'class', duckburg.currentForm + ' form-visible basicForm');
  },

  /**
   * Setup customer form
   *
   */
  customers: function() {
    duckburg.forms.globalLoader(
        duckburg.config.CUSTOMER_FORM_FIELDS, 'formCustomer');
  },

  /**
   * Validate customer form
   *
   */
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


  /**
   * Set up Product form
   *
   */
  products: function() {
    duckburg.forms.globalLoader(
        duckburg.config.PRODUCT_FORM_FIELDS, 'formProducts');
  },

  /**
   * Validate Product form.
   *
   */
  validateProductForm: function() {

      // Most fields in product form are required, so lets validate generously.
      var incompleteFields = false;
      for (var i = 0; i < duckburg.currentFormFields.length; i++) {
        var field = duckburg.currentFormFields[i];
        var fieldVal = $('#' + field).val();
        if (fieldVal == '' && field != 'description') {
          incompleteFields = true;
        }
      }

      if (incompleteFields) {
        var msg = 'All fields (except description) are required';
        duckburg.errorMessage(msg);
        return false;
      }

      duckburg.requests.products.create();
  },


  /**
   * Setup Supplier form.
   *
   */
  suppliers: function() {
    duckburg.forms.globalLoader(
        duckburg.config.SUPPLIER_FORM_FIELDS, 'formSuppliers');
  },


  /**
   * Validate Supplier form.
   *
   */
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


  /**
   * Setup Color form.
   *
   */
  colors: function() {
    duckburg.forms.globalLoader(
        duckburg.config.COLOR_FORM_FIELDS, 'formColors');
  },


  /**
   * Validate Color form.
   *
   */
  validateColorForm: function() {
      // Validate required fields.

      var color = $('#color_name').val();
      var hex = $('#hex_code').val();

      // Both values required
      if (color == '' || hex == '') {
        var msg = 'Required fields: color & hex';
        duckburg.errorMessage(msg);
        return false;
      }

      // Add pound to front of color if user hasn't.
      if (hex[0] != '#') {
        hex = '#' + hex;
      }

      // Hex should be six characters.
      if (hex.length != 7) {
        var msg = 'hex should be 6 characters, preceded by a pound (#) sign';
        duckburg.errorMessage(msg);
        return false;
      }

      // Force uppercase for hex.
      hex = hex.toUpperCase();

      duckburg.requests.colors.create();
  },


  /**
   * Setup Design form.
   *
   */
  designs: function() {

    // Specific to designs.  Clear out any image holders.
    $('.designImageHolder').html('');
    $('.existingImages').html('');
    duckburg.forms.common.appendNewImagePicker();

    // Add listeners to all file pickers.
    $('.designImagePicker').change(function(e) {
      duckburg.forms.common.imagePickerListener(e);
    });

    duckburg.forms.globalLoader(
          duckburg.config.DESIGN_FORM_FIELDS, 'formDesigns');

    if (duckburg.parseEditingObject) {
      duckburg.forms.common.displayExistingDesignImages();
    }
  },


  /**
   * Validate Design form.
   *
   */
  validateDesignForm: function() {

      // Validate required fields.
      var designName = $('#design_name').val();

      // If images is being saved, don't try to save design.
      if (duckburg.currentlySavingImage) {
        var msg = 'Still saving an image.  Hang on one sec.';
        duckburg.errorMessage(msg);
        return false;
      }

      // Design name required.
      if (designName == '') {
        var msg = 'Design name is required.';
        duckburg.errorMessage(msg);
        return false;
      }

      // Save the url of all new images.
      var urlString = '';
      var delim = '';
      $('.designImageUrl').each(function(item) {
        if (this && this.value && this.value != '') {
          urlString += delim + this.value;
          delim = ',';
        }
      });

      // Add exsting images to the string.
      if (duckburg.existingEditingDesignImages) {
        var array = duckburg.existingEditingDesignImages;
        var existingUrls = array.join();
        if (urlString != '') {
          urlString += ',';
        }
        urlString += existingUrls;
        duckburg.existingEditingDesignImages = false;
      }

      $('#design_images_list').val(urlString);
      duckburg.requests.designs.create();
  },

  /**
   * Set up Product form
   *
   */
  catalog_item: function() {
    duckburg.forms.globalLoader(
        duckburg.config.CATALOG_ITEM_FORM_FIELDS, 'formCatalogItem');
  },

  validateCatalogItem: function() {
      // Validate required fields.
      // ..........
      var name = $('#item_name').val();
      var product = $('#item_product_name').val();
      var price = $('#product_price').val();
      var sizes = $('#product_sizes').val();
      var colors = $('#product_colors').val();

      if (name == '' || product == '' || price == '' ||
          sizes == '' || colors == '') {
        var msg = 'Required fields are name, product, price, size & colors.';
        duckburg.errorMessage(msg);
        return false;
      }

      duckburg.requests.catalog_item.create();
  },

  /**
   * Set up Licensing type form.
   *
   */
  licensing_type: function() {
    duckburg.forms.globalLoader(
        duckburg.config.LICENSING_TYPE_FORM_FIELDS, 'formLicensingType');
  },

  validateLicensingTypeItem: function() {
      // Validate required fields.
      var name = $('#licensing_type').val();

      if (name == '') {
        var msg = 'Must fill out licensing type.';
        duckburg.errorMessage(msg);
        return false;
      }

      duckburg.requests.licensing_type.create();
  },

  /**
   * Set up Shipping methods form.
   *
   */
  shipping_methods: function() {
    duckburg.forms.globalLoader(
        duckburg.config.SHIPPING_METHODS_FORM_FIELDS, 'formShippingMethods');
  },

  validateShippingMethods: function() {

      // Validate required fields.
      var name = $('#shipping_method').val();

      if (name == '') {
        var msg = 'Must have a name.';
        duckburg.errorMessage(msg);
        return false;
      }

      duckburg.requests.shipping_methods.create();
  },

  /**
   * Set up job statuses.
   *
   */
  job_status: function() {
    duckburg.forms.globalLoader(
        duckburg.config.JOB_STATUS_FORM_FIELDS, 'formJobStatus');
  },

  validateJobStatus: function() {

      // Validate required fields.
      var name = $('#job_status_name').val();

      if (name == '') {
        var msg = 'Must have a name.';
        duckburg.errorMessage(msg);
        return false;
      }

      duckburg.requests.job_status.create();
  },

  /**
   * Set up job statuses.
   *
   */
  job_positions: function() {
    duckburg.forms.globalLoader(
        duckburg.config.JOB_POSITIONS_FORM_FIELDS, 'formJobPositions');
  },

  validateJobPositions: function() {

      // Validate required fields.
      var name = $('#position_name').val();
      var date = $('#end_search_date').val();
      var desc = $('#position_description').val();

      if (name == '' && date == '' || desc == '') {
        var msg = 'All fields are required.';
        duckburg.errorMessage(msg);
        return false;
      }

      duckburg.requests.job_positions.create();
  },

  /*
   * Templates for easy copying
   *
   */
  template: function() {
    // duckburg.forms.globalLoader(
    //     duckburg.config.PRODUCT_FORM_FIELDS, 'formProducts');
  },

  templateValidate: function() {
      // Validate required fields.
      // ..........

      // var field = $('#FIELD_NAME').val();

      // if (SOME_CONDITION) {
      //   var msg = 'Explain why its wrong';
      //   duckburg.errorMessage(msg);
      //   return false;
      // }
      //
      // duckburg.requests.CURRENT_NODE.create();
  },
};
