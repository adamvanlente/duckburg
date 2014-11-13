// Global duckburg namespace.
var duckburg = duckburg || {};

/*
 * Object containing all requests for duckburg.
 * This will connect with Parse's methods to help
 * create Parse data objects.
 */
duckburg.requests = {

  /*
   * Functionality for creating new users.
   *
   */
  users: {

    create: function() {

      // var user = new Parse.User();
      // user.set("username", "my name");
      // user.set("password", "my pass");
      // user.set("email", "email@example.com");
      // user.set("role", "adminorwhat?");
      //
      // user.signUp(null, {
      //   success: function(user) {
      //     // Hooray! Let them use the app now.
      //   },
      //   error: function(user, error) {
      //     // Show the error message somewhere and let the user try again.
      //     alert("Error: " + error.code + " " + error.message);
      //   }
      // });
    },

    login: function(username, pass, successCb, errorCb) {
      Parse.User.logIn(username, pass, {
        success: function(user) {

          // Set logged in user as current user.
          duckburg.curUser = Parse.User.current();
          duckburg.curUser.setACL(new Parse.ACL(user));
          successCb(user);
        },
        error: function(user, error) {
          errorCb(user, error);
        }
      });
    },

    logout: function() {
      Parse.User.logOut();
      location.reload();
    }
  },


  /*
   * Functionality for upload files
   *
   */
  files: {

    save: function(fileInput, successCb) {

      var fileUploadControl = $("#" + fileInput)[0];

      if (fileUploadControl.files.length > 0) {

        var file = fileUploadControl.files[0];

        var name = 'design_image.jpg';
        var parseFile = new Parse.File(name, file);

        parseFile.save().then(function(url) {
          var msg = 'File saved!';
          duckburg.successMessage(msg);
          duckburg.currentlySavingImage = false;
          successCb(url);
        }, function(error) {
          var msg = 'Something went wrong: ' + error.message;
          duckburg.errorMessage(msg);
          duckburg.currentlySavingImage = false;
        });
      }
    }
  }
};
