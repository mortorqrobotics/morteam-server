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
		let path = req.path;
		let exceptions = ["/login", "/signup", "/fp", "/favicon.ico"];
		if (req.method == "GET") {
			if (path.startsWith("/css/") || path.startsWith("/js/") || path.startsWith("/img/")) {
				next();
			} else if ( exceptions.indexOf(path) > -1 ) {
				next();
			} else if (req.url == "/void") {
				if (req.user) {
					if (req.user.teams.length > 0) {
						if (!req.user.current_team) {
							req.session.user.current_team.id = req.user.teams[0].id;
							req.session.user.current_team.position = req.user.teams[0].position;
							req.user.current_team.id = req.user.teams[0].id;
							req.user.current_team.position = req.user.teams[0].position;
						}
						res.redirect("/");
					} else {
						next();
					}
				} else {
					res.redirect("/");
				}
			} else {
				if (req.user) {
					if (req.user.teams.length > 0) {
						next();
					} else {
						res.redirect("/void");
					}
				} else {
					res.redirect("/login");
				}
			}
		} else {
			next();
		}
	});

	// load any file in /website/public (aka publicDir)
	app.use(express.static(publicDir));

	// use EJS as default view engine and specifies location of EJS files
	app.set("view engine", "ejs");
//	router.set("views", require("path").join(__dirname, "/../website"));

	// import all modules that handle specific requests
	app.use(require("./views.js")(imports));
	app.use(require("./accounts.js")(imports, publicDir, profpicDir));
	app.use(require("./teams.js")(imports));
	app.use(require("./subdivisions.js")(imports));
	app.use(require("./announcements.js")(imports));
	app.use(require("./chat.js")(imports));
	app.use(require("./drive.js")(imports));
	app.use(require("./events.js")(imports));
	app.use(require("./tasks.js")(imports));
	require("./sio.js")(imports); // TODO: does something have to be done with this?

	// send 404 message for any page that does not exist (IMPORTANT: The order for this does matter. Keep it at the end.)
	app.use("*", function(req, res) { // TODO: should this be get or use?
		util.send404(res);
	});

	return app;

};
