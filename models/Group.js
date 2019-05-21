"use strict";

let mongoose = require("mongoose");
let Promise = require("bluebird");
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;

let groupSchema = new Schema({});

groupSchema.pre("save", function(next) {

    if (this.__t) {
        return next();
    }

    // __t is not defined for generic groups
    // a generic group should never be created, so it should not be saved
    throw new Error("A generic group document should never be created.");
    // I do not think this error will actually do anything though

});

let Group = mongoose.model("Group", groupSchema);

module.exports = Group;
