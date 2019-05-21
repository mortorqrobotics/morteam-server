"use strict";

let mongoose = require("mongoose");
let Group = require("./Group");
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;
let Promise = require("bluebird");

let multiTeamGroupSchema = new Schema({
    teams: [{
        type: ObjectId,
        ref: "Team",
        required: true,
    }],
});

let MultiTeamGroup = Group.discriminator("MultiTeamGroup", multiTeamGroupSchema);

module.exports = MultiTeamGroup;
