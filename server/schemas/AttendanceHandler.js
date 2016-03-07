var mongoose = require('mongoose');
Schema = mongoose.Schema;

var attendanceHandlerSchema = new Schema({
  event:  { type: Schema.Types.ObjectId, ref: 'Event' }, //TODO: Can i use the word event?
  event_date: Date,
  attendees: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    status: String
  }],
  entireTeam: Boolean,
  created_at:  Date,
  updated_at:  Date,
});

attendanceHandlerSchema.pre('save', function(next){
  now = new Date();
  this.updated_at = now;
  if ( !this.created_at ) {
    this.created_at = now;
  }
  next();
});

module.exports = function(db) {
	var attendanceHandler = db.model('attendanceHandler', attendanceHandlerSchema);
	return attendanceHandler;
};
