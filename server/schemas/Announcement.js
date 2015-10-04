var mongoose = require('mongoose');
Schema = mongoose.Schema;

var announcementSchema = new Schema({
  id:          { type: String, required: true, unique: true },
  author:      { type: String, required: true },
  author_fn:   { type: String, required: true },
  author_ln:   { type: String, required: true },
  content:     { type: String, required: true },
  team:        { type: String, required: true },
  userAudience: [String],
  subdivisionAudience: [String],
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

var Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
