"use strict";

module.exports = function(imports){

	let mongoose = imports.modules.mongoose;

	let Schema = mongoose.Schema;
	let ObjectId = Schema.Types.ObjectId;

	let taskSchema = new Schema({
		name:        { type: String, required: true },
		description: { type: String, required: false },
		team:        { type: ObjectId, ref: "Team", required: true },
		for:         { type: ObjectId, ref: "User" },
		due_date:    { type: Date, required: true },
		creator:     { type: ObjectId, ref: "User" },
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
