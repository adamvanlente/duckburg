// DuckBurg namespace.
var duckburg = duckburg || {};

// Models for DuckBurg data/database/parse
duckburg.models = {

  /**
   * CUSTOMER MODEL
   *
   */
  dbCustomer: {
    display_name: 'Customer',
    values: {
      'first_name': {
        placeholder: 'first name',
        input: 'text',
        input_size: 'half',
        options: null,
        dbObject: null,
        required: true
      },
      'last_name': {
        placeholder: 'last name',
        input: 'text',
        input_size: 'half',
        options: null,
        dbObject: null
      },
      'email_address' :{
        placeholder: 'email address',
        input: 'email',
        input_size: 'half',
        options: null,
        dbObject: null
      },
      'phone_number': {
        placeholder: 'phone number',
        input: 'tel',
        input_size: 'half',
        options: null,
        dbObject: null
      },
      'company': {
        placeholder: 'organization',
        input: 'text',
        input_size: 'third',
        options: null,
        dbObject: null
      },
      'address_one': {
        placeholder: 'address street',
        input: 'text',
        input_size: 'third',
        options: null,
        dbObject: null
      },
      'address_two': {
        placeholder: 'address street (cont\'d)',
        input: 'text',
        input_size: 'third',
        options: null,
        dbObject: null
      },
      'address_city': {
        placeholder: 'city',
        input: 'text',
        input_size: 'third',
        options: null,
        dbObject: null
      },
      'address_state': {
        placeholder: 'state',
        input: 'text',
        input_size: 'third',
        options: null,
        dbObject: null
      },
      'address_zip': {
        placeholder: 'ZIP code',
        input: 'text',
        input_size: 'third',
        options: null,
        dbObject: null
      },
      'notes': {
        placeholder: 'additional notes',
        input: 'textarea',
        input_size: 'full',
        options: null,
        dbObject: null
      },
      'customer_is_salesperson': {
        placeholder: 'Is salesperson?',
        input: 'checkbox',
        options: null,
        default: 'no',
        dbObject: null
      },
    }
  },

  /**
   * PRODUCT MODEL
   *
   */
  dbProduct: {
    display_name: 'Product',
    values: {
      'product_name': {
        placeholder: 'product name',
        input: 'text',
        input_size: 'full',
        options: null,
        dbObject: null,
        required: true
      },
      'colors': {
        placeholder: 'available colors (eg black,white,red)',
        input: 'text',
        input_size: 'half',
        options: null,
        dbObject: null,
      },
      'sizes': {
        placeholder: 'available sizes (eg S,M,L)',
        input: 'text',
        input_size: 'half',
        options: null,
        dbObject: null,
      },
      'description': {
        placeholder: 'Notes about the item',
        input: 'textarea',
        input_size: 'full',
        options: null,
        dbObject: null,
      },
      'supplier': {
        placeholder: 'Company/Supplier',
        input: 'text',
        input_size: 'third',
        options: null,
        dbObject: {
            type: 'dbSupplier',
            primary_key: 'supplier_name'
        }
      },
      'supplier_item_id': {
        placeholder: 'Supplier item id, eg GD110',
        input: 'text',
        input_size: 'third',
        options: null,
        dbObject: null,
      },
      'supplier_price': {
        placeholder: 'Price we pay',
        input: 'text',
        input_size: 'third',
        options: null,
        dbObject: null,
      }
    }
  },

  /**
   * SUPPLIER MODEL
   *
   */
  dbSupplier: {
    display_name: 'Supplier',
    values: {
      'supplier_name': {
        placeholder: 'Supplier name',
        input: 'text',
        input_size: 'half',
        options: null,
        dbObject: null,
        required: true
      },
      'supplier_website': {
        placeholder: 'site url, eg http://onestopinc.com',
        input: 'text',
        input_size: 'half',
        options: null,
        dbObject: null,
        required: false
      },
      'contact_person': {
        placeholder: 'Contact person',
        input: 'text',
        input_size: 'half',
        options: null,
        dbObject: null,
        required: false
      },
      'contact_number': {
        placeholder: 'Contact number',
        input: 'text',
        input_size: 'half',
        options: null,
        dbObject: null,
        required: false
      },
      'contact_email': {
        placeholder: 'Contact email',
        input: 'text',
        input_size: 'half',
        options: null,
        dbObject: null,
        required: false
      },
      'supplier_account_number': {
        placeholder: 'Our account number',
        input: 'text',
        input_size: 'half',
        options: null,
        dbObject: null,
        required: false
      },
    }
  },

  /**
   * DESIGN MODEL
   *
   */
  dbDesign: {
    display_name: 'Design',
    values: {
      'design_name': {
        placeholder: 'Name of design',
        input: 'text',
        input_size: 'full',
        options: null,
        dbObject: null,
        required: true
      },
      'design_images_list': {
        placeholder: 'Add an image',
        input: 'image',
        input_size: 'full',
        options: null,
        dbObject: null,
        required: false
      },
      'design_notes': {
        placeholder: 'Notes about the design',
        input: 'textarea',
        input_size: 'full',
        options: null,
        dbObject: null,
        required: false
      },
      'design_color_count': {
        placeholder: 'Colors in this order F,B,L,R eg 1,2,0,0',
        input: 'text',
        input_size: 'full',
        options: null,
        dbObject: null,
        required: false
      }
    }
  }


  //
  // 'SUPPLIER_FORM_FIELDS'            :  ['supplier_name', 'website',
                                          // 'contact_person',
  //                                       'contact_number', 'contact_email',
  //                                       'supplier_account_number'],

  /**
   * SAMPLE MODEL
   *
   */
  // dbSample: {
  //   display_name: 'Customer',
  //   values: {
  //     'first_name': {
  //       placeholder: 'first name',
  //       input: 'text',
  //       input_size: 'half',
  //       options: null,
  //       dbObject: null,
  //       required: true
  //     }
  //   }
  // }


}
