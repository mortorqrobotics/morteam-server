"use strict";

module.exports = function(imports) {

    let mongoose = imports.modules.mongoose;

    let Schema = mongoose.Schema;
    let ObjectId = Schema.Types.ObjectId;

    let chatSchema = new Schema({
        name: {
            type: String,
            required: false
        },
        team: {
            type: ObjectId,
            ref: "Team",
            required: true
        },
        group: Boolean,
        userMembers: [{
            type: ObjectId,
            ref: "User"
        }],
        subdivisionMembers: [{
            type: ObjectId,
            ref: "Subdivision"
        }],
        messages: [{
            author: {
                type: ObjectId,
                ref: "User"
            },
            content: String,
            timestamp: Date
        }],
        created_at: Date,
        updated_at: Date,
    });

    chatSchema.pre("save", function(next) {
        let now = new Date();
        this.updated_at = now;
        if (!this.created_at) {
            this.created_at = now;
        }
        next();
    });

    let Chat = mongoose.model("Chat", chatSchema);

    return Chat;

};
