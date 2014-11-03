// Global duckburg namespace.
var duckburg = duckburg || {};

/*
 * Initial loading function.
 * Loads current user or serves up a login screen.
 */
duckburg.load = function() {

  // Look for current user.
  duckburg.curUser = Parse.User.current();

  // Determine if there is a user or not.
  if (duckburg.curUser) {

      // Set username in the UI.
      var userName = duckburg.curUser.attributes.username;
      var userContent = userName + '<i class="fa fa-sign-out"></i>';
      $('#current_user').html(userContent);

      // Hide admin menu items from non-admins.  Now worries if they're
      // motivated and uncover these items in browser - pages will still be
      // unavailable to them.
      if (duckburg.curUser.attributes.role != 'admin') {
        $('.admin-menu-item').hide();
      }

      // Reveal menu
      $('.menu').show();

      $('.wrapper').show();

      // Create a logout link.
      $('.current_user').click(function(){
        duckburg.requests.users.logout();
      });

      // Add a listener that helps close all forms
      $('.closeFormButton').click(function() {
        duckburg.forms.common.closeCurrentForm();
      });

      // Add a listener that helps close all forms
      $('.saveFormButton').click(function(item) {
        duckburg.forms.common.saveCurrentForm();
      });

      // Load initial view.
      duckburg.views.common.loadFirst();

  } else {

    // Hide menu, show login form, and add listener to login button.
    $('.menu').remove();
    $('.mobile-menu-button').remove();
    $('.loginForm').show();
    $('.loginButton').click(duckburg.login);

    // Add listener to the enter button - this is not a real form.
    $(document).keypress(function(e) {
        if (e.which == 13) {
            duckburg.login();
        }
    });
  }
}

/*
 * Let the current user log in.
 */
duckburg.login = function() {
  var user = $('#login-name').val();
  var pass = $('#login-pass').val();

  if (user == '' || pass == '') {
    var msg = 'User/pass may not be empty';
    duckburg.errorMessage(msg);
  } else {
    duckburg.requests.users.login(user, pass,
      function(user) {
        location.reload();
      },
      function(user, error) {
        var msg = 'Incorrect user/pass.';
        duckburg.errorMessage(msg);
      });
  }
}

/*
 * Toggle the mobile-scaled menu in & out of view.
 */
duckburg.toggleMobileMenu = function(forceHide) {

  // Menu and menu toggle button.
  var menu = $('#menu');
  var menuButton = $('#mobile-menu-button');

  // Hide/show menu.
  if (menu.attr('class').search('hidden') == -1 || forceHide) {
    menuButton.html('menu');
    menu.attr('class', 'menu hidden');
  } else {
    menuButton.html('hide');
    menu.attr('class', 'menu visible');
  }
}

/*
 * Show an error message to the user.
 */
duckburg.errorMessage = function(errorMessage) {

  // Reveal error bar and insert message.
  $('.errorMessage').attr('class', 'errorMessage visible');
  $('#errorMessageContent').html(errorMessage);

  // Hide and clear error bar after two seconds.
  setTimeout(function() {
    $('.errorMessage').attr('class', 'errorMessage hidden');
    $('#errorMessageContent').html('');
  }, 2000);
}

duckburg.successMessage = function(message) {

  // Reveal error bar and insert message.
  $('.successMessage').attr('class', 'successMessage visible');
  $('#successMessageContent').html(message);

  // Hide and clear error bar after two seconds.
  setTimeout(function() {
    $('.successMessage').attr('class', 'successMessage hidden');
    $('#successMessageContent').html('');
  }, 2000);
}
