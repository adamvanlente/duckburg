/*
 * Some form fields have special behavior.  Below
 * are some listeners for specific form fields.
 *
 */


/*
 * These particular listeners are for a special type of input.  An  example
 * is that when creating an order-item, you must select a product and design.
 * these inputs - instead of being text based, reveal a list of available
 * designs, products, or whatever object is being searched for.
 *
 */

// For Supplier field in Product form.
$('.formListenerSupplier').click(function(e) {

  // Type of object for parse.
  var type = 'DuckburgSupplier';

  // Calss of input where value where end up.
  var className = '.formListenerSupplier';

  // Name of Parse object to drop into field.
  var obj = 'supplier_name';

  // Form to launch if a new item is created.
  var form = 'suppliers';

  // Create a box with the available options.
  duckburg.forms.inputs.createPopupForInput(e, type, className, obj, form);
});


// For Supplier field in Product form.
$('.formCatalogItemProductListener').click(function(e) {

  // Type of object for parse.
  var type = 'DuckburgProduct';

  // Calss of input where value where end up.
  var className = '.formCatalogItemProductListener';

  // Name of Parse object to drop into field.
  var obj = 'product_name';

  // Form to launch if a new item is created.
  var form = 'products';

  // Create a box with the available options.
  duckburg.forms.inputs.createPopupForInput(e, type, className, obj, form, true);
});

// For Supplier field in Product form.
$('.formCatalogItemDesignListener').click(function(e) {

  // Type of object for parse.
  var type = 'DuckburgDesign';

  // Calss of input where value where end up.
  var className = '.formCatalogItemDesignListener';

  // Name of Parse object to drop into field.
  var obj = 'design_name';

  // Form to launch if a new item is created.
  var form = 'designs';

  // Create a box with the available options.
  duckburg.forms.inputs.createPopupForInput(e, type, className, obj, form);
});



// Highsmith Calendars for forms.
var calConfig = {
  style: {
    disable: true
  }
};

// Expiration date on a catalog item.
duckburg.catExpDateCal = new Highsmith('item_expiration_date', calConfig);

// Due date on an order.
duckburg.newOrderDueDate = new Highsmith('order_due_date', calConfig);

// Date that a job posting should come down.
duckburg.jobPosEndDate = new Highsmith('end_search_date', calConfig);
