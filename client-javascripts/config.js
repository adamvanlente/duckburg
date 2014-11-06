// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.config = {

  // Form fields for all objects.
  'ORDER_FORM_FIELDS'               :  ['first_name', 'last_name', 'email_address',
                                        'phone_number', 'company', 'address_one',
                                        'address_two', 'address_city', 'address_state',
                                        'address_zip', 'customer_notes'],

  'CUSTOMER_FORM_FIELDS'            :  ['first_name', 'last_name', 'email_address',
                                        'phone_number', 'company', 'address_one',
                                        'address_two', 'address_city', 'address_state',
                                        'address_zip', 'customer_notes'],

  'PRODUCT_FORM_FIELDS'             :  ['product_name', 'colors', 'sizes',
                                        'description', 'rd_item_id', 'supplier_item_id',
                                        'supplier_id', 'supplier_price'],

  'SUPPLIER_FORM_FIELDS'            :  ['supplier_name', 'website', 'contact_person',
                                        'contact_number', 'contact_email',
                                        'supplier_account_number'],

  'COLOR_FORM_FIELDS'               :  ['color_name', 'hex_code'],

  'DESIGN_FORM_FIELDS'              :  ['design_name', 'design_images_list',
                                        'design_notes', 'design_color_count'],

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

  }

};
