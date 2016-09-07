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

    before(coroutine(function*() {
        yield sessions[0]("POST", "/announcements", {
            content: "stuff",
            audience: {
                users: [data.users[0]._id, data.users[1]._id],
                groups: [],
            },
        });
    }));

    it("should remove the user from announcement hidden groups", coroutine(function*() {
        let announcements = yield sessions[0]("GET", "/announcements");
        assert.equal(announcements[0].audience.users.length, 1,
            "a user was removed from announcement hidden group"
        );
        assert.equal(announcements[0].audience.users[0]._id, data.users[0]._id,
            "the correct user was removed from announcement hidden group"
        );
    }));

    // TODO: add tests for more hidden groups other than just in announcements

});
