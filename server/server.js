var express = require('express'),
  http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('client-sessions');
publicDir = require("path").join(__dirname, "../website/public");
//schemas
var User = require('./schemas/User.js');
var Team = require('./schemas/Team.js');
var Subdivision = require('./schemas/Subdivision.js');

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

function createToken(size) {
  var token = "";
  for (var i = 0; i < size; i++) {
    var rand = Math.floor(Math.random() * 62);
    token += String.fromCharCode(rand + ((rand < 26) ? 97 : ((rand < 52) ? 39 : -4)));
  }
  return token;
}

function requireLogin(req, res, next) {
  if (!req.user) {
    res.end("fail");
  } else {
    next();
  }
}

function userNotFound(response) {
  response.writeHead(200, {
    "Content-Type": "text/plain"
  });
  response.end("User not found");
}

function subdivisionNotFound(response) {
  response.writeHead(200, {
    "Content-Type": "text/plain"
  });
  response.end("Subdivision not found");
}


String.prototype.contains = function(arg) {
  return this.indexOf(arg) > -1;
};

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Oops, something went wrong!');
});

app.use(bodyParser.json());
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
app.use(function(req, res, next) {
  if (req.method == "GET") {
    if (req.url.contains("/css") || req.url.contains("/js") || req.url.contains("/img")) {
      next();
    } else if (req.url == "/login.html") {
      next();
    } else if (req.url == "/signup.html") {
      next();
    } else if (req.url == "/void.html") {
      if (req.user) {
        if (req.user.teams.length > 0) {
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
app.use(express.static(publicDir));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/../website');

app.get("/", function(req, res) {
  fs.createReadStream("../website/public/index.html").pipe(res);
});
app.get("/u/:id", function(req, res) {
  User.findOne({
    id: req.params.id,
    teams: {
      "$in": req.user.teams
    }
  }, function(err, user) {
    if (err) {
      send404(res);
    } else {
      if (user) {
        res.render('user', user);
      } else {
        userNotFound(res);
      }
    }
  })
});
app.get("/s/:id", function(req, res) {
  var joined = false;
  Subdivision.findOne({
    id: req.params.id,
    team: {
      "$in": req.user.teams
    }
  }, function(err, subdivision) {
    if (err) {
      send404(res);
    } else {
      if (subdivision) {
        User.find({
          subdivisions: {
            $elemMatch: {
              id: subdivision.id,
              accepted: true
            }
          }
        }, function(err, users) {
          if (err) {
            send404(res);
          } else {
            if (subdivision.type == "private") {
              for (var i = 0; i < users.length; i++) {
                if (users[i].id == req.user.id) {
                  res.render('subdivision', {
                    name: subdivision.name,
                    type: subdivision.type,
                    team: subdivision.team,
                    joined: true,
                    members: users
                  });
                  break;
                }
              }
              res.end("nothing to see here.");
            } else if (subdivision.type == "public") {
              for (var i = 0; i < users.length; i++) {
                if (users[i].id == req.user.id) {
                  joined = true
                  break;
                }
              }

              res.render('subdivision', {
                name: subdivision.name,
                type: subdivision.type,
                team: subdivision.team,
                joined: joined,
                members: users
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

app.get('*', function(req, res) {
  send404(res);
});

app.post("/f/createUser", function(req, res) {
  User.find({
    $or: [{
      username: req.body.username
    }, {
      email: req.body.email
    }, {
      phone: req.body.phone
    }]
  }, function(err, users) { //see if user exists
    if (users.length != 0) {
      res.end("exists");
    } else {
      User.find({
        id: req.body.id
      }, function(err, users) { //see if id exists
        if (err) {
          console.error(err);
        }
        if (users.length == 0) {
          User.create({
            id: req.body.id,
            username: req.body.username,
            password: req.body.password,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            phone: req.body.phone
          }, function(err, user) {
            if (err) {
              res.end("fail");
              console.error(err);
            } else {
              console.log("User " + req.body.id + ", " + req.body.firstname + " " + req.body.lastname + " was saved!");
              res.end("success");
            }
          });
        } else {
          User.create({
            id: Math.floor(Math.random() * (100000000000 - 10000000000)) + 10000000000, //create new id
            username: req.body.username,
            password: req.body.password,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            phone: req.body.phone
          }, function(err, user) {
            if (err) {
              res.end("fail");
              console.error(err);
            } else {
              console.log("User " + req.body.id + ", " + req.body.firstname + " " + req.body.lastname + " was saved!");
              res.end("success");
            }
          });
        }
      })
    }
  });
});
app.post("/f/getUsersInTeam", function(req, res) {
  User.find({
    teams: req.body.team_id
  }, function(err, users) {
    if (err) {
      console.error(err);
      res.end("fail");
    } else {
      res.end(JSON.stringify(users));
    }
  })
});
app.post("/f/deleteUser", function(req, res) {
  User.findOneAndRemove({
    id: req.body.id
  }, function(err) {
    if (err) {
      res.end("fail");
      console.error(err);
    } else {
      console.log("User deleted");
      res.end("success");
    }
  });
});
app.post("/f/login", function(req, res) {
  User.findOne({
    username: req.body.username
  }, function(err, user) {
    if (user) {
      user.comparePassword(req.body.password, function(err, isMatch) {
        if (err) {
          console.error(err);
        } else {
          if (isMatch) {
            req.session.user = user;
            res.end(JSON.stringify(user));
          } else {
            res.end("inc/password");
          }
        }
      })
    } else {
      res.end("inc/username")
    }
  });
});
app.post("/f/logout", function(req, res) {
  req.session.reset();
  res.end("success");
});
app.post("/f/createTeam", function(req, res) {
  Team.create({
    id: req.body.id,
    name: req.body.name,
    number: req.body.number
  }, function(err, team) {
    if (err) {
      console.error(err);
      res.end("fail");
    } else {
      res.end("success");
    }
  });
});
app.post("/f/joinTeam", function(req, res) {
  Team.findOne({
    id: req.body.team_id
  }, function(err, team) {
    if (err) {
      console.error(err);
      res.end("fail");
    } else {
      if (team) {
        User.findOne({
          id: req.body.user_id
        }, function(err, user) {
          if (err) {
            console.error(err);
            res.end("fail")
          } else {
            user.teams.push(req.body.team_id);
            user.save(function(err) {
              if (err) {
                console.error(err);
                res.end("fail");
              } else {
                res.end("success");
              }
            });
          }
        });
      }
    }
  });
});
app.post("/f/createSubdivision", function(req, res) {
  Subdivision.create({
    id: Math.floor(Math.random() * (100000000000 - 10000000000)) + 10000000000,
    name: req.body.name,
    type: req.body.type,
    team: req.body.team_id
  }, function(err, subdivision) {
    if (err) {
      console.error(err);
      res.end("fail");
    } else {
      res.end(subdivision.id);
    }
  });
});
app.post("/f/inviteToSubdivision", function(req, res) {
  Subdivision.findOne({
    id: req.body.subdivision_id
  }, function(err, subdivision) {
    if (err) {
      console.error(err);
      res.end("fail");
    } else {
      if (subdivision) {
        User.findOne({
          id: req.body.user_id
        }, function(err, user) {
          if (err) {
            console.error(err);
            res.end("fail");
          } else {
            if (user) {
              user.subdivisions.push({
                id: req.body.subdivision_id,
                team: req.body.team_id,
                accepted: false
              });
              user.save(function(err) {
                if (err) {
                  console.error(err);
                  res.end("fail");
                } else {
                  res.end("success");
                }
              })
            } else {
              res.end("fail");
            }
          }
        });
      } else {
        res.end("fail");
      }
    }
  });
});
app.post("/f/getPublicSubdivisions", function(req, res) {
  Subdivision.find({team: req.body.team_id, type: "public"}, function(err, subdivisions) {
    if (err) {
      console.error(err);
      res.end("fail")
    } else {
      res.end(JSON.stringify(subdivisions));
    }
  })
});
app.post("/f/getAllSubdivisionsForUserInTeam", function(req, res) {
  var userSubdivisionIds = []
  for(var i = 0; i < req.user.subdivisions.length; i++){
    if(req.user.subdivisions[i].accepted == true){
      userSubdivisionIds.push(req.user.subdivisions[i].id);
    }
  }
  Subdivision.find({id: { "$in": userSubdivisionIds } }, function(err, subdivisions){
    res.end( JSON.stringify(subdivisions.map(function(subdivision) {return {name: subdivision.name, id: subdivision.id} })) );
  })
});

app.post("/f/loadSubdivisionInvitations", function(req, res) {
  var invitedSubdivisions = [];
  if(req.user.subdivisions.length > 0){
    for (var i = 0; i < req.user.subdivisions.length; i++) {
      if (req.user.subdivisions[i].accepted == false && req.user.subdivisions[i].team == req.body.team_id){
        Subdivision.findOne({id: req.user.subdivisions[i].id, team: req.body.team_id}, function(err, subdivision){
          if(err){
            console.error(err);
            res.end("fail");
          }else{
            if(subdivision){
              invitedSubdivisions.push({
                name: subdivision.name,
                id: subdivision.id
              });
            }
          }
        })
      }
      if(i == req.user.subdivisions.length - 1){
        setTimeout(function(){
          res.end(JSON.stringify(invitedSubdivisions));
        }, 100) //TODO: FIND A BETTER WAY TO DO THIS
      }
    }
  }else{
    res.end("[]");
  }
})
app.post("/f/acceptSubdivisionInvitation", function(req, res){
  User.update({id: req.user.id, 'subdivisions.id': req.body.subdivision_id}, {'$set': {
    'subdivisions.$.accepted': true
  }}, function(err){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      res.end("success");
    }
  });
});

var port = process.argv[2] || 8080;
app.listen(port);
console.log('server started on port %s', port);
