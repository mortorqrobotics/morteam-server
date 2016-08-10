"use strict";

let Promise = require("bluebird");
let coroutine = Promise.coroutine;
let assert = require("chai").assert;
let sessions = require("./shared").sessions;
let data = require("./shared").data;
let delay = require("./delay");

describe("announcements", function() {

    it("should create announcements", coroutine(function*() {
        yield sessions[0]("POST", "/announcements", {
            content: "hello",
            audience: {
                users: [],
                groups: [data.normalGroup0],
            },
        });
    }));

    it("should send the announcements correctly", coroutine(function*() {
        for (let i of[0, 1]) {
            let announcements = yield sessions[i]("GET", "/announcements");
            assert.equal(announcements.length, 1,
                "each user receives exactly one announcement"
            );
            data.announcement = announcements[0];
            assert.equal(data.announcement.author._id, data.users[0]._id,
                "the author is correct and populated"
            );
            assert.equal(data.announcement.content, "hello",
                "the content is correct"
            );
        }
    }));

    it("should not let incorrect people delete announcements", coroutine(function*() {
        yield sessions[1]("DELETE", "/announcements/id/" + data.announcement._id, 403);
    }));

    it("should let admins and posters delete announcements", coroutine(function*() {
        yield sessions[0]("DELETE", "/announcements/id/" + data.announcement._id);
        delete data.announcement;
        for (let i of[0, 1]) {
            let announcements = yield sessions[i]("GET", "/announcements");
            assert.equal(announcements.length, 0,
                "the announcement was deleted"
            );
        }
    }));

});
