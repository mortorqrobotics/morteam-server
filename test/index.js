"use strict";

let mocha = require("mocha");
let assert = require("chai").assert;
let request = require("supertest-promised");
let Promise = require("bluebird");

let app = require(require("path").join(__dirname, "../../mornetwork/src/server"));

function mkSession() {
    let cookie = null;
    return (method, path, code, data) => {
        if (!data && typeof code === "object") {
            data = code;
            code = null;
        }
        return request(app)[method.toLowerCase()](path)
            .set({
                cookie: cookie,
            })
            .expect(code || 200)
            .send(data)
            .then(obj => {
                let cookies = obj.req.res.headers["set-cookie"];
                if (cookies && cookies[0]) {
                    cookie = cookies[0].match(/connect\.sid=[^;]+/)[0];
                }
                return obj;
            })
            .then(obj => {
                try {
                    return JSON.parse(obj.res.text);
                } catch (err) {
                    return obj.res.text;
                }
            });
    }
}

let session1 = mkSession();
let session2 = mkSession();

describe("stuff", function() {

    let user1;
    let user2;
    let team;
    let allTeamGroup;
    let leaderGroup;
    let memberGroup;

    it("should create the first user", Promise.coroutine(function*() {
        user1 = yield session1("post", "/users", {
            firstname: "Bob",
            lastname: "Jones",
            username: "test1",
            password: "hunter1",
            email: "bob@jones.com",
            phone: "1111111111",
        });
    }));

    it("should login the first user", Promise.coroutine(function*() {
        user1 = yield session1("post", "/login", {
            username: "test1",
            password: "hunter1",
            rememberMe: true,
        });
    }));

    it("should create the second user", Promise.coroutine(function*() {
        yield session2("post", "/users", {
            firstname: "John",
            lastname: "Johnson",
            username: "test2",
            password: "hunter2",
            email: "john@johnson.com",
            phone: "2222222222",
        });
    }));

    it("should login the second user", Promise.coroutine(function*() {
        user2 = yield session2("post", "/login", {
            username: "test2",
            password: "hunter2",
            rememberMe: true,
        });
    }));

    it("should create the team", Promise.coroutine(function*() {
        team = yield session1("post", "/teams", {
            number: 1515,
            name: "MorTorq",
            id: "partedhair",
        });
    }));

    it("should create an AllTeamGroup and PositionGroups", Promise.coroutine(function*() {
        let groups = yield session1("get", "/groups");
        allTeamGroup = groups.find(g => g.__t === "AllTeamGroup");
        assert.ok(allTeamGroup, "AllTeamGroup exists");
        leaderGroup = groups.find(g => g.position === "leader");
        assert.ok(leaderGroup, "leader PositionGroup exists");
    }));

    it("should not let users join a team that does not exist", Promise.coroutine(function*() {
        yield session2("post", "/teams/code/nonexistent/join", 400);
    }));

    it("should let the second user join the team", Promise.coroutine(function*() {
        let joinedTeam = yield session2("post", "/teams/code/partedhair/join");
        assert.equal(team._id, joinedTeam._id);
    }));

    it("should put the second user in the right groups", Promise.coroutine(function*() {
        let groups = yield session2("get", "/groups");
        memberGroup = groups.find(g => g.position === "member");
        assert.ok(memberGroup, "member PositionGroup exists");
        assert.ok(groups.some(g => g.__t === "AllTeamGroup"),
            "second user is in the AllTeamGroup"
        );
        assert.notOk(groups.some(g => g.position === "leader"),
            "members are not in the leader PositionGroup"
        );
    }));

});
