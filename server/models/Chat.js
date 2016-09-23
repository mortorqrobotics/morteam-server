"use strict";

module.exports = function(imports) {

    let mongoose = imports.modules.mongoose;

    let Schema = mongoose.Schema;
    let ObjectId = Schema.Types.ObjectId;

    let hiddenGroups = imports.util.hiddenGroups;

    let chatSchema = new Schema({
        name: {
            type: String,
            required: false
        },
        isTwoPeople: Boolean,
        audience: hiddenGroups.schemaType,
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
