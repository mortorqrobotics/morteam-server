"use strict";

let Promise = require("bluebird");
let coroutine = Promise.coroutine;
let assert = require("chai").assert;
let sessions = require("./shared").sessions;
let data = require("./shared").data;

let makeUser = coroutine(function*(session, num) {
    yield session("POST", "/users", {
        firstname: "First" + num,
        lastname: "Last" + num,
        username: "User" + num,
        password: "hunter" + num,
        email: "e" + num + "@mail.com",
        phone: "0".repeat(10 - num.toString().length) + num,
    });
    return yield session("POST", "/login", {
        username: "User" + num,
        password: "hunter" + num,
        rememberMe: true,
    });
});

describe("account setup", function() {

    it("should create users and log them in", coroutine(function*() {
        data.users = yield Promise.all(sessions.map((session, i) => (
            makeUser(session, i + 1)
        )));
    }));

    it("should create the team", coroutine(function*() {
        data.team = yield sessions[0]("POST", "/teams", {
            number: 1515,
            name: "MorTorq",
            id: "partedhair",
        });
    }));

    it("should create an AllTeamGroup and PositionGroups", coroutine(function*() {
        let groups = yield sessions[0]("GET", "/groups");
        data.allTeamGroup = groups.find(g => g.__t === "AllTeamGroup");
        assert.ok(data.allTeamGroup, "AllTeamGroup exists");
        data.leaderGroup = groups.find(g => g.position === "leader");
        assert.ok(data.leaderGroup, "leader PositionGroup exists");
    }));

    it("should not let users join a team that does not exist", coroutine(function*() {
        yield sessions[1]("POST", "/teams/code/nonexistent/join", 400);
    }));

    it("should let the second user join the team", coroutine(function*() {
        let joinedTeam = yield sessions[1]("POST", "/teams/code/partedhair/join");
        assert.equal(data.team._id, joinedTeam._id);
    }));

    it("should put the second user in the right groups", coroutine(function*() {
        let groups = yield sessions[1]("GET", "/groups");
        data.memberGroup = groups.find(g => g.position === "member");
        assert.ok(data.memberGroup, "member PositionGroup exists");
        assert.ok(groups.some(g => g.__t === "AllTeamGroup"),
            "second user is in the AllTeamGroup"
        );
        assert.notOk(groups.some(g => g.position === "leader"),
            "members are not in the leader PositionGroup"
        );
    }));

});
