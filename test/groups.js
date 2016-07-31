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
        yield delay(50);
        let groups = yield sessions[1]("GET", "/groups");
        assert.ok(groups.some(g => g.position === "mentor"),
            "user added to mentor PositionGroup"
        );
        assert.notOk(groups.some(g => g.position === "member"),
            "use removed from member PositionGroup"
        );
    }));

});
