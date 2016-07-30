"use strict";

let mocha = require("mocha");
let assert = require("chai").assert;
let sessionFactory = require("supertest-session-promise");

let app = require(require("path").join(__dirname, "../../mornetwork/src/server"));

let session = sessionFactory.create({
    app: app
});

describe("stuff", function() {

    it("should do stuff", function*() {
        return yield session
            .get("/")
            .expect(200);
    });

});
