// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.config = {

  // Form fields for all objects.
  'ORDER_FORM_FIELDS'               :  ['first_name', 'last_name', 'email_address',
                                        'phone_number', 'company', 'address_one',
                                        'address_two', 'address_city', 'address_state',
                                        'address_zip', 'customer_notes'],

  'COLOR_FORM_FIELDS'               :  ['color_name', 'hex_code'],

  'CATALOG_ITEM_FORM_FIELDS'        :  ['item_name', 'product_sizes',
                                        'product_colors', 'product_design_id',
                                        'product_category', 'product_family',
                                        'product_tags', 'product_ishidden',
                                        'product_isindexed','product_price',
                                        'product_saleprice', 'product_desc',
                                        'item_product_name', 'product_socialprice',
                                        'item_expiration_date'],

  'LICENSING_TYPE_FORM_FIELDS'      :  ['licensing_type', 'contact_name',
                                        'contact_number', 'contact_email'],

  'SHIPPING_METHODS_FORM_FIELDS'    :  ['shipping_method'],

  'JOB_STATUS_FORM_FIELDS'          :  ['job_status_name'],

  'JOB_POSITIONS_FORM_FIELDS'       :  ['position_name', 'end_search_date',
                                        'position_description'],

  'JOB_TYPE_FORM_FIELDS'            :  ['job_type_name'],

  // Objects that will be visible to all users.  They can create/edit.
  'VISIBLE_OBJECTS'           :    {
      'customers'             :    'Customers',
      'products'              :    'Products',
      'suppliers'             :    'Suppliers',
      'designs'               :    'Designs',
      'colors'                :    'Colors',
      'catalog_item'          :    'Catalog item',
      'licensing_type'        :    'Licensing type',
      'shipping_methods'      :    'Shipping methods',
      'job_status'            :    'Job status',
      'job_positions'         :    'Job positions',
      'job_type'              :    'Job type'

  },

  // Do not index these field values for searching in parse.
  invalidSearchableFields     :    ['product_price', 'product_sizes',
                                    'product_colors', 'color_count',
                                    'customer_is_salesperson'],

  // These are inputs which are checkboxes.
  checkboxInputList           :    ['customer_is_salesperson']

};
