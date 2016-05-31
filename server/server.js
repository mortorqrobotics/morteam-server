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
	let http = require("http");
	let fs = require("fs");
	let mongoose = imports.modules.mongoose;
	let ObjectId = mongoose.Types.ObjectId; // this is used to cast strings to MongoDB ObjectIds
	let multer = imports.modules.multer; // for file uploads
	let lwip = imports.modules.lwip;
	let Promise = imports.modules.Promise;
	let util = imports.util;
	let requireLogin = util.requireLogin;

	Promise.promisifyAll(util);
//	Promise.promisifyAll(lwip);
	Promise.promisifyAll(fs);

	let config; // contains passwords and other sensitive info
	let configPath = require("path").join(__dirname, "config.json")
	if (fs.existsSync(configPath)) {
		config = require("./config.json");
	} else {
		config = {
			"mailgunUser": "user@morteam.com",
			"malgunPass": "password",
			"dbName": "morteam"
		};
		fs.writeFileSync(configPath, JSON.stringify(config, null, "\t"));
		console.log("Generated default config.json");
	}


	const publicDir = require("path").join(__dirname, "../website/public");
	const profpicDir = "http://profilepics.morteam.com.s3.amazonaws.com/"

	console.log("MorTeam started");

	// define the main router passed to mornetwork
	let router = express.Router();

	// add .html to end of filename if it did not have it already
	router.use(function(req, res, next) {
		req.filePath = req.path;
		if (req.method.toUpperCase() == "GET" && req.path.indexOf(".") === -1) {
			let file = publicDir + req.path + ".html";
			fs.exists(file, function(exists) {
				if (exists) {
					req.filePath += ".html";
					if (req.url.contains("?")) {
						let index = req.url.indexOf("?");
						req.url = req.url.slice(0, index) + ".html" + req.url.slice(index);
					} else {
						req.url += ".html";
					}
				}
				next();
			});
		} else {
			next();
		}
	});

	// check to see if user is logged in before continuing any further
	// allow browser to receive images, css, and js files without being logged in
	// allow browser to receive some pages such as login.html, signup.html, etc. without being logged in
	router.use(function(req, res, next) {
		let path = req.filePath;
		let exceptions = ["/login.html", "/signup.html", "/fp.html", "/favicon.ico"];
		if (req.method == "GET") {
			if (path.contains("/css/") || path.contains("/js/") || path.contains("/img/")) {
				next();
			} else if ( exceptions.indexOf(path) > -1 ) {
				next();
			} else if (req.url == "/void.html") {
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

	// load homepage
	router.get("/", function(req, res, next) {
		fs.createReadStream(publicDir + "/index.html").pipe(res);
	});

	// load any file in /website/public (aka publicDir)
	router.use(express.static(publicDir));

	// use EJS as default view engine and specifies location of EJS files
//	router.set("view engine", "ejs");
//	router.set("views", require("path").join(__dirname, "/../website"));

	// import all modules that handle specific requests
	router.use(require("./accounts.js")(imports, publicDir, profpicDir));
	router.use(require("./teams.js")(imports));
	router.use(require("./subdivisions.js")(imports));
	router.use(require("./announcements.js")(imports));
	router.use(require("./chat.js")(imports));
	router.use(require("./drive.js")(imports));
	router.use(require("./events.js")(imports));
	router.use(require("./tasks.js")(imports));
	require("./sio.js")(imports); // TODO: does something have to be done with this?

	// send 404 message for any page that does not exist (IMPORTANT: The order for this does matter. Keep it at the end.)
	router.use("*", function(req, res) { // TODO: should this be get or use?
		util.send404(res);
	});

	return router;

}
