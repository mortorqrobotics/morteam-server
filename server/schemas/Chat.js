"use strict";

module.exports = function(mongoose) {
	
let Schema = mongoose.Schema;

let chatSchema = new Schema({
  name:        { type: String, required: false },
  team:        { type: String, required: true },
  group:       Boolean,
  userMembers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  // userMembers: [{ $type: Schema.Types.DBRef, $ref: "users", $db: "MorNetwork" }],
  subdivisionMembers: [{ type: Schema.Types.ObjectId, ref: "Subdivision" }],
  messages : [{
    author: { type: Schema.Types.ObjectId, ref: "User" },
    content: String,
    timestamp: Date
  }],
  created_at:  Date,
  updated_at:  Date,
});

chatSchema.pre("save", function(next) {
  let now = new Date();
  this.updated_at = now;
  if (!this.created_at) {
    this.created_at = now;
  }
  next();
});

let Chat = mongoose.model("Chat", chatSchema);
return Chat;

};
