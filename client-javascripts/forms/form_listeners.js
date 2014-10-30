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
  var targetType = 'DuckburgSupplier';

  // Calss of input where value where end up.
  var targetClass = '.formListenerSupplier';

  // Create a box with the available options.
  duckburg.forms.common.createPopupForInput(e, targetType, targetClass);
});
