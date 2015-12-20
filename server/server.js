//import necessary modules
var express = require('express');
var http = require('http');
var fs = require('fs');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var ObjectId = require('mongoose').Types.ObjectId;
var config = require("./config.json");
var util = require("./util.js")();
var multer = require('multer');

//create express application and define static directories
var app = express();
var publicDir = require("path").join(__dirname, "../website/public");
var profpicDir = 'http://profilepics.morteam.com.s3.amazonaws.com/'

//import mongodb schemas
var schemas = {
  User: require('./schemas/User.js'),
  Team: require('./schemas/Team.js'),
  Subdivision: require('./schemas/Subdivision.js'),
  Announcement: require('./schemas/Announcement.js'),
  Chat: require('./schemas/Chat.js'),
  Event: require('./schemas/Event.js'),
  AttendanceHandler: require('./schemas/AttendanceHandler.js'),
  Folder: require('./schemas/Folder.js'),
  File: require('./schemas/File.js'),
  Task: require('./schemas/Task.js'),
}

//assign variables for schemas for convenience
var User = schemas.User;
var Team = schemas.Team;
var Subdivision = schemas.Subdivision;
var Chat = schemas.Chat;
var File = schemas.File;

//assign variables for functions in util.js for convenience
var requireLogin = util.requireLogin;
var requireLeader = util.requireLeader;
var requireAdmin = util.requireAdmin;
var profPicBucket = util.profPicBucket;
var driveBucket = util.driveBucket;
var findTeamInUser = util.findTeamInUser;
var subdivisionNotFound = util.subdivisionNotFound;
var userNotFound = util.userNotFound;
var send404 = util.send404;

//connect to mongodb server
mongoose.connect('mongodb://localhost:27017/' + config.dbName);

//start server
var port = process.argv[2] || 80;
var io = require("socket.io").listen(app.listen(port));
console.log('server started on port %s', port);

//check for any errors in all requests
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Oops, something went wrong!');
});

//middleware to get request body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

//define session middleware
var sessionMiddleware = session({
  secret: config.sessionSecret,
  saveUninitialized: false,
  resave: false,
  store: new MongoStore({ mongooseConnection: mongoose.connection })
});

//can now use session info (cookies) with socket.io requests
io.use(function(socket, next){
  sessionMiddleware(socket.request, socket.request.res, next);
});
//can now use session info (cookies) with regular requests
app.use(sessionMiddleware);

