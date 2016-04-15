"use strict"; 

module.exports = function(mongoose) {
	
let Schema = mongoose.Schema;

let fileSchema = new Schema({
	name:         { type: String, required: true },
	originalName: { type: String, required: false },
	folder: { type: Schema.Types.ObjectId, ref: "Folder", required: false },
	size: Number,
	type: String,
	mimetype: String,
	creator: { type: Schema.Types.ObjectId, ref: "User" },
	created_at: Date,
	updated_at: Date,
});

fileSchema.pre("save", function(next) {
	let now = new Date();
	this.updated_at = now;
	if (!this.created_at) {
		this.created_at = now;
	}
	next();
});

let File = mongoose.model("File", fileSchema);
return File;

};
