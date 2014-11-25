// Global duckburg namespace.
var duckburg = duckburg || {};

/**
 * Menu handler
 * @module handles menu behavior for all of duckburg.
 *
 */
duckburg.menu = {

  /**
   * Load the menu.
   * @function Menu is already loaded, but this function ensures that it
   *           reveals only items available to the current user's role.
   */
  load: function() {
    var userRole = duckburg.curUser.attributes.role;

    // If user is not admin, remove all admin menu functions.
    if (userRole != 'admin') {
      $('.adminOnlyMenuItem').each(function() {
        $(this).remove();
      });
    }
  },

  /**
   * Toggle menu, for mobile only.
   * @function toggles mobile menu on/off
   *
   */
  toggleForMobile: function() {

    // Toggle the mobile menu on/off
    var className = $('.menu').attr('class');
    if (className.search('invisible') == -1) {
      $('.menu')
        .attr('class', 'menu invisible');
      $('.mobileMenuToggler')
        .html('menu');
    } else {
      $('.menu')
        .attr('class', 'menu visible');
      $('.mobileMenuToggler')
        .html('hide');
    }
  }


};