//load user info from session cookie into req.user object for each request
app.use(function(req, res, next) {
  if (req.session && req.session.user) {
    User.findOne({
      username: req.session.user.username
    }, function(err, user) {
      if (user) {
        req.user = user;
        delete req.user.password;
        req.session.user = user;
      }
      next();
    });
  } else {
    next();
  }
});

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
  if (req.method == "GET") {
    if (req.url.contains("/css") || req.url.contains("/js") || req.url.contains("/img")) {
      next();
    } else if (req.url == "/login.html") {
      next();
    } else if (req.url == "/signup.html") {
      next();
    } else if (req.url == "/fp.html") {
      next();
    } else if (req.url == "/favicon.ico") {
      next();
    } else if (req.url == "/void.html") {
      if (req.user) {
        if (req.user.teams.length > 0) {
          res.redirect("/");
        } else { //TODO: In the future, add an else if(current_team is undefined) res.redirect
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

//use EJS as view engine and specifies location of EJS files
app.set('view engine', 'ejs');
app.set('views', __dirname + '/../website');

//load homepage
app.get("/", function(req, res) {
  fs.createReadStream("../website/public/index.html").pipe(res);
});

//load user profile page
app.get("/u/:id", function(req, res) {
  User.findOne({
    _id: req.params.id,
    teams: {$elemMatch: {'id': req.user.current_team.id }}
  }, function(err, user) {
    if (err) {
      send404(res);
    } else {
      if (user) {
        res.render('user', {
          firstname: user.firstname,
          lastname: user.lastname,
          _id: user._id,
          email: user.email,
          phone: user.phone,
          profpicpath: user.profpicpath,
          viewedUserPosition: findTeamInUser(user, req.user.current_team.id).position,
          viewerUserPosition: req.user.current_team.position,
          viewerUserId: req.user._id
        });
      } else {
        userNotFound(res);
      }
    }
  })
});

//load subdivision page
app.get("/s/:id", function(req, res) {
  var joined = false;
  Subdivision.findOne({
    _id: req.params.id,
    team: req.user.current_team.id
  }, function(err, subdivision) {
    if (err) {
      send404(res);
    } else {
      if (subdivision) {
        User.find({
          subdivisions: {
            $elemMatch: {
              _id: subdivision._id, //TODO: maybe add toString
              accepted: true
            }
          }
        }, function(err, users) {
          if (err) {
            send404(res);
          } else {
            if (subdivision.type == "private") {
              for (var i = 0; i < users.length; i++) {
                if (users[i]._id.toString() == req.user._id) {
                  res.render('subdivision', {
                    name: subdivision.name,
                    type: subdivision.type,
                    team: subdivision.team, //TODO: POSSIBLY CHANGE TO subdivision.team._id
                    admin: req.user.current_team.position=="admin",
                    joined: true,
                    members: users,
                    current_user_id: req.user._id
                  });
                  break;
                }
              }
              res.end("nothing to see here.");
            } else if (subdivision.type == "public") {
              for (var i = 0; i < users.length; i++) {
                if (users[i]._id.toString() == req.user._id.toString()) {
                  joined = true
                  break;
                }
              }

              res.render('subdivision', {
                name: subdivision.name,
                type: subdivision.type,
                team: subdivision.team, //TODO: POSSIBLY CHANGE TO subdivision.team._id
                admin: req.user.current_team.position=="admin",
                joined: joined,
                members: users,
                current_user_id: req.user._id
              });
            }
          }
        })
      } else {
        subdivisionNotFound(res);
      }
    }
  })
});

//load default profile picture
app.get("/images/user.jpg-60", function(req, res){
  res.sendFile(publicDir+"/images/user.jpg");
});
app.get("/images/user.jpg-300", function(req, res){
  res.sendFile(publicDir+"/images/user.jpg");
});

//load user profile picture from AWS S3
app.get('/pp/:path', function(req, res){
  res.redirect(profpicDir+req.params.path);
});

//load any file from drive
app.get('/file/:fileId', requireLogin, function(req, res){
  var userSubdivisionIds = req.user.subdivisions.map(function(subdivision) {
    if (subdivision.accepted == true) {
      return new ObjectId(subdivision._id);
    }
  });
  if(req.params.fileId.indexOf("-preview") == -1){
    File.findOne({_id: req.params.fileId}).populate('folder').exec(function(err, file){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        if(file){
          if( (file.folder.team == req.user.current_team.id && file.folder.entireTeam) || file.folder.userMembers.indexOf(req.user._id)>-1 || file.folder.subdivisionMembers.hasAnythingFrom(userSubdivisionIds) ){
            driveBucket.getSignedUrl('getObject', { Key: req.params.fileId, Expires: 60 }, function (err, url) {
              if(err){
                console.error(err);
                res.end("fail");
              }else{
                res.redirect(url);
              }
            });
          }else{
            res.end("restricted");
          }
        }else{
          res.end("fail");
        }
      }
    });
  }else{
    driveBucket.getSignedUrl('getObject', { Key: req.params.fileId, Expires: 60 }, function (err, url) {
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.redirect(url);
      }
    });
  }
});

//load team page
app.get('/team', requireLogin, function(req, res){
  User.find({ teams: { $elemMatch: { id: req.user.current_team.id } } }, '-password', function(err, users){
    Team.findOne({id: req.user.current_team.id}, function(err, team){
      res.render('team', {
        teamName: team.name,
        teamNum: team.number,
        teamId: team.id,
        members: users,
        viewerIsAdmin: req.user.current_team.position=="admin",
      });
    });
  });
});

//send 404 message for any page that does not exist
app.get('*', function(req, res) {
  send404(res);
});

//import all modules that handle specific post requests
require("./accounts.js")(app, util, schemas);
require("./teams.js")(app, util, schemas);
require("./subdivisions.js")(app, util, schemas);
require("./announcements.js")(app, util, schemas);
require("./chat.js")(app, util, schemas);
require("./drive.js")(app, util, schemas);
require("./events.js")(app, util, schemas);
require("./tasks.js")(app, util, schemas);

//socket.io stuffs
var online_clients = {};
io.on('connection', function(socket){
  var sess = socket.request.session.user;
  if(sess && online_clients[sess._id] == undefined){
    var userSubdivisionIds = sess.subdivisions.map(function(subdivision) {
      if (subdivision.accepted == true) {
        return new ObjectId(subdivision._id);
      }
    });
    Chat.find({
      team: sess.current_team.id,
      $or: [
        {
          userMembers: new ObjectId(sess._id)
        },
        {
          subdivisionMembers: {
            "$in": userSubdivisionIds
          }
        }
      ]
    },
    {
      _id: 1
    }).exec(function(err, chats){

      if(err){
        console.error(err);
        res.end("fail");
      }else{
        var chatIds = chats.map(function(chat){ return chat._id.toString() });
        online_clients[sess._id] = {socket: socket.id, chats: chatIds};
        for( var user_id in online_clients ){
          if( online_clients[user_id].chats.hasAnythingFrom( online_clients[sess._id].chats ) && user_id != sess._id  ){
            io.to( online_clients[user_id].socket ).emit("joined", {_id: sess._id});
          }
        }
      }
    })
  }else{
    for( var user_id in online_clients ){
      if( online_clients[user_id].chats.hasAnythingFrom( online_clients[sess._id].chats ) && user_id != sess._id  ){
        io.to( online_clients[user_id].socket ).emit("joined", {_id: sess._id});
      }
    }
  }

  socket.on("disconnect", function(){
    for( var user_id in online_clients ){
      if(sess && online_clients[sess._id]){ //TODO: sometimes online_clients[sess._id] doesnt exist (maybe because it takes time for the mongo query to execute and add user chats to the online_clients object at the sess._id index)
        if( online_clients[user_id].chats.hasAnythingFrom( online_clients[sess._id].chats ) && user_id != sess._id  ){
          io.to( online_clients[user_id].socket ).emit("left", {_id: sess._id});
        }
      }
    }
    if(sess){
      delete online_clients[sess._id];
    }
  })
  socket.on('message', function(msg){
      for( var user_id in online_clients ){
        var client_chats = online_clients[user_id].chats.map(function(chat_id){
          return chat_id.toString();
        })
        if( ~client_chats.indexOf( msg.chat_id ) && user_id != sess._id ){
          if(msg.type == "private"){
            io.to( online_clients[user_id].socket ).emit("message", {
              chat_id: msg.chat_id,
              author_id: sess._id,
              author_fn: sess.firstname,
              author_ln: sess.lastname,
              author_profpicpath: sess.profpicpath,
              content: msg.content,
              timestamp: new Date(),
              type: "private"
            });
          }else{
            io.to( online_clients[user_id].socket ).emit("message", {
              chat_id: msg.chat_id,
              author_id: sess._id,
              author_fn: sess.firstname,
              author_ln: sess.lastname,
              author_profpicpath: sess.profpicpath,
              content: msg.content,
              timestamp: new Date(),
              chat_name: msg.chat_name,
              type: "group"
            });
          }
        }
      }
  })

  socket.on('get clients', function(){
    socket.emit('get clients', online_clients)
  })
  socket.on('new chat', function(data){
    if(data.type == "private"){
      if( online_clients[data.receiver] ){
        online_clients[data.receiver].chats.push( data.chat_id );
        io.to( online_clients[ data.receiver ].socket ).emit('new chat', {
          type: "private",
          chat_id: data.chat_id,
          user_id: sess._id,
          firstname: sess.firstname,
          lastname: sess.lastname,
          profpicpath: sess.profpicpath
        });
      }
    }else if (data.type == "group") {
      User.find({
        $or: [
          {
            _id: { "$in": data.userMembers }
          },
          {
            subdivisions: { $elemMatch: { _id: {"$in": data.subdivisionMembers} } }
          }
        ]
      }, function(err, users){
        if(err){
          console.error(err);
          res.end("fail");
        }else{
          for(var i = 0; i < users.length; i++){
            if( online_clients[ users[i]._id.toString() ] != undefined ){
              online_clients[users[i]._id.toString()].chats.push( data.chat_id );
              io.to( online_clients[ users[i]._id.toString() ].socket ).emit('new chat', {
                type: "group",
                user_id: sess._id,
                userMembers: data.userMembers,
                subdivisionMembers: data.subdivisionMembers,
                name: data.name,
                chat_id: data.chat_id
              })
            }
          }
        }
      });
    }
  })
  socket.on('start typing', function(data){
    for( var user_id in online_clients ){
      if( ~online_clients[user_id].chats.indexOf( data.chat_id ) && user_id != sess._id ){
        io.to( online_clients[user_id].socket ).emit('start typing', data)
      }
    }
  })
  socket.on('stop typing', function(data){
    for( var user_id in online_clients ){
      if( ~online_clients[user_id].chats.indexOf( data.chat_id ) && user_id != sess._id ){
        io.to( online_clients[user_id].socket ).emit('stop typing', data)
      }
    }
  })
});
