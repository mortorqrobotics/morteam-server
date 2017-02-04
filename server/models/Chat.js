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
        unreadMessages: [{
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

    chatSchema.pre("save", coroutine(function*(next) {
        let now = new Date();
        this.updated_at = now;
        if (!this.created_at) {
            this.created_at = now;
        }
        if (this.isNew) {
            yield this.updateUnread();
        }
        next();
    }));

    chatSchema.methods.updateUnread = coroutine(function*() {
        let users = audience.userList;
        if (!this.audience.userList) {
            users = yield audience.getUsersIn(this.audience);
        }
        for (let user of users) {
            if (this.unreadMessages.findIndex(elem => elem.userId === user._id.toString()) === -1) {
                this.unreadMessages.push({ userId: user._id.toString(), number: 0 })
            }
        }
        this.save();
    });

    let Chat = mongoose.model("Chat", chatSchema);

    return Chat;

};
