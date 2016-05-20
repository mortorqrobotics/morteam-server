"use strict";

module.exports = function(mongoose) {

let Schema = mongoose.Schema;

let taskSchema = new Schema({
	name:        { type: String, required: true },
	description: { type: String, required: false },
	team:        { type: String, required: true },
	for:         { type: Schema.Types.ObjectId, ref: "User" },
	due_date:    { type: Date, required: true },
	creator:     { type: Schema.Types.ObjectId, ref: "User" },
	completed:   Boolean,
	created_at:  Date,
	updated_at:  Date,
});

taskSchema.pre("save", function(next) {
	let now = new Date();
	this.updated_at = now;
	if (!this.created_at) {
		this.created_at = now;
	}
	next();
});

let Task = mongoose.model("Task", taskSchema);
return Task;

};
