"use strict";

module.exports = function(imports) {

    let mongoose = imports.modules.mongoose;

    let Schema = mongoose.Schema;
    let ObjectId = Schema.Types.ObjectId;

    let announcementSchema = new Schema({
        author: {
            type: ObjectId,
            ref: "User",
            required: true
        },
        content: {
            type: String,
            required: true
        },
        audienceGroup: {
            type: ObjectId,
            ref: "Group",
            required: true
        },
        timestamp: {
            type: Date,
            required: true
        },
        entireTeam: Boolean,
        created_at: Date,
        updated_at: Date
    });

    announcementSchema.pre("save", function(next) {
        let now = new Date();
        this.updated_at = now;
        if (!this.created_at) {
            this.created_at = now;
        }
        next();
    });

    let Announcement = mongoose.model("Announcement", announcementSchema);

    return Announcement;

};
