"use strict";

module.exports = function(imports) {

    let mongoose = imports.modules.mongoose;

    let Schema = mongoose.Schema;
    let ObjectId = Schema.Types.ObjectId;

    let hiddenGroups = imports.util.hiddenGroups;

    let folderSchema = new Schema({
        name: {
            type: String,
            required: true
        },
        defaultFolder: Boolean,
        audience: hiddenGroups.schemaType,
        ancestors: [{
            type: ObjectId,
            ref: "Folder",
            required: false
        }],
        parentFolder: {
            type: ObjectId,
            ref: "Folder",
            required: false
        },
        creator: {
            type: ObjectId,
            ref: "User"
        },
        created_at: Date,
        updated_at: Date,
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
