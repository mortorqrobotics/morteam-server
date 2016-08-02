"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Promise = imports.modules.Promise;
    let fs = require("fs"); // TODO: put this into initImports
    let util = imports.util;
    let handler = util.handler;

    let Team = imports.models.Team;

    let router = express.Router();

    let pages = {
        signup: "Signup",
        login: "Login",
        "": "Home", // this works
        void: "Void",
    };

    for (let page in pages) {

        router.get("/" + page, handler(function*(req, res) {

            if (req.user) {
                req.user.team = yield Team.findOne(req.user.team);
            }

            res.render("../../morteam-web/src/page.html.ejs", {
                userInfo: req.user,
                page: pages[page],
            });

        }));

    }

    router.get("/js/:page", handler(function*(req, res) {
        let page = req.params.page;
        let file = "../morteam-web/build/" + page + ".js";
        // TODO: use the package fs-promise
        fs.exists(file, function(exists) {
            if (!exists) {
                return res.end("fail"); // AHHHH
            }
            fs.createReadStream(file).pipe(res);
        });
    }));

    return router;

};
