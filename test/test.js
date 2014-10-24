var mongoose = require('mongoose');
var User = require('../app/models/user');

// Connecting to a local test database or creating it on the fly
mongoose.connect('mongodb://localhost:27017/user_test');

// Start Mocha
describe('Users', function(){

    // Hold a temporary new user.
    var currentUser = null;

    // Create a new user on the fly before each run.
    beforeEach(function(done){
        User.createNew('adamvanlente@gmail.com', 'adam', function(doc){
            currentUser = doc;
            done();
        });
    });

    // Delete the User model after each run.
    afterEach(function(done){
        User.model.remove({}, function(){
            done();
        });
    });

    // =====================
    // TEST creating a user.
    // _____________________
    it('creates a new user', function(done){
        User.createNew('adamvanlente@gmail.com', 'adam', function(doc){
            doc.email.should.eql('adamvanlente@gmail.com');
            done();
        });
    });

    // =====================
    // TEST fetch a user.
    // _____________________
    it('fetches user by email', function(done){
        User.findByEmail('adamvanlente@gmail.com', function(doc){
            doc.email.should.eql('adamvanlente@gmail.com');
            done();
        });
    });


});
