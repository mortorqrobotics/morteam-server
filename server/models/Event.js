"use strict";

module.exports = function(imports) {

    let mongoose = imports.modules.mongoose;

    let Schema = mongoose.Schema;
    let ObjectId = Schema.Types.ObjectId;

    let audience = imports.util.audience;

    let eventSchema = new Schema({
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: false,
        },
        audience: audience.schemaType,
        hasTakenAttendance: {
            type: Boolean,
            required: true,
        },
        attendance: [{
            user: {
                type: ObjectId,
                ref: "User",
            },
            status: {
                type: String,
                enum: ["present", "absent", "excused", "tardy"],
            },
        }],
        date: {
            type: Date,
            required: true,
        },
        creator: {
            type: ObjectId,
            ref: "User",
        },
        wasEmailSent: {
            type: Boolean,
            default: false,
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
