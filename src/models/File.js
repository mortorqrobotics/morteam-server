"use strict";

module.exports = function(imports) {

    let mongoose = imports.modules.mongoose;

    let Schema = mongoose.Schema;
    let ObjectId = Schema.Types.ObjectId;

    let fileSchema = new Schema({
        name: {
            type: String,
            required: true
        },
        originalName: {
            type: String,
            required: false
        },
        folder: {
            type: ObjectId,
            ref: "Folder",
            required: false
        }, // TODO: why is folder not required?
        size: Number,
        type: String,
        mimetype: String,
        creator: {
            type: ObjectId,
            ref: "User"
        },
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
