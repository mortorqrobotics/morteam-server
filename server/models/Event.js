"use strict";

module.exports = function(imports) {

    let mongoose = imports.modules.mongoose;

    let Schema = mongoose.Schema;
    let ObjectId = Schema.Types.ObjectId;

    let eventSchema = new Schema({
        name: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: false
        },
        group: {
            type: ObjectId,
            ref: "Group",
            required: true
        }
        hasAttendance: Boolean,
        date: {
            type: Date,
            required: true
        },
        creator: {
            type: ObjectId,
            ref: "User"
        },
        created_at: Date,
        updated_at: Date,
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
