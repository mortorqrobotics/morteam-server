"use strict";

/**
 * The server for http://www.morteam.com
 * @author      Farbod Rafezy <rafezyfarbod@gmail.com>
 * @version     1.0.0-beta.4
 */

// wrap everything for the network
module.exports = function(app, networkSchemas, io, mongoose) {

//import necessary modules
let express = require("express");
let http = require("http");
let fs = require("fs");
let ObjectId = mongoose.Types.ObjectId; //this is used to cast strings to MongoDB ObjectIds
let multer = require("multer"); //for file uploads

let config; // contains passwords and other sensitive info
if (fs.existsSync("config.json")) {
	config = require("./config.json");
}
else {
	config = {
		"mailgunUser": "user@morteam.com",
		"malgunPass": "password",
		"dbName": "morteam"
	};
	fs.writeFileSync("config.json", JSON.stringify(config, null, "\t"));
	console.log("Generated default config.json");
}

let util = require("./util.js")(); //contains functions and objects that are used across all the modules

let publicDir = require("path").join(__dirname, "../website/public");
let profpicDir = "http://profilepics.morteam.com.s3.amazonaws.com/"

//connect to mongodb server
// let db = mongoose.createConnection("mongodb://localhost:27017/" + config.dbName);
// let db = networkDb.useDb(config.dbName);

let db = mongoose;
//import mongodb schemas
let schemas = {
	Announcement: require("./schemas/Announcement.js")(db),
	Chat: require("./schemas/Chat.js")(db),
	Event: require("./schemas/Event.js")(db),
	AttendanceHandler: require("./schemas/AttendanceHandler.js")(db),
	Folder: require("./schemas/Folder.js")(db),
	File: require("./schemas/File.js")(db),
	Task: require("./schemas/Task.js")(db),
};
// add network schemas
for (let key in networkSchemas) {
	schemas[key] = networkSchemas[key];
}

//assign variables to imported util functions(and objects) and database schemas (example: let myFunc = util.myFunc;)
for (key in util) {
	eval("var " + key + " = util." + key + ";");
}
for (key in schemas) {
	eval("var " + key + " = schemas." + key + ";");
}

//start server
console.log("MorTeam started");

//add .html to end of filename if it did not have it already
app.use(function(req, res, next) {
	if (req.path.indexOf(".") === -1) {
		let file = publicDir + req.path + ".html";
		fs.exists(file, function(exists) {
			if (exists) {
			req.path += ".html";
			if (req.url.contains("?")) {
			let index = req.url.indexOf("?");
			req.url = req.url.slice(0, index) + ".html" + req.url.slice(index);
		}
		else {
			req.url += ".html";
		}
		}
			next();
		});
	} else
		next();
});

//check to see if user is logged in before continuing any further
//allow browser to receive images, css, and js files without being logged in
//allow browser to receive some pages such as login.html, signup.html, etc. without being logged in
app.use(function(req, res, next) {
	let exceptions = ["/login.html", "/signup.html", "/fp.html", "/favicon.ico"];
	if (req.method == "GET") {
		if (req.path.contains("/css/") || req.path.contains("/js/") || req.path.contains("/img/")) {
			next();
	} else if ( exceptions.indexOf(req.path) > -1 ) {
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

//load homepage
app.get("/", function(req, res, next) {
	fs.createReadStream(publicDir + "/index.html").pipe(res);
});

//load any file in /website/public (aka publicDir)
app.use(express.static(publicDir));

//use EJS as default view engine and specifies location of EJS files
app.set("view engine", "ejs");
app.set("views", __dirname + "/../website");

//import all modules that handle specific GET and POST requests
require("./accounts.js")(app, util, schemas);
require("./teams.js")(app, util, schemas);
require("./subdivisions.js")(app, util, schemas);
require("./announcements.js")(app, util, schemas);
require("./chat.js")(app, util, schemas);
require("./drive.js")(app, util, schemas);
require("./events.js")(app, util, schemas);
require("./tasks.js")(app, util, schemas);
require("./sio.js")(io, util, schemas);

//send 404 message for any page that does not exist (IMPORTANT: The order for this does matter. Keep it at the end.)
app.get("*", function(req, res) {
	send404(res);
});


// end network wrapping
}
