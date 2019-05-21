"use strict";

let mongoose = require("mongoose");
let bcrypt = require("bcryptjs");
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;
let Promise = require("bluebird");
let PositionGroup = require("./PositionGroup");
let AllTeamGroup = require("./AllTeamGroup");
let NormalGroup = require("./NormalGroup");
let Team = require("./Team");
let coroutine = require("./coroutine");
let SALT_WORK_FACTOR = 10;

function createToken(size) {
    let token = "";
    for (let i = 0; i < size; i++) {
        let rand = Math.floor(Math.random() * 62);
        token += String.fromCharCode(rand + ((rand < 26) ? 97 : ((rand < 52) ? 39 : -4)));
    }
    return token;
}

var userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    parentEmail: String,
    phone: {
        type: String, // changed from Number
        required: true,
        unique: true
    },
    created_at: Date,
    updated_at: Date,
    profpicpath: String,
    team: {
        type: ObjectId,
        ref: "Team"
    },
    position: {
        type: String,
        enum: ["member", "leader", "mentor", "alumnus"]
    },
    scoutCaptain: {
        type: Boolean,
        default: false
    },
    bannedFromTeams: {
        type: [{
            type: ObjectId,
            ref: "Team"
        }],
        default: []
    },
    groups: [{
        type: ObjectId,
        ref: "Group",
        required: true,
    }],
    mobileDeviceTokens: {
        type: [{
            type: String,
            required: true,
        }],
        default: [],
    },
    email_confirmed: {
        type: Boolean,
        default: false
    },
    email_token: String
});

userSchema.pre("save", function(next) {
    let now = new Date();
    this.updated_at = now;
    if (!this.created_at) {
        this.created_at = now;
    }
    next();
});

userSchema.pre("save", function(next) {
    let capitalize = (str) => (
        str[0].toUpperCase() + str.slice(1).toLowerCase()
    );
    this.firstname = capitalize(this.firstname);
    this.lastname = capitalize(this.lastname);
    next();
});

userSchema.pre("save", function(next) {
    let user = this;

    if (!user.isModified("password")) return next();

    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            user.password = hash;
            next();
        });
    });
});

userSchema.methods.comparePassword = function(candidatePassword) {
    let password = this.password;
    return new Promise(function(resolve, reject) { // antipattern but whatever
        bcrypt.compare(candidatePassword, password, function(err, isMatch) {
            if (err) {
                reject(err);
            } else {
                resolve(isMatch);
            }
        });
    });
};

userSchema.methods.assignNewPassword = function() {
    let user = this;
    let newPassword = createToken(8);
    user.password = newPassword;
    return Promise.resolve(newPassword);
};

userSchema.methods.assignEmailVerif = function() {
    let user = this;
    let emailVerif = createToken(16);
    user.email_token = emailVerif;
    return Promise.resolve(emailVerif);
};

userSchema.statics.addToTeam = Promise.coroutine(function*(userId, teamId, position, scoutCaptain) {
    let groups = [
        (yield AllTeamGroup.findOne({
            team: teamId,
        }))._id,
        (yield PositionGroup.findOne({
            team: teamId,
            position: position,
        }))._id,
    ];
    yield User.updateOne({
        _id: userId,
    }, {
        $set: {
            team: teamId,
            position: position,
            scoutCaptain: scoutCaptain,
        },
        $push: {
            groups: { $each: groups },
        }
    });
});

userSchema.statics.removeFromTeam = Promise.coroutine(function*(user) {
    yield NormalGroup.updateMany({
        _id: {
            $in: user.groups,
        },
    }, {
        $pull: {
            users: user._id,
        },
    }, {
        multi: true,
    });
    user.groups = [];
    user.team = undefined;
    user.position = undefined;
    user.scoutCaptain = undefined;
    yield user.save();
});

userSchema.statics.setPosition = Promise.coroutine(function*(user, newPosition) {
    let oldPosition = user.position;
    user.position = newPosition;
    let oldPositionGroup = yield PositionGroup.findOne({
        team: user.team,
        position: oldPosition,
    });
    let newPositionGroup = yield PositionGroup.findOne({
        team: user.team,
        position: newPosition,
    });
    user.groups.splice(user.groups.map(g => g.toString()).indexOf(oldPositionGroup._id.toString()), 1);
    user.groups.push(newPositionGroup._id);
    yield user.save();
});

let User = mongoose.model("User", userSchema);

module.exports = User;
