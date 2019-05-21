"use strict";

let mongoose = require("mongoose");
let Schema = mongoose.Schema;
let Promise = require("bluebird");

let coroutine = require("./coroutine");
let AllTeamGroup = require("./AllTeamGroup");
let PositionGroup = require("./PositionGroup");

let teamSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    number: {
        type: Number,
        required: true,
    },
    profPicPath: {
        type: String,
        default: null,
    },
    currentRegional: {
        type: String,
        required: false,
    },
    isPrivate: { // for morscout
        type: Boolean,
        required: false,
        default: false,
    },
    created_at: Date,
    updated_at: Date,
});

teamSchema.pre("save", function(next) {
    let now = new Date();
    this.updated_at = now;
    if (!this.created_at) {
        this.created_at = now;
    }

    this.wasNew = this.isNew; // for the post hook

    next();
});

teamSchema.statics.createTeam = Promise.coroutine(function*(obj) {
    let team = yield teamCreate(obj);
    yield AllTeamGroup.create({
        team: team._id,
    });
    for (let position of PositionGroup.allPositions) {
        yield PositionGroup.create({
            team: team._id,
            position: position,
        });
    }
    return team;
});

let Team = mongoose.model("Team", teamSchema);

let teamCreate = Team.create.bind(Team);
delete Team.create;

module.exports = Team;
