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
        yield Promise.all([
            sessions[0]("POST", "/announcements", {
                content: "stuff",
                audience: {
                    users: [data.users[0]._id, data.users[1]._id],
                    groups: [],
                },
            }),
            sessions[0]("POST", "/events", {
                sendEmail: false,
                name: "thing",
                description: "stuff",
                date: new Date(),
                audience: {
                    users: [data.users[0]._id, data.users[1]._id],
                    groups: [],
                },
            }),
            sessions[0]("POST", "/chats", {
                isTwoPeople: true,
                otherUser: data.users[1]._id,
            }),
            sessions[0]("POST", "/chats", {
                isTwoPeople: false,
                name: "thing",
                audience: {
                    users: [data.users[1]._id], //user 0 is added as req.user
                    groups: [],
                },
            }),
            sessions[0]("POST", "/folders", {
                name: "stuffs",
                type: "teamFolder",
                audience: {
                    users: [data.users[0]._id, data.users[1]._id],
                    groups: [],
                },
            }),
        ])
    }));

    it("should remove the user from announcement hidden groups", coroutine(function*() {
        let announcements = yield sessions[0]("GET", "/announcements", {
            skip: 0,
        });
        assert.equal(announcements[0].audience.users.map(u => u._id), data.users[0]._id,
            "the user was removed from announcement hidden group"
        );
    }));

    it("should remove the user from event hidden groups", coroutine(function*() {
        let date = new Date();
        let events = yield sessions[0]("GET",
            "/events/startYear/" + (date.getFullYear() - 1) + "/startMonth/0/endYear/"
            + (date.getFullYear() + 1) + "/endMonth/0");
        assert.equal(events[0].audience.users, data.users[0]._id,
            "the user was removed from event hidden group"
        );
    }));

    it("should remove the user from group chat hidden groups", coroutine(function*() {
        let chats = yield sessions[0]("GET", "/chats");
        let groupChat = chats.find(chat => !chat.isTwoPeople);
        assert.equal(groupChat.audience.users.map(u => u._id), data.users[0]._id,
            "the user was removed from group chat hidden group"
        );
    }));

    it("should not remove the user from private chat hidden groups", coroutine(function*() {
        let chats = yield sessions[0]("GET", "/chats");
        let privateChat = chats.find(chat => chat.isTwoPeople);
        assert.equal(privateChat.audience.users.length, 2,
            "no user was removed from private chat hidden group"
        );
    }));

    it("should remove the user from folder hidden groups", coroutine(function*() {
        let folders = yield sessions[0]("GET", "/folders");
        let folder = folders.find(folder => !folder.defaultFolder);
        assert.equal(folder.audience.users, data.users[0]._id,
            "the user was removed from folder hidden group"
        );
    }));

    it("should not remove the user from Personal Files folder hidden group", coroutine(function*() {
        let folders = yield sessions[0]("GET", "/folders");
        let personalFolder = folders.find(folder =>
            folder.defaultFolder && folder.name === "Personal Files");
        assert.equal(personalFolder.audience.users.length, 1,
            "no user was removed from Personal Files folder hidden group"
        );
    }));

});
