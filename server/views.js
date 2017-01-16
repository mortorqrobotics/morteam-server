"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Promise = imports.modules.Promise;
    let fs = require("fs"); // TODO: put this into initImports
    let util = imports.util;
    let handler = util.handler;

    let Team = imports.models.Team;

    let webDir = imports.webDir;
    let profpicDir = imports.profpicDir;

    let router = express.Router();

    // load user profile picture from AWS S3
    router.get("/pp/:path", handler(function*(req, res) {
        if (imports.util.s3.isProduction) {
            res.redirect(profpicDir + req.params.path);
        } else {
            res.sendFile(require("path").join(
                __dirname,
                "../buckets/profilepics.morteam.com",
                req.params.path
            ));
        }
    }));

    let pages = {
        signup: "Signup",
        login: "Login",
        "": "Home", // this works
        void: "Void",
        chat: "Chat",
        drive: "Drive",
        cal: "Calendar",
        map: "Map",
        fp: "Fp",
    };

    let renderPage = Promise.coroutine(function*(res, page, user, options) {
        if (user) {
            user.team = yield Team.findOne({
                _id: user.team,
            });
        }
        res.render(webDir + "/src/page.html.ejs", {
            options: options || {},
            userInfo: user,
            page: page,
        });
    });

    for (let page in pages) {
        router.get("/" + page, handler(function*(req, res) {
            renderPage(res, pages[page], req.user);
        }));
    }

    router.get("/profiles/id/:userId", handler(function*(req, res) {
        renderPage(res, "User", req.user, {
            userId: req.params.userId,
        });
    }));

    router.get("/teams/current", handler(function*(req, res) {
        renderPage(res, "Team", req.user);
    }));

    router.get("/groups/id/:groupId", handler(function*(req, res) {
        renderPage(res, "Group", req.user, {
            groupId: req.params.groupId,
        });
    }));

    router.use("/js", express.static(webDir + "/build"));

    return router;

};
