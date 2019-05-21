"use strict";

let mongoose = require("mongoose");
let Group = require("./Group");
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;
let Promise = require("bluebird");

let normalGroupSchema = new Schema({
    users: [{
        type: ObjectId,
        ref: "User",
        required: true,
    }],
    team: {
        type: ObjectId,
        ref: "Team",
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
});

normalGroupSchema.statics.createGroup = Promise.coroutine(function*(obj) {
    let group = yield normalGroupCreate({
        users: obj.users,
        name: obj.name,
        team: obj.team,
    });
    yield require("./User").updateMany({
        _id: {
            $in: obj.users,
        },
    }, {
        $push: {
            groups: group._id,
        },
    }, {
        multi: true,
    });
    return group;
});

normalGroupSchema.statics.addUsers = Promise.coroutine(function*(groupId, users) {
    yield normalGroupUpdateOne({
        _id: groupId,
    }, {
        $addToSet: {
            users: {
                $each: users,
            },
        },
    });
    yield require("./User").updateMany({
        _id: {
            $in: users,
        },
    }, {
        $addToSet: {
            groups: groupId,
        },
    }, {
        multi: true,
    });
});

normalGroupSchema.statics.removeUsers = Promise.coroutine(function*(groupId, users) {
    yield normalGroupUpdateOne({
        _id: groupId,
    }, {
        $pull: {
            users: {
                $in: users,
            },
        },
    });
    yield require("./User").updateMany({
        _id: {
            $in: users,
        },
    }, {
        $pull: {
            groups: groupId,
        },
    }, {
        multi: true,
    });
});

let NormalGroup = Group.discriminator("NormalGroup", normalGroupSchema);

// should this be a thing?
let normalGroupUpdateOne = NormalGroup.updateOne.bind(NormalGroup);
delete NormalGroup.updateOne;
let normalGroupCreate = NormalGroup.create.bind(NormalGroup);
delete NormalGroup.create;

module.exports = NormalGroup;
