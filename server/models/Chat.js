"use strict";

module.exports = function(imports) {

    let mongoose = imports.modules.mongoose;
    let Promise = imports.modules.Promise;
    let coroutine = imports.models.coroutine;

    let Schema = mongoose.Schema;
    let ObjectId = Schema.Types.ObjectId;

    let audience = imports.util.audience;

    let chatSchema = new Schema({
        name: {
            type: String,
            required: false
        },
        isTwoPeople: Boolean,
        creator: {
            type: ObjectId,
            ref: "User",
            required: false,
        },
        audience: audience.schemaType,
        readMessages: [{
            userId: String,
            number: Number,
        }],
        messages: {
            type: [{
                author: {
                    type: ObjectId,
                    ref: "User"
                },
                content: String,
                timestamp: Date,
            }],
            select: false,
        },
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

    chatSchema.pre("save", coroutine(function*(next) {
        console.log("test")
        let users = yield audience.getUsersIn(this.audience);
        console.log(users);
        this.readMessages = users.map(user => ({ userId: user._id, number: 0 }));
        console.log(this.readMessages);
        next();
    }));

    let Chat = mongoose.model("Chat", chatSchema);

    return Chat;

};
