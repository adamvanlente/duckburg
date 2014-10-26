var dburg = dburg || {};

/*
**
  One click listener and one click function
  for each menu item.  Eg a listener for when 'User'
  menu item is clicked, along with a method to display
  the users when that action fires.
*/

// -----------------------------------
// USERS -----------------------------
// -----------------------------------

dburg.showUserList = function(users) {

  for (var i = 0; i < users.length; i++) {

    var userListHolder = $('<div></div>')
      .attr('class', 'userListHolder');

    var user = users[i].local;
    var nameSpan = $('<span></span>').html(user.name);
    var emailSpan = $('<span></span>').html(user.email);
    var typeSpan = $('<span></span>').html(user.userType);

    userListHolder.append(nameSpan);
    userListHolder.append(emailSpan);
    userListHolder.append(typeSpan);

    $('.wrapper').append(userListHolder);
  }
};

$('.homeShowUsers').click(function() {

    var url = '/json/users';
    dburg.ajax(url,
        function(data) {
          if (data.success) {
            dburg.showUserList(data.results);
          } else {
            console.log(err);
          }
        },
        function(err) {
          console.log(err);
        })
});
