var mongoose = require('mongoose');
Schema = mongoose.Schema;

var announcementSchema = new Schema({
  author:      { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  content:     { type: String, required: true },
  team:        { type: String, required: true },
  userAudience: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  subdivisionAudience: [{ type: Schema.Types.ObjectId, ref: 'Subdivision' }],
  timestamp:   { type: Date, required: true },
  entireTeam: Boolean,
  created_at:  Date,
  updated_at:  Date
});

announcementSchema.pre('save', function(next){
  now = new Date();
  this.updated_at = now;
  if ( !this.created_at ) {
    this.created_at = now;
  }
  next();
});

module.exports = function(db) {
	var Announcement = db.model('Announcement', announcementSchema);
	return Announcement;
};
