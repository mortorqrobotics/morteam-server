"use strict";

let assert = require("chai").assert;
let request = require("supertest-promised");
let Promise = require("bluebird");
let coroutine = Promise.coroutine;
let sessions = require("./util/shared").sessions;

let app = require(require("path").join(__dirname, "../../mornetwork/src/server"));

function mkSession() {
    let cookie = null;
    return (method, path, code, data) => {
        if (!data && typeof code === "object") {
            data = code;
            code = null;
        }
        if (["get", "delete"].indexOf(method.toLowerCase()) !== -1 && data) {
            path += "?" + require("querystring").stringify(data);
            data = null;
        }
        return request(app)[method.toLowerCase()]("/api" + path)
            .set({
                cookie: cookie,
            })
            .expect(code || 200)
            .send(data)
            .then(obj => {
                let cookies = obj.req.res.headers["set-cookie"];
                if (cookies && cookies[0]) {
                    cookie = cookies[0].match(/connect\.sid=[^;]*/)[0];
                }
                return obj;
            })
            .then(obj => {
                if ("content-type" in obj.res.headers
                    && obj.res.headers["content-type"].includes("application/json")
                ) {
                    return JSON.parse(obj.res.text);
                } else {
                    return obj.res.text;
                }
            });
    }
}

describe("morteam", function() {

    before(coroutine(function*() {
        for (let _ of Array(3)) {
            sessions.push(mkSession());
        }
    }));

    require("./setup");
    require("./groups");
    require("./announcements");
    require("./removeFromTeam");

});
