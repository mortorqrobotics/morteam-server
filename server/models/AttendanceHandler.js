"use strict";

module.exports = function(imports) {

    let mongoose = imports.modules.mongoose;

    let Schema = mongoose.Schema;
    let ObjectId = Schema.Types.ObjectId;

    let attendanceHandlerSchema = new Schema({
        event: {
            type: ObjectId,
            ref: "Event"
        },
        event_date: Date,
        attendees: [{
            user: {
                type: ObjectId,
                ref: "User"
            },
            status: String
        }],
        entireTeam: Boolean,
        created_at: Date,
        updated_at: Date,
    });

    attendanceHandlerSchema.pre("save", function(next) {
        let now = new Date();
        this.updated_at = now;
        if (!this.created_at) {
            this.created_at = now;
        }
        next();
    });

    // TODO: why is the string lower case? will it break if it is capitalized?
    let AttendanceHandler = mongoose.model("attendanceHandler", attendanceHandlerSchema);

    return AttendanceHandler;

};
