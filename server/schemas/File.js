var mongoose = require('mongoose');
Schema = mongoose.Schema;

var fileSchema = new Schema({
  name:         { type: String, required: true },
  originalName: { type: String, required: false },
  folder: { type: Schema.Types.ObjectId, ref: 'Folder', required: false },
  size: Number,
  type: String,
  creator: { type: Schema.Types.ObjectId, ref: 'User' },
  created_at: Date,
  updated_at: Date,
});

fileSchema.pre('save', function(next){
  now = new Date();
  this.updated_at = now;
  if ( !this.created_at ) {
    this.created_at = now;
  }
  next();
});

var File = mongoose.model('File', fileSchema);

module.exports = File;
