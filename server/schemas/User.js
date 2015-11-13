var mongoose = require('mongoose');
var bcrypt = require('bcrypt'),
Schema = mongoose.Schema;
SALT_WORK_FACTOR = 10;

var userSchema = new Schema({
  username:     { type: String, required: true, unique: true },
  password:     { type: String, required: true },
  firstname:    { type: String, required: true },
  lastname:     { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  phone:        { type: Number, required: true, unique: true },
  created_at:   Date,
  updated_at:   Date,
  profpicpath:  String,
  teams:        Array, //Array of ids of teams of which said user is a member. IMPORTANT: id != _id (for "teams" a non-random id is used as opposed to an _id)
  subdivisions: [{
    _id: { type: Schema.Types.ObjectId, ref: 'Subdivision' },
    team: String,
    accepted: Boolean
  }],
  current_team: {
    id: String,
    position: String
  },
  bannedFromTeams: [String] //Array of ids of teams from which said user is banned
});

userSchema.pre('save', function(next){
  if (this.isModified('current_team')) return next();

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
