"use strict";

let mongoose = require("mongoose");
let Group = require("./Group");
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;
let Promise = require("bluebird");

const allPositions = ["member", "leader", "mentor", "alumnus"];

let positionGroupSchema = new Schema({
    position: {
        type: String,
        enum: allPositions,
        required: true,
    },
    team: {
        type: ObjectId,
        ref: "Team",
        required: true,
    },
});

positionGroupSchema.statics.allPositions = allPositions;

let PositionGroup = Group.discriminator("PositionGroup", positionGroupSchema);

module.exports = PositionGroup;
