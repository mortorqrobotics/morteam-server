"use strict";

/**
 * The server for http://www.morteam.com
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
    let lwip = imports.modules.lwip;
    let Promise = imports.modules.Promise;
    let util = imports.util;

    let requireLogin = util.requireLogin;

    Promise.promisifyAll(util);
    Promise.promisifyAll(lwip);
    Promise.promisifyAll(fs);

    const publicDir = require("path").join(__dirname, "../website/public");
    const profpicDir = "http://profilepics.morteam.com.s3.amazonaws.com/"

    console.log("MorTeam started");

    // define the main object passed to mornetwork
    let app = express();


    // check to see if user is logged in before continuing any further
    // allow browser to receive images, css, and js files without being logged in
    // allow browser to receive some pages such as login.html, signup.html, etc. without being logged in
    app.use(function(req, res, next) {
        if (req.method != "GET") { // TODO: can this just be app.get then?
            return next();
        }

        let path = req.path;
        if (path.startsWith("/css/") || path.startsWith("/js/") || path.startsWith("/img/")) {
            return next();
        }

        let exceptions = ["/login", "/signup", "/fp", "/favicon.ico"];

        if (exceptions.indexOf(path) > -1) {
            return next();
        }

        if (req.url == "/void") {
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

    // load any file in /website/public (aka publicDir)
    app.use(express.static(publicDir));

    // use EJS as default view engine and specifies location of EJS files
    app.set("view engine", "ejs");
    //	router.set("views", require("path").join(__dirname, "/../website"));

    // import all modules that handle specific requests
    app.use(require("./views")(imports));
    app.use(require("./accounts")(imports, publicDir, profpicDir));
    app.use(require("./teams")(imports));
    app.use(require("./groups")(imports));
    app.use(require("./announcements")(imports));
    app.use(require("./chat")(imports));
    app.use(require("./drive")(imports));
    app.use(require("./events")(imports));
    app.use(require("./tasks")(imports));
    require("./sio")(imports); // TODO: does something have to be done with this?

    // send 404 message for any page that does not exist (IMPORTANT: The order for this does matter. Keep it at the end.)
    app.use("*", function(req, res) { // TODO: should this be get or use?
        util.send404(res);
    });

    return app;

};
