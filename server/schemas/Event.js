var mongoose = require('mongoose');
Schema = mongoose.Schema;

var eventSchema = new Schema({
  name:        { type: String, required: true },
  description: { type: String, required: false },
  team:        { type: String, required: true },
  userAttendees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  subdivisionAttendees: [{ type: Schema.Types.ObjectId, ref: 'Subdivision' }],
  date: { type: Date, required: true },
  creator: { type: Schema.Types.ObjectId, ref: 'User' },
  created_at:  Date,
  updated_at:  Date,
});

eventSchema.pre('save', function(next){
  now = new Date();
  this.updated_at = now;
  if ( !this.created_at ) {
    this.created_at = now;
  }
  next();
});

var Event = mongoose.model('Event', eventSchema);

module.exports = Event;
