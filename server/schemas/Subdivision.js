var mongoose = require('mongoose');
Schema = mongoose.Schema;

var subdivisionSchema = new Schema({
  name:        { type: String, required: true },
  type:        { type: String, required: true },
  team:        { type: String, required: true },
  created_at:  Date,
  updated_at:  Date,
});

subdivisionSchema.pre('save', function(next){
  now = new Date();
  this.updated_at = now;
  if ( !this.created_at ) {
    this.created_at = now;
  }
  next();
});

var Subdivision = mongoose.model('Subdivision', subdivisionSchema);

module.exports = Subdivision;
