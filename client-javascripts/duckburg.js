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

    // Reveal menu & wrapper.
    $('.menu').show();
    $('.wrapper').show();

    // Create a logout link.
    $('.current_user').click(function(){
      duckburg.requests.users.logout();
    });

    // Load whatever the first action is.
    duckburg.loadFirst();

  } else {

    // Hide menu and wrapper
    $('.menu').remove();
    $('.wrapper').remove();

    // Show login form, and add listener to login button.
    $('.loginForm').show();
    $('.loginButton').click(duckburg.login);

    // Add listener to the enter button - this is not a real form, so be
    // sure to submit it when user clicks enter.
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
  }, 3500);
}

/*
 * Show a success message to the user.
 */
duckburg.successMessage = function(message) {

  // Reveal error bar and insert message.
  $('.successMessage').attr('class', 'successMessage visible');
  $('#successMessageContent').html(message);

  // Hide and clear error bar after two seconds.
  setTimeout(function() {
    $('.successMessage').attr('class', 'successMessage hidden');
    $('#successMessageContent').html('');
  }, 3500);
}

duckburg.loadFirst = function() {
  // oh what to do....
};
