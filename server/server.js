var express = require('express'),
  http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('client-sessions');
var nodemailer = require('nodemailer');
publicDir = require("path").join(__dirname, "../website/public");
//schemas
var User = require('./schemas/User.js');
var Team = require('./schemas/Team.js');
var Subdivision = require('./schemas/Subdivision.js');
var Announcement = require('./schemas/Announcement.js');

app = express();

mongoose.connect('mongodb://localhost:27017/morteam3');

var transporter = nodemailer.createTransport();

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

String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
}

function findTeamInUser(user, teamId){
  for(var i = 0; i < user.teams.length; i++){
    if(user.teams[i].id == teamId){
      return user.teams[i];
    }
  }
}

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
    teams: {$elemMatch: {'id': req.user.current_team.id }}
  }, function(err, user) {
    if (err) {
      send404(res);
    } else {
      if (user) {
        res.render('user', {
          firstname: user.firstname,
          lastname: user.lastname,
          id: user.id,
          email: user.email,
          phone: user.phone,
          viewedUserPosition: findTeamInUser(user, req.user.current_team.id).position,
          viewerUserPosition: req.user.current_team.position
        });
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
    team: req.user.current_team.id
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
                    admin: req.user.current_team.position=="admin",
                    joined: true,
                    members: users,
                    current_user_id: req.user.id
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
                admin: req.user.current_team.position=="admin",
                joined: joined,
                members: users,
                current_user_id: req.user.id
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
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      if(users){
        if (users.length != 0) {
          res.end("exists");
        } else {
          User.find({
            id: req.body.id
          }, function(err, users) { //see if id exists
            if (err) {
              console.error(err);
              res.end("fail");
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
      }
    }
  });
});
app.post("/f/getUsersInTeam", requireLogin, function(req, res) {
  User.find({
    teams: {$elemMatch: {id: req.user.current_team.id }}
  }, function(err, users) {
    if (err) {
      console.error(err);
      res.end("fail");
    } else {
      res.end(JSON.stringify(users));
    }
  })
});
app.post("/f/deleteUser", requireLogin, function(req, res) {
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
app.post("/f/logout", requireLogin, function(req, res) {
  req.session.reset();
  res.end("success");
});
app.post("/f/createTeam", requireLogin, function(req, res) {
  Team.find({id: req.body.id}, function(err, teams){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      if(teams.length == 0){
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
      }else{
        res.end("fail");
      }
    }
  });
});
app.post("/f/joinTeam", requireLogin, function(req, res) {
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
            if(user){
              if(user.teams.length > 0){
                User.find({teams: {$elemMatch: {"id": req.body.team_id} } }, function(err, users){
                  if(err){
                    console.error(err);
                    res.end("fail");
                  }else{
                    if(users.length > 0){
                      user.teams.push({id: req.body.team_id, position: "member"});
                    }else{
                      user.teams.push({id: req.body.team_id, position: "admin"});
                    }
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
              }else{
                User.find({teams: {$elemMatch: {"id": req.body.team_id} } }, function(err, users){
                  if(err){
                    console.error(err);
                    res.end("fail");
                  }else{
                    if(users.length > 0){
                      user.teams.push({id: req.body.team_id, position: "member"});
                      user.current_team = {id: req.body.team_id, position: "member"};
                    }else{
                      user.teams.push({id: req.body.team_id, position: "admin"});
                      user.current_team = {id: req.body.team_id, position: "admin"};
                    }
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
          }
        });
      }
    }
  });
});
app.post("/f/createSubdivision", requireLogin, function(req, res) {
  Subdivision.create({
    id: Math.floor(Math.random() * (100000000000 - 10000000000)) + 10000000000,
    name: req.body.name,
    type: req.body.type,
    team: req.user.current_team.id
  }, function(err, subdivision) {
    if (err) {
      console.error(err);
      res.end("fail");
    } else {
      res.end(subdivision.id);
    }
  });
});
app.post("/f/inviteToSubdivision", requireLogin, function(req, res) {
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
                team: req.user.current_team.id, //P
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
app.post("/f/getPublicSubdivisions", requireLogin, function(req, res) {
  Subdivision.find({team: req.user.current_team.id, type: "public"}, function(err, subdivisions) {
    if (err) {
      console.error(err);
      res.end("fail")
    } else {
      res.end(JSON.stringify(subdivisions));
    }
  })
});
app.post("/f/getAllSubdivisionsForUserInTeam", requireLogin, function(req, res) {
  var userSubdivisionIds = []
  for(var i = 0; i < req.user.subdivisions.length; i++){
    if(req.user.subdivisions[i].accepted == true && req.user.subdivisions[i].team == req.user.current_team.id){
      userSubdivisionIds.push(req.user.subdivisions[i].id);
    }
  }
  Subdivision.find({id: { "$in": userSubdivisionIds }, team: req.user.current_team.id }, function(err, subdivisions){
    res.end( JSON.stringify(subdivisions.map(function(subdivision) {return {name: subdivision.name, id: subdivision.id} })) );
  })
});

app.post("/f/loadSubdivisionInvitations", requireLogin, function(req, res) {
  var invitedSubdivisions = [];
  if(req.user.subdivisions.length > 0){
    for (var i = 0; i < req.user.subdivisions.length; i++) {
      if (req.user.subdivisions[i].accepted == false && req.user.subdivisions[i].team == req.user.current_team.id){
        invitedSubdivisions.push(req.user.subdivisions[i].id);
      }
    }
    Subdivision.find({id: { "$in": invitedSubdivisions }, team: req.user.current_team.id}, function(err, subdivisions){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        if(subdivisions){
          res.end(JSON.stringify(subdivisions));
        }else{
          res.end("fail");
        }
      }
    })
  }else{
    res.end("[]");
  }
})
app.post("/f/acceptSubdivisionInvitation", requireLogin, function(req, res){
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
app.post("/f/joinPublicSubdivision", requireLogin, function(req, res){
  User.update({id: req.user.id}, {'$pull': {
    'subdivisions': {id: req.body.subdivision_id, team: req.user.current_team.id, accepted: false}
  }}, function(err){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      User.update({id: req.user.id}, {'$push': {
        'subdivisions': {id: req.body.subdivision_id, team: req.user.current_team.id, accepted: true}
      }}, function(err){
        if(err){
          console.error(err);
          res.end("fail");
        }else{
          res.end("success");
        }
      });
    }
  });
})
app.post("/f/ignoreSubdivisionInvite", requireLogin, function(req, res){
  User.update({id: req.user.id}, {'$pull': {
    'subdivisions': {id: req.body.subdivision_id, team: req.user.current_team.id}
  }}, function(err, model){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      res.end("success");
    }
  });
})
app.post("/f/leaveSubdivision", requireLogin, function(req, res){
  User.update({id: req.user.id}, {'$pull': {
    'subdivisions': {id: req.body.subdivision_id, team: req.user.current_team.id}
  }}, function(err, model){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      res.end("success");
    }
  });
})
app.post("/f/deleteSubdivision", requireLogin, function(req, res){
  User.findOne({id: req.user.id}, function(err, user){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      if(user){
        if(req.user.current_team.position == "admin"){
          Subdivision.findOneAndRemove({id: req.body.subdivision_id, team: req.user.current_team.id}, function(err){
            if(err){
              console.error(err);
              res.end("fail");
            }else{
              // User.update( {team: req.body.team_id, subdivisions: {$elemMatch: {id: req.body.subdivision_id, team: req.body.team_id}} }, {'$pull': {
              //   'subdivisions': {id: req.body.subdivision_id, team: req.body.team_id, accepted: true}
              // }}, function(err, model){
              //   if(err){
              //     console.error(err);
              //     res.end("fail");
              //   }else{
              //     console.log(model);
              //     res.end("success");
              //   }
              // });

              User.update( {team: req.user.current_team.id}, {'$pull': { //TODO: FIX THIS, it wont remove subdivision from user
                'subdivisions': {id: req.body.subdivision_id, team: req.user.current_team.id, accepted: true}
              }}, function(err, model){
                if(err){
                  console.error(err);
                  res.end("fail");
                }else{
                  console.log(model);
                  res.end("success");
                }
              });

            }
          });
        }else{
          transporter.sendMail({
              from: 'rafezyfarbod@gmail.com',
              to: 'rafezyfarbod@gmail.com',
              subject: 'Security Alert!',
              text: 'The user ' + req.user.firstname + req.user.lastname + ' tried to perform administrator tasks. User ID: ' + req.user.id
          });
          res.end("hax");
        }
      }
    }
  })
})
app.post("/f/removeUserFromSubdivision", requireLogin, function(req, res){
  if(req.user.current_team.position == "admin"){
    User.update({id: req.body.user_id, teams: { $elemMatch: { "id": req.user.current_team.id } } }, { "$pull": {
      'subdivisions' : {id: req.body.subdivision_id, team: req.user.current_team.id, accepted: true}
    }}, function(err, model){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.end("success")
      }
    });
  }else{
    transporter.sendMail({
        from: 'rafezyfarbod@gmail.com',
        to: 'rafezyfarbod@gmail.com',
        subject: 'Security Alert!',
        text: 'The user ' + req.user.firstname + req.user.lastname + ' tried to perform administrator tasks. User ID: ' + req.user.id
    });
    res.end("hax");
  }
});
app.post("/f/changePosition", requireLogin, function(req, res){
  var positionHA = {
    "member": 0,
    "leader": 1,
    "admin": 2
  }
  var current_position;
  User.findOne({id: req.body.user_id}, function(err, user){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      if(user){
        current_position = findTeamInUser(user, req.user.current_team.id).position;
        if( positionHA[req.user.current_team.position] >= positionHA[req.body.target_position] && positionHA[req.user.current_team.position] >= positionHA[current_position] ){
          User.update({id: req.body.user_id, 'teams.id': req.user.current_team.id}, {'$set': {
            'teams.$.position': req.body.target_position, //P (find out what .$. means and if it means selected "teams" element then keep it like this)
            'current_team.position': req.body.target_position //P (make sure in the future current_team.position is checked with "teams" array of the document when user is logging in as opposed to doing this)
          }}, function(err){
            if(err){
              console.error(err);
              res.end("fail");
            }else{
              res.end("success");
            }
          });
        }else{
          res.end("fail");
        }
      }else{
        res.end("fail");
      }
    }
  })
});
app.post("/f/postAnnouncement", requireLogin, function(req, res){
  if(typeof(req.body.audience) == "object"){
    Announcement.create({
      id: Math.floor(Math.random() * (100000000000 - 10000000000)) + 10000000000,
      author: req.user.id,
      author_fn: req.user.firstname,
      author_ln: req.user.lastname,
      content: req.body.content,
      team: req.user.current_team.id,
      timestamp: new Date(),
      subdivisionAudience: req.body.audience.subdivisionMembers,
      userAudience: req.body.audience.userMembers
    }, function(err, announcement){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.end("success");
      }
    });
  }else{
    if(req.body.audience == "everyone"){
      Announcement.create({
        id: Math.floor(Math.random() * (100000000000 - 10000000000)) + 10000000000,
        author: req.user.id,
        author_fn: req.user.firstname,
        author_ln: req.user.lastname,
        content: req.body.content,
        team: req.user.current_team.id,
        timestamp: new Date(),
        entireTeam: true
      }, function(err, announcement){
        if(err){
          console.error(err);
          res.end("fail");
        }else{
          res.end("success");
        }
      });
    }else{
      //with subdivision id
      Announcement.create({
        id: Math.floor(Math.random() * (100000000000 - 10000000000)) + 10000000000,
        author: req.user.id,
        author_fn: req.user.firstname,
        author_ln: req.user.lastname,
        content: req.body.content,
        team: req.user.current_team.id,
        timestamp: new Date(),
        subdivisionAudience: [ req.body.audience ]
      }, function(err, announcement){
        if(err){
          console.error(err);
          res.end("fail");
        }else{
          res.end("success");
        }
      });

    }
  }
});
app.post("/f/getAnnouncementsForUser", requireLogin, function(req, res) {
  var finalAnnouncements = [];
  var userSubdivisionIds = req.user.subdivisions.map(function(subdivision) {return subdivision.id;});
  Announcement.find({
    team: req.user.current_team.id,
    $or: [
      {
        entireTeam: true
      },
      {
        userAudience: req.user.id
      },
      {
        subdivisionAudience: {
          "$in": userSubdivisionIds
        }
      }
    ]
  },
  {
    id: 1,
    author: 1,
    author_fn: 1,
    author_ln: 1,
    content: 1,
    timestamp: 1
  }).sort('-timestamp').limit(20).exec(function(err, announcements){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      res.end(JSON.stringify(announcements));
    }
  })
  // {
  //   skip: 0, // Starting Row
  //   limit: 10, // Ending Row
  //   sort: {
  //     date_added: -1 //Sort by Date Added DESC
  //   }
  // },
  // function(err, announcements) {
  //   if(err){
  //     console.error(err);
  //     res.end("fail");
  //   }else{
  //     res.end(JSON.stringify(announcements));
  //   }
  // })
})

var port = process.argv[2] || 8080;
app.listen(port);
console.log('server started on port %s', port);
