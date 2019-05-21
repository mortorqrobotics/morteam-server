"use strict";

/**
 * The server for https://www.morteam.com
 * @author      Farbod Rafezy <rafezyfarbod@gmail.com>
 * @version     1.0.0-beta.4
 */

// wrap everything for the network
module.exports = function(imports) {

    imports = require("./initImports")(imports);

    let express = imports.modules.express;
    let fs = require("fs");
    let http = require("http");
    let mongoose = imports.modules.mongoose;
    let ObjectId = mongoose.Types.ObjectId; // this is used to cast strings to MongoDB ObjectIds
    let multer = imports.modules.multer; // for file uploads
    let Promise = imports.modules.Promise;
    let util = imports.util;
    let csrf = require("csurf");
    let cookieParser = require("cookie-parser");
    let requireLogin = util.requireLogin;

    let csrfMiddleware = csrf({
        cookie: true
    });
    Promise.promisifyAll(util);
    Promise.promisifyAll(fs);

    console.log("MorTeam started");

    // define the main object passed to mornetwork
    let app = express();

    let publicDir = imports.publicDir;
    app.use(express.static(publicDir));

    // load default profile picture
    app.get("/images/user.jpg-60", (req, res) => {
        res.sendFile(publicDir + "/images/user.jpg");
    });
    app.get("/images/user.jpg-300", (req, res) => {
        res.sendFile(publicDir + "/images/user.jpg");
    });
    app.use(cookieParser());
    app.use(csrfMiddleware);
    // check to see if user is logged in before continuing any further
    // allow browser to receive images, css, and js files without being logged in
    // allow browser to receive some pages such as login.html, signup.html, etc. without being logged in
    app.use(function(req, res, next) {
        if (req.method != "GET") { // TODO: can this just be app.get then?
            return next();
        }
        res.cookie('XSRF--TOKEN', req.csrfToken());
	res.locals.csrftoken = req.csrfToken();
        let path = req.path;

        if (path.startsWith("/js")) {
            return next();
        }

        let exceptions = [
            "/login",
            "/signup",
            "/fp",
        ];

        if (exceptions.indexOf(path) > -1) {
            return next();
        }

        if (path == "/void") {
            if (!req.user || req.user.team) {
                return res.redirect("/");
            }
            return next();
        }

        if (!req.user) {
            return res.redirect("/login");
        }

        if (!req.user.team) {
            return res.redirect("/void");
        }

        next();
    });

    // use EJS as default view engine and specifies location of EJS files
    app.set("view engine", "ejs");
    //	router.set("views", require("path").join(__dirname, "/../website"));

    app.use(require("./views")(imports));

    imports.sio = require("./sio")(imports);

    let api = express.Router();
    // import all modules that handle specific requests
    api.use(require("./accounts")(imports));
    api.use(require("./teams")(imports));
    api.use(require("./groups")(imports));
    api.use(require("./announcements")(imports));
    api.use(require("./chat")(imports));
    api.use(require("./drive")(imports));
    api.use(require("./events")(imports));
    api.use(require("./tasks")(imports));

    app.use("/api", api);

    // send 404 message for any page that does not exist (IMPORTANT: The order for this does matter. Keep it at the end.)
    app.use("*", function(req, res) { // TODO: should this be get or use?
        util.send404(res);
    });

    return app;

};
