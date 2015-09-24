var mongoose = require('mongoose');
var bcrypt = require('bcrypt'),
Schema = mongoose.Schema;
SALT_WORK_FACTOR = 10;

var userSchema = new Schema({
  id:           { type: Number, required: true, unique: true },
  username:     { type: String, required: true, unique: true },
  password:     { type: String, required: true },
  firstname:    { type: String, required: true },
  lastname:     { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  phone:        { type: Number, required: true, unique: true },
  created_at:   Date,
  updated_at:   Date,
  profpicpath:  String,
  teams:        Array,
  subdivisions: Array
});

userSchema.pre('save', function(next){
  now = new Date();
  this.updated_at = now;
  if ( !this.created_at ) {
    this.created_at = now;
  }
  next();
});
userSchema.pre('save', function(next) {
  var user = this;

  if (!user.isModified('password')) return next();

  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
      if (err) return next(err);

      bcrypt.hash(user.password, salt, function(err, hash) {
          if (err) return next(err);

          user.password = hash;
          next();
      });
  });
});
userSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

var User = mongoose.model('User', userSchema);

module.exports = User;
