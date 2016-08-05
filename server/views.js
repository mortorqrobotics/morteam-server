"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Promise = imports.modules.Promise;
    let fs = require("fs"); // TODO: put this into initImports
    let util = imports.util;
    let handler = util.handler;

    let Team = imports.models.Team;

    const webDir = require("path").join(__dirname, "../../morteam-web");
    const publicDir = webDir + "/public";
    const profpicDir = "http://profilepics.morteam.com.s3.amazonaws.com/";

    let router = express.Router();
    router.use(express.static(publicDir));

    // load default profile picture
    router.get("/images/user.jpg-60", handler(function*(req, res) {
        res.sendFile(publicDir + "/images/user.jpg");
    }));

    router.get("/images/user.jpg-300", handler(function*(req, res) {
        res.sendFile(publicDir + "/images/user.jpg");
    }));

    // load user profile picture from AWS S3
    router.get("/pp/:path", handler(function*(req, res) {
        res.redirect(profpicDir + req.params.path);
    }));

    let pages = {
        signup: "Signup",
        login: "Login",
        "": "Home", // this works
        void: "Void",
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

//    router.get("

    router.get("/js/:page", handler(function*(req, res) {
        let page = req.params.page;
        let file = webDir + "/build/" + page + ".js";
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
