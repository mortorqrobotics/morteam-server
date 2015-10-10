var mongoose = require('mongoose');
Schema = mongoose.Schema;

var chatSchema = new Schema({
  name:        { type: String, required: false },
  team:        { type: String, required: true },
  group:       Boolean,
  userMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  subdivisionMembers: [{ type: Schema.Types.ObjectId, ref: 'Subdivision' }],
  messages : [{
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    content: String,
    timestamp: Date
  }],
  created_at:  Date,
  updated_at:  Date,
});

chatSchema.pre('save', function(next){
  now = new Date();
  this.updated_at = now;
  if ( !this.created_at ) {
    this.created_at = now;
  }
  next();
});

var Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
