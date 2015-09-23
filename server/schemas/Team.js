var mongoose = require('mongoose');
Schema = mongoose.Schema;

var teamSchema = new Schema({
  id:          { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  number:      { type: Number, required: true },
  created_at:  Date,
  updated_at:  Date,
});

teamSchema.pre('save', function(next){
  now = new Date();
  this.updated_at = now;
  if ( !this.created_at ) {
    this.created_at = now;
  }
  next();
});

var Team = mongoose.model('Team', teamSchema);

module.exports = Team;
