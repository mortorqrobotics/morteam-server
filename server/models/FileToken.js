"use strict";

module.exports = function(imports) {

    let mongoose = imports.modules.mongoose;
    let Promise = imports.modules.Promise;
    let coroutine = imports.models.coroutine;

    let Schema = mongoose.Schema;
    let ObjectId = Schema.Types.ObjectId;

    let fileTokenSchema = new Schema({
        file: {
            type: ObjectId,
            ref: "File",
            required: true,
        },
        token: {
            type: String,
            index: true,
        },
        isPreview: {
            type: Boolean,
            required: true,
        },
        viewed: Boolean,
        created_at: Date,
    });

    let generateToken = Promise.coroutine(function*() {
        let token;
        do {
            token = "";
            for (let i = 0; i < 32; i++) {
                let rand = Math.floor(Math.random() * 94);
                token += String.fromCharCode(rand + 33);
            }
        } while (yield FileToken.findOne({
            token: token,
        }));
        return token;
    });

    fileTokenSchema.pre("save", coroutine(function*(next) {
        if (this.isNew) {
            this.token = yield generateToken();
            this.viewed = false;
            this.created_at = new Date();
        }
        next();
    }));

    fileTokenSchema.statics.timeoutMillis = 20 * 1000;

    fileTokenSchema.statics.removeViewed = Promise.coroutine(function*() {
        return yield FileToken.remove({
            created_at: {
                $lt: new Date(Date.now() + FileToken.timeoutMillis),
            },
        });
    });

    const cleanPeriodMillis = 60 * 60 * 1000;

    setInterval(Promise.coroutine(function*() {
        try {
            yield FileToken.removeViewed();
        } catch (err) {
            console.error("Failed periodically removing viewed file token");
            console.error(err);
        }
    }), cleanPeriodMillis);

    let FileToken = mongoose.model("FileToken", fileTokenSchema);

    return FileToken;

};
