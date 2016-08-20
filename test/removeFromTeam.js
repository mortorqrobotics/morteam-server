"use strict";

let Promise = require("bluebird");
let coroutine = Promise.coroutine;
let assert = require("chai").assert;
let sessions = require("./util/shared").sessions;
let data = require("./util/shared").data;
let delay = require("./util/delay");

describe("removing a user from a team", function() {

    it("should remove the user from the team", coroutine(function*() {
        yield sessions[0]("DELETE",
            "/teams/current/users/id/" + data.users[1]._id
        );
        let users = yield sessions[0]("GET", "/teams/current/users");
        assert.equal(users.length, 1, "the user was deleted");
        assert.equal(users[0]._id, data.users[0]._id,
            "the correct user was deleted"
        );
    }));

    it("should remove the user from groups", coroutine(function*() {
        let user1 = yield sessions[0]("GET", "/users/id/" + data.users[1]._id);
        assert.equal(user1.groups.length, 0, "user was removed from all groups");
    }));

    // TODO: add test for removing user from hidden groups

});
