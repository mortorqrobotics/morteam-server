"use strict"; 

module.exports = function(imports) {

	let mongoose = imports.modules.mongoose;

	let Schema = mongoose.Schema;

	let folderSchema = new Schema({
		name:        { type: String, required: true },
		team:        { type: String, required: true },
		defaultFolder: Boolean,
		entireTeam:  { type: Boolean, required: false },
		userMembers: [{ type: Schema.Types.ObjectId, ref: "User" }],
		subdivisionMembers: [{ type: Schema.Types.ObjectId, ref: "Subdivision" }],
		ancestors: [{ type: Schema.Types.ObjectId, ref: "Folder", required: false }],
		parentFolder: { type: Schema.Types.ObjectId, ref: "Folder", required: false },
		creator: { type: Schema.Types.ObjectId, ref: "User" },
		created_at:  Date,
		updated_at:  Date,
	});

	folderSchema.pre("save", function(next) {
		let now = new Date();
		this.updated_at = now;
		if (!this.created_at) {
			this.created_at = now;
		}
		next();
	});

	let Folder = mongoose.model("Folder", folderSchema);
	return Folder;

};
