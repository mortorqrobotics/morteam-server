var express = require('express'),
    http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var bodyParser = require('body-parser')
var mongoose = require('mongoose');
var session = require('client-sessions');
//schemas
var User = require('./schemas/User.js');
var Team = require('./schemas/Team.js');

app = express();

mongoose.connect('mongodb://localhost:27017/expressiment');

function send404(response) {
  response.writeHead(404, {
    "Content-Type": "text/plain"
  });
  response.end("404: Page Not Found");
}
function parseJSON(str) {
  try {
    return JSON.parse(String(str));
  } catch (ex) {}
}
function getToken(size) {
	var token = "";
	for(var i = 0; i < size; i++) {
		var rand = Math.floor(Math.random() * 62);
		token += String.fromCharCode(rand + ((rand < 26) ? 97 : ((rand < 52) ? 39 : -4)));
	}
	return token;
}
function requireLogin (req, res, next) {
  if (!req.user) {
    res.end("fail");
  } else {
    next();
  }
};

//for parsing bodies ;)
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(session({
  cookieName: 'session',
  secret: 'temporary_secret',
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
  cookie: {
    ephemeral: true,
    httpOnly: true
  }
}));
app.use(function(req, res, next) {
  if (req.session && req.session.user) {
    User.findOne({ username: req.session.user.username }, function(err, user) {
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

app.use(function(request, response, next) {
  var requrl = url.parse(request.url).pathname;
  var query = url.parse(request.url).query;
  var get = qs.parse(query);

  if (requrl.indexOf("/f/") == -1) {
    if(request.method == "GET" && (requrl == "/login" || requrl == "/login.html")){
      fs.createReadStream("../website/login.html").pipe(response);
    }else if(request.method == "GET" && (requrl == "/signup" || requrl == "/signup.html")){
      fs.createReadStream("../website/signup.html").pipe(response);
    }else if(request.method == "GET" && (requrl == "/void" || requrl == "/void.html")){
      if(request.user.teams.length != 0){
        response.redirect("/");
      }else{
        fs.createReadStream("../website/void.html").pipe(response);
      }
    }else{
      if(request.user){
        if (request.method == "GET" && request.user.teams.length == 0){
          fs.createReadStream("../website/void.html").pipe(response);
        }else{
          if (request.method == "GET" && requrl == "/") {
            fs.createReadStream("../website/index.html").pipe(response);
          } else {
            if (requrl.indexOf(".") > -1) {
              fs.readFile("../website" + requrl, function(error, data) {
                if (error) {
                  send404(response);
                } else {
                  response.end(data);
                }
              });
            } else {
              fs.readFile("../website" + requrl + ".html", function(error, data) {
                if (error) {
                  send404(response);
                } else {
                  response.end(data);
                }
              });
            }
          }
        }
      }else{
        response.redirect("/login");
      }
    }
  }else{
    next();
  }
});

app.post("/f/createUser", function(req, res){
  User.find( { $or: [ { username: req.body.username }, { email: req.body.email }, { phone: req.body.phone } ] }, function(err, users){ //see if user exists
    if( users.length != 0 ){
      res.end("exists");
    }else{
      User.find({id: req.body.id}, function(err, users){ //see if id exists
        if (err) {
          console.error(err);
        }
        if(users.length == 0){
          User.create({
            id: req.body.id,
            username: req.body.username,
            password: req.body.password,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            phone: req.body.phone
          }, function(err, user) {
            if(err){
              res.end("fail");
              console.error(err);
            }else{
              console.log("User " + req.body.id + ", " + req.body.firstname + " " + req.body.lastname + " was saved!");
              res.end("success");
            }
          });
        }else{
          User.create({
            id: Math.floor(Math.random() * (100000000000 - 10000000000)) + 10000000000, //create new id
            username: req.body.username,
            password: req.body.password,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            phone: req.body.phone
          }, function(err, user) {
            if(err){
              res.end("fail");
              console.error(err);
            }else{
              console.log("User " + req.body.id + ", " + req.body.firstname + " " + req.body.lastname + " was saved!");
              res.end("success");
            }
          });
        }
      })
    }
  });
});
app.post("/f/getUsersInTeam", function(req, res){
  User.find({teams: {$elemMatch: {id: req.body.team_id}}}, function(err, users) {
    if(err){
      res.end("fail");
      console.error(err);
    }else{
      res.end(JSON.stringify(users));
    }
  })
});
app.post("/f/deleteUser", function(req, res){
  User.findOneAndRemove({id: req.body.id}, function(err){
    if(err){
      res.end("fail");
      console.error(err);
    }else{
      console.log("User deleted");
      res.end("success");
    }
  });
});
app.post("/f/login", function(req, res){
  User.findOne({username: req.body.username}, function(err, user){
    if(user){
      user.comparePassword(req.body.password, function(err, isMatch){
        if(err){
          console.error(err);
        }else{
          if(isMatch){
            req.session.user = user;
            res.end(JSON.stringify(user));
          }else{
            res.end("inc/password");
          }
        }
      })
    }else{
      res.end("inc/username")
    }
  });
});
app.post("/f/logout", function(req, res){
  req.session.reset();
  res.end("success");
});
app.post("/f/createTeam", function(req, res){
  Team.create({
    id: req.body.id,
    name: req.body.name,
    number: req.body.number
  }, function(err, user){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      res.end("success");
    }
  });
});
app.post("/f/joinTeam", function(req, res){
  User.findOne({id: req.body.user_id}, function(err, user){
    if(err){
      console.error(err);
      res.end("fail")
    }else{
      user.teams.push({id: req.body.team_id, subdivisions:[]});
      user.save(function(err){
        if(err){
          console.error(err);
          res.end("fail");
        }else{
          res.end("success");
        }
      })
    }
  })
});

var port = process.argv[2] || 8080;
app.listen(port);
console.log('server started on port %s', port);
