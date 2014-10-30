// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.config = {

  'CUSTOMER_FORM_FIELDS' :    ['first_name', 'last_name', 'email_address',
                               'phone_number', 'company', 'address_one',
                               'address_two', 'address_city', 'address_state',
                               'address_zip', 'customer_notes'],

  'PRODUCT_FORM_FIELDS'  :    ['product_name', 'colors', 'sizes',
                               'description', 'rd_item_id', 'supplier_item_id',
                               'supplier_id', 'supplier_price'],

  'SUPPLIER_FORM_FIELDS' :    ['supplier_name', 'website', 'contact_person',
                               'contact_number', 'contact_email'],

  'COLOR_FORM_FIELDS'    :    ['color_name', 'hex_code'],

  'DESIGN_FORM_FIELDS'   :    ['design_name', 'design_images_list',
                               'design_notes'],

};
