/**
 * The server for http://www.morteam.com
 * @author      Farbod Rafezy <rafezyfarbod@gmail.com>
 * @version     1.0.0-beta.4
 */

// wrap everything for the network
module.exports = function(app, networkSchemas) {

//import necessary modules
var http = require('http');
var fs = require('fs');
var mongoose = require('mongoose'); //MongoDB ODM
var ObjectId = mongoose.Types.ObjectId; //this is used to cast strings to MongoDB ObjectIds
var multer = require('multer'); //for file uploads

var config; // contains passwords and other sensitive info
if(fs.existsSync("config.json")) {
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

var util = require("./util.js")(); //contains functions and objects that are used across all the modules

publicDir = require("path").join(__dirname, "../website/public");
profpicDir = 'http://profilepics.morteam.com.s3.amazonaws.com/'

//connect to mongodb server
var db = mongoose.createConnection('mongodb://localhost:27017/' + config.dbName);

//import mongodb schemas
var schemas = {
  Subdivision: require('./schemas/Subdivision.js')(db),
  Announcement: require('./schemas/Announcement.js')(db),
  Chat: require('./schemas/Chat.js')(db),
  Event: require('./schemas/Event.js')(db),
  AttendanceHandler: require('./schemas/AttendanceHandler.js')(db),
  Folder: require('./schemas/Folder.js')(db),
  File: require('./schemas/File.js')(db),
  Task: require('./schemas/Task.js')(db),
};
// add network schemas
for(var key in networkSchemas) {
	schemas[key] = networkSchemas[key];
}

//assign variables to imported util functions(and objects) and database schemas (example: var myFunc = util.myFunc;)
for(key in util){
  eval("var " + key + " = util." + key + ";");
}
for(key in schemas){
  eval("var " + key + " = schemas." + key + ";");
}

//start server
console.log("MorTeam started");

//add .html to end of filename if it did not have it already
app.use(function(req, res, next) {
  if (req.path.indexOf('.') === -1) {
    var file = publicDir + req.path + '.html';
    fs.exists(file, function(exists) {
      if (exists)
        req.url += '.html';
      next();
    });
  } else
    next();
});

//check to see if user is logged in before continuing any further
//allow browser to receive images, css, and js files without being logged in
//allow browser to receive some pages such as login.html, signup.html, etc. without being logged in
app.use(function(req, res, next) {
  var exceptions = ["/login.html", "/signup.html", "/fp.html", "/favicon.ico"];
  if (req.method == "GET") {
    if (req.path.contains("/css/") || req.path.contains("/js/") || req.path.contains("/img/")) {
      next();
    } else if ( exceptions.indexOf(req.url) > -1 ) {
      next();
    } else if (req.url == "/void.html") {
      if (req.user) {
        if (req.user.teams.length > 0) {
          if(!req.user.current_team){
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

//load any file in /website/public (aka publicDir)
app.use(express.static(publicDir));

//use EJS as default view engine and specifies location of EJS files
app.set('view engine', 'ejs');
app.set('views', __dirname + '/../website');

//load homepage
app.get("/", function(req, res) {
  fs.createReadStream("../website/public/index.html").pipe(res);
});

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
app.get('*', function(req, res) {
  send404(res);
});


// end network wrapping
}
