// ******************************************
// Route handler for logins.
// __________________________________________

var User       		   = require('../models/user');
var ForgottenPass    = require('../models/forgotten_pass');
var nodemailer			 = require('nodemailer');


module.exports = function(app, passport) {

	// ====================================
  // ====================================
  // APP LOGIN ==========================
  // ====================================
  // ====================================
	app.get('/login', function(req, res) {
			var msg = {
				mode: 'login',
			};

			res.render('login.jade', { msg: msg });
	});

	app.post('/login', passport.authenticate('local-login', {
			successRedirect : '/',
			failureRedirect : '/login/incorrect'
	}));

	app.get('/login/incorrect', function(req, res) {
			var msg = {
				mode: 'login',
				msg: 'incorrect user/pass combination.  try again.'
			};

			res.render('login.jade', { msg: msg });
	});

  // ====================================
  // ====================================
  // SIGNUP =============================
  // ====================================
  // ====================================
	app.get('/signup', function(req, res) {
			var msg = {
				mode: 'signup',
			};

			res.render('login.jade', { msg: msg });
	});

  app.post('/signup', passport.authenticate('local-signup', {
      successRedirect : '/',
      failureRedirect : '/signup/existing'
  }));

	app.get('/signup/existing', function(req, res) {
			var msg = {
				mode: 'signup',
				msg: 'that email is in our system. login, or sign up with a different address.'
			};

			res.render('login.jade', { msg: msg });
	});


 // ====================================
 // ====================================
 // FACEBOOK ===========================
 // ====================================
 // ====================================
	app.get('/auth/facebook', passport.authenticate('facebook', {
			scope : 'email'
	}));

	app.get('/auth/facebook/callback', passport.authenticate('facebook', {
			successRedirect : '/',
			failureRedirect : '/'
		}));


  // ====================================
  // ====================================
  // GOOGLE =============================
  // ====================================
  // ====================================
	app.get('/auth/google', passport.authenticate('google', {
			scope : ['profile', 'email']
	}));

	app.get('/auth/google/callback', passport.authenticate('google', {
					successRedirect : '/',
					failureRedirect : '/'
			}));


  // ====================================
  // ====================================
  // GITHUB =============================
  // ====================================
  // ====================================
	app.get('/auth/github', passport.authenticate('github'));

	app.get('/auth/github/callback', passport.authenticate('github', {
			successRedirect : '/',
			failureRedirect : '/'
	}));

	// ====================================
	// ====================================
	// FORGOTTEN PASSWORD =================
	// ====================================
	// ====================================
	app.get('/forgotten_pass', function(req, res) {
			// TODO - need to include a message if user's email does not exist in db.
			// else if will contain a success message in which case remove input item
			res.render('forgotten.jade');
	});

	app.get('/auth/forgot_pass', function(req, res) {

			// TODO get this dom element.
			var user = configAuth.emailField;

			User.findByEmail(email, function(user) {

					if (user) {
							var msg = 'No user with this email address exists.';
							// TODO display this message

					} else {

							// TODO create a UUID
							var UUID = '123456';

							var forgottenPass		      = {};
							forgottenPass.email				= user;
							forgottenPass.tempCode		= UUID;

							ForgottenPass.createNew(forgottenPass, function(doc) {

									if (!doc) {
											var error = 'An unknown error ocurred.  Please try again.';
											// TODO deliver error as above.
									} else {
											var success = 'Please check your email for' +
													' instructions on how to reset your password.'
											// TODO deliver success message

											// Create a transporter object with Nodemailer.
											// TODO add gmail user/pass to config file
											var transporter = nodemailer.createTransport({
											    service: 'Gmail',
											    auth: {
											        user: configAuth.email.user,
											        pass: configAuth.email.pass
											    }
											});

											var emailMsg = 'msg';

											// TODO add a link which will be reset_pass/UUID

											// Email business.
									    var mailOptions = {
									        from: 'NAME <email@gmail.com>',
									        to: user,
									        subject: 'Reset your password',
									        html: emailMsg
									    };

									    // Use the transporter created above to send the mail.
									    transporter.sendMail(mailOptions, function(error, info){
									        if (error) {
									            console.log(error);
									        } else {
									            console.log('Message sent: ' + info.response);
									        }
									    });

									}

							});
					 }
			});
	});


  // ====================================
  // ====================================
  // LOGOUT =============================
  // ====================================
  // ====================================
	app.get('/logout', function(req, res) {
			req.logout();
			res.redirect('/');
	});

};

// Confirm that a user is logged in.
function isLoggedIn(req, res, next) {

  	// Move along if all is well.
  	if (req.isAuthenticated())
  		return next();

  	// Kick back to home page if no user is detected.
  	res.redirect('/');
}
