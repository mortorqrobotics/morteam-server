"use strict";

let Promise = require("bluebird");
let coroutine = Promise.coroutine;
let assert = require("chai").assert;
let sessions = require("./shared").sessions;
let data = require("./shared").data;
let delay = require("./delay");

describe("groups", function() {

    it("should update PositionGroup membership", coroutine(function*() {
        yield sessions[0]("PUT",
            "/users/id/" + data.users[1]._id + "/position", {
                newPosition: "mentor",
            }
        );
        yield delay(100);
        let groups = yield sessions[1]("GET", "/groups");
        assert.ok(groups.some(g => g.position === "mentor"),
            "user added to mentor PositionGroup"
        );
        assert.notOk(groups.some(g => g.position === "member"),
            "use removed from member PositionGroup"
        );
    }));

    it("should allow creation of NormalGroups with users", coroutine(function*() {
        data.normalGroup0 = yield sessions[0]("POST", "/groups", {
            users: data.users.map(user => user._id),
            groups: [],
            name: "UsersOnly",
            isPublic: true,
        });
        let groups0 = yield sessions[0]("GET", "/groups/normal");
        let groups1 = yield sessions[1]("GET", "/groups/normal");
        assert.equal(groups0.length, 1, "user 0 is added to the group");
        assert.equal(groups1.length, 1, "user 1 is added to the group");
        assert.equal(groups0[0]._id, groups1[0]._id, "the groups are the same");
    }));

    it("should allow creation of NormalGroups with groups", coroutine(function*() {
        data.normalGroup1 = yield sessions[0]("POST", "/groups", {
            users: [],
            groups: [data.normalGroup0._id],
            name: "ContainsGroup",
            isPublic: true,
        });
        let groups0 = yield sessions[0]("GET", "/groups/normal");
        let groups1 = yield sessions[1]("GET", "/groups/normal");
        assert.equal(groups0.length, 2, "user 0 is added to the group");
        assert.equal(groups1.length, 2, "user 1 is added to the group");
        assert.deepEqual(groups0.map(g => g._id).sort(), groups1.map(g => g._id).sort(),
            "the groups are the same"
        );
    }));

    it("should remove users from groups", coroutine(function*() {
        yield sessions[0]("PUT", "/groups/id/" + data.normalGroup0._id, {
            users: [data.users[0]._id],
            groups: [],
        });
        let groups0 = yield sessions[0]("GET", "/groups/normal");
        let groups1 = yield sessions[1]("GET", "/groups/normal");
        assert.equal(groups0.length, 2, "user 0 remained in the groups");
        assert.equal(groups1.length, 0, "user 1 was removed from the groups");
    }));

    it("should add users to groups", coroutine(function*() {
        yield sessions[0]("PUT", "/groups/id/" + data.normalGroup0._id, {
            users: data.users.map(u => u._id),
            groups: [],
        });
        yield delay(100); // is this necessary here?
        let groups0 = yield sessions[0]("GET", "/groups/normal");
        let groups1 = yield sessions[1]("GET", "/groups/normal");
        assert.equal(groups0.length, 2, "user 0 remained in the groups");
        assert.equal(groups1.length, 2, "user 1 was added to the groups");
    }));

});
