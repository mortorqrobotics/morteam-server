var mongoose = require('mongoose');
Schema = mongoose.Schema;

var sessionSchema = new Schema({
  user_id:  Number,
  token:    String,
  isActive: Boolean
});

var Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
