// DuckBurg namespace.
var duckburg = duckburg || {};

// Models for DuckBurg data/database/parse
duckburg.models = {

  // Customer model
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

  dbProto: {
    display_name: 'Display name',
    values: [
      {
        field: 'field_name',
        placeholder: 'prettyname',
        input: 'text',
        options: null,
        dbObject: null,
        required: false
      },
    ]
  },
}
