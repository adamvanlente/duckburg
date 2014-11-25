// Global duckburg namespace.
var duckburg = duckburg || {};

duckburg.users = {

  /**
   * Load this view
   * @function kicks off all things needed for user view.
   *
   */
  loadUserView: function() {

    // Load the list of users to the ui.
    duckburg.users.loadUserList();

  },

  /**
   * Load the list of users.
   * @function fetches list of users from Parse.
   *
   */
   loadUserList: function() {
     var query = new Parse.Query(Parse.User);
     query.find({
       success: function(users) {
         duckburg.users.loadUsersToList(users);
       },
       error: function(users, erro) {
         duckburg.utils.errorMessage(error.message);
       }
     });
   },

   /**
    * Load users into list.
    * @function loads users into the list of users.
    * @param users array of users from Parse.
    */
   loadUsersToList: function(users) {

     // Clear out list.
     $('.userList').html('');

     // Create an 'add new user' button.
     $('.userList')
       .append($('<span>')
         .attr('class', 'newUserButton')
         .html('add new user')
         .click(function() {
           duckburg.users.newUserPopup();
         }));

     // Iterate over all the users and append to the list.
     for (var i = 0; i < users.length; i++) {
       duckburg.users.loadSingleUserToList(users[i]);
     }
   },

   /**
    * Load a single user into the user list.
    * @param user the object containing the user from Parse.
    *
    */
   loadSingleUserToList: function(user) {

     // Get the user details.
     var u = user.attributes;
     var name = u.username
     var email = u.email
     var role = u.role || 'standard user';

     // Add a user record.
     $('.userList')
       .append($('<span>')
         .attr('class', 'userSpan')
         .append($('<label>')
           .html(name))
         .append($('<label>')
           .html(email))
         .append($('<label>')
           .html(role))
      );
   },

   /**
    * New user popup
    * @function reveals popup and fills with elements for creating new user.
    *
    */
   newUserPopup: function() {

     // Reveal the popup div.
     duckburg.utils.showPopup();

     $('#popupContent')
       .attr('class', 'newUserPopup')

       // Labe for new user form.
       .append($('<label>')
         .html('Enter new user details.'))

       // Append an input where the username can be entered.
       .append($('<input>')
         .attr('type', 'text')
         .attr('id', 'newUserUsername')
         .attr('placeholder', 'desired user name'))

       // Append an input where the email address can be entered.
       .append($('<input>')
         .attr('type', 'email')
         .attr('id', 'newUserEmailAddress')
         .attr('placeholder', 'email address'))

       // Append an input where the email address can be entered.
       .append($('<input>')
         .attr('type', 'password')
         .attr('id', 'newUserPassword')
         .attr('placeholder', 'password'))

       // Label and checkbox for user role.
       .append($('<span>')
         .html('is user admin?'))
       .append($('<input>')
         .attr('type', 'checkbox')
         .attr('id', 'newUserIsAdmin'))

       // Append a button to kick off the action.
       .append($('<button>')
         .html('add user')
         .click(function() {
           duckburg.users.addNewUser();
         }))

       // Link to cancel the action.
       .append($('<em>')
         .html('cancel')
         .click(function() {
           duckburg.utils.hidePopup();
         }));
   },

   /**
    * Make new user.
    * @function send new user request to parse.
    * @param username String desired username
    * @param email String email address
    * @param pass String password
    *
    */
   addNewUser: function(username, email, pass, role) {

     // Get params from form if they are not passed as args.
     username = username || $('#newUserUsername').val();
     email = email || $('#newUserEmailAddress').val();
     pass = pass || $('#newUserPassword').val();
     role = role || $('#newUserIsAdmin').prop('checked');

     // If role passed is not a string, it is a boolean from a checkbox.  If
     // true, user is an admin.  If not, they are standard user.
     if (typeof role != 'string') {
       role = role ? 'admin' : 'standard user';
     }

     // Setup parse params.
     var user = new Parse.User();
     user.set("username", username);
     user.set("password", pass);
     user.set("email", email);
     user.set("role", role);

     // Make the request to parse.
     user.signUp(null, {
       success: function(user) {
         var msg = 'User ' + username + ' successfully signed up.';
         duckburg.utils.successMessage(msg);
         duckburg.utils.hidePopup();
       },
       error: function(user, error) {
         var errorMsg = 'Error creating user: ' + error.message;
         duckburg.utils.errorMessage(errorMsg);
       }
     });
   }
};
