"use strict"; 

module.exports = function(mongoose) {

let Schema = mongoose.Schema;

let attendanceHandlerSchema = new Schema({
  event:  { type: Schema.Types.ObjectId, ref: "Event" },
  event_date: Date,
  attendees: [{
    user: { type: Schema.Types.ObjectId, ref: "User" },
    status: String
  }],
  entireTeam: Boolean,
  created_at:  Date,
  updated_at:  Date,
});

attendanceHandlerSchema.pre("save", function(next) {
  let now = new Date();
  this.updated_at = now;
  if (!this.created_at) {
    this.created_at = now;
  }
  next();
});

let attendanceHandler = mongoose.model("attendanceHandler", attendanceHandlerSchema);
return attendanceHandler;

};
