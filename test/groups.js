"use strict";

let Promise = require("bluebird");
let coroutine = Promise.coroutine;
let assert = require("chai").assert;
let sessions = require("./util/shared").sessions;
let data = require("./util/shared").data;
let delay = require("./util/delay");

describe("groups", function() {

    it("should update PositionGroup membership", coroutine(function*() {
        yield sessions[0]("PUT",
            "/users/id/" + data.users[1]._id + "/position", {
                newPosition: "alumnus",
            }
        );
        let groups = yield sessions[1]("GET", "/groups");
        assert.ok(groups.some(g => g.position === "alumnus"),
            "user added to alumni PositionGroup"
        );
        assert.notOk(groups.some(g => g.position === "member"),
            "use removed from member PositionGroup"
        );
    }));

    it("should allow creation of NormalGroups with users", coroutine(function*() {
        data.normalGroup0 = yield sessions[0]("POST", "/groups/normal", {
            users: data.users.slice(0, 2).map(user => user._id),
            name: "This is a group",
        });
        let groups0 = yield sessions[0]("GET", "/groups/normal");
        let groups1 = yield sessions[1]("GET", "/groups/normal");
        assert.equal(groups0.length, 1, "user 0 is added to the group");
        assert.equal(groups1.length, 1, "user 1 is added to the group");
        assert.equal(groups0[0]._id, groups1[0]._id, "the groups are the same");
    }));

    it("should remove users from groups", coroutine(function*() {
        yield sessions[0]("DELETE", "/groups/normal/id/" + data.normalGroup0._id + "/users/id/" + data.users[1]._id);
        let groups0 = yield sessions[0]("GET", "/groups/normal");
        let groups1 = yield sessions[1]("GET", "/groups/normal");
        assert.equal(groups0.length, 1, "user 0 remained in the group");
        assert.equal(groups1.length, 0, "user 1 was removed from the group");
        let group = yield sessions[0]("GET", "/groups/id/" + data.normalGroup0._id);
        assert.equal(group.users.length, 1, "the user was removed");
    }));

    it("should add users to groups", coroutine(function*() {
        yield sessions[0]("POST", "/groups/normal/id/" + data.normalGroup0._id + "/users", {
            users: data.users.slice(0, 2).map(u => u._id),
        });
        let groups0 = yield sessions[0]("GET", "/groups/normal");
        let groups1 = yield sessions[1]("GET", "/groups/normal");
        assert.equal(groups0.length, 1, "user 0 remained in the group");
        assert.equal(groups1.length, 1, "user 1 was added to the group");
        let group = yield sessions[0]("GET", "/groups/id/" + data.normalGroup0._id);
        assert.equal(group.users.length, 2, "the user was added");
    }));

    it("should not include users from other teams in AllTeamGroups", coroutine(function*() {
        let groups = yield sessions[2]("GET", "/groups/other");
        assert.equal(groups.length, 0, "user 2 has no public groups");
    }));

});
