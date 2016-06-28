"use strict";

module.exports = function(imports) {

    let mongoose = imports.modules.mongoose;

    let Schema = mongoose.Schema;
    let ObjectId = Schema.Types.ObjectId;

    let folderSchema = new Schema({
        name: {
            type: String,
            required: true
        },
        team: {
            type: ObjectId,
            ref: "Team",
            required: true
        },
        defaultFolder: Boolean,
        entireTeam: {
            type: Boolean,
            required: false
        },
        userMembers: [{
            type: ObjectId,
            ref: "User"
        }],
        subdivisionMembers: [{
            type: ObjectId,
            ref: "Subdivision"
        }],
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
