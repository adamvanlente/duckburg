// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.config = {

  // Form fields for all objects.
  'CUSTOMER_FORM_FIELDS'      :    ['first_name', 'last_name', 'email_address',
                                    'phone_number', 'company', 'address_one',
                                    'address_two', 'address_city', 'address_state',
                                    'address_zip', 'customer_notes'],

  'PRODUCT_FORM_FIELDS'       :    ['product_name', 'colors', 'sizes',
                                    'description', 'rd_item_id', 'supplier_item_id',
                                    'supplier_id', 'supplier_price'],

  'SUPPLIER_FORM_FIELDS'      :    ['supplier_name', 'website', 'contact_person',
                                    'contact_number', 'contact_email'],

  'COLOR_FORM_FIELDS'         :    ['color_name', 'hex_code'],

  'DESIGN_FORM_FIELDS'        :    ['design_name', 'design_images_list',
                                    'design_notes', 'design_color_count'],

  'CATALOG_ITEM_FORM_FIELDS'  :    ['item_name', 'product_sizes',
                                    'product_colors', 'product_design_id',
                                    'product_category', 'product_family',
                                    'product_tags', 'product_ishidden',
                                    'product_isindexed','product_price',
                                    'product_saleprice', 'product_desc',
                                    'item_product_name',
                                    'item_expiration_date'],

  // Objects that will be visible to all users.  They can create/edit.
  'VISIBLE_OBJECTS'           :    {
      'customers'             :    'Customers',
      'products'              :    'Products',
      'suppliers'             :    'Suppliers',
      'designs'               :    'Designs',
      'colors'                :    'Colors',
      'catalog_item'          :    'Catalog item'
  }

};