"use strict";

let mongoose = require("mongoose");
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;
let Promise = require("bluebird");
let Group = require("./Group");

let allTeamGroupSchema = new Schema({
    team: {
        type: ObjectId,
        ref: "Team",
        required: true,
    },
});

let AllTeamGroup = Group.discriminator("AllTeamGroup", allTeamGroupSchema);

module.exports = AllTeamGroup;
