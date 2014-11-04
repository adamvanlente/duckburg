// Global duckburg namespace.
var duckburg = duckburg || {};

// Object lister
$('.menu-object-lister').click(function() {
  duckburg.views.customers.load();
  duckburg.toggleMobileMenu(true);
});
