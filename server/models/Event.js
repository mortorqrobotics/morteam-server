"use strict"; 

module.exports = function(mongoose) {

let Schema = mongoose.Schema;

let eventSchema = new Schema({
	name:        { type: String, required: true },
	description: { type: String, required: false },
	team:        { type: String, required: true },
	userAttendees: [{ type: Schema.Types.ObjectId, ref: "User" }],
	subdivisionAttendees: [{ type: Schema.Types.ObjectId, ref: "Subdivision" }],
	entireTeam: Boolean,
	hasAttendance: Boolean,
	date: { type: Date, required: true },
	creator: { type: Schema.Types.ObjectId, ref: "User" },
	created_at:  Date,
	updated_at:  Date,
});

eventSchema.pre("save", function(next) {
	let now = new Date();
	this.updated_at = now;
	if (!this.created_at) {
		this.created_at = now;
	}
	next();
});

let Event = mongoose.model("Event", eventSchema);
return Event;

};
