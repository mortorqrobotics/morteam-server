var express = require('express'),
  http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('client-sessions');
var nodemailer = require('nodemailer');
var multer = require('multer');
var s3 = require('multer-s3');
var ObjectId = require('mongoose').Types.ObjectId;
app = express();
publicDir = require("path").join(__dirname, "../website/public");
profpicDir = 'http://profilepics.morteam.com.s3.amazonaws.com/'
//schemas
var User = require('./schemas/User.js');
var Team = require('./schemas/Team.js');
var Subdivision = require('./schemas/Subdivision.js');
var Announcement = require('./schemas/Announcement.js');
var Chat = require('./schemas/Chat.js');

mongoose.connect('mongodb://localhost:27017/morteamtest');

var transporter = nodemailer.createTransport();

var port = process.argv[2] || 8080;
var io = require("socket.io").listen(app.listen(port));
console.log('server started on port %s', port);

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

function getUserOtherThanSelf(twoUsers, selfId){
  if(twoUsers[0] == selfId){
    return twoUsers[1];
  }else{
    return twoUsers[0];
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

var upload = multer({
  storage: s3({
    dirname: '/',
    bucket: 'profilepics.morteam.com',
    secretAccessKey: 'Mj0Fzkde4lORoMPr8abJhAABpUlB1SjlGkSRFBgk',
    accessKeyId: 'AKIAI3D54IZI2HMGS5NQ',
    region: 'us-west-2',
    filename: function (req, file, cb) {
      cb(null, req.body.username + "." + file.mimetype.substring(file.mimetype.indexOf("/")+1) )
    }
  })
})

app.get("/", function(req, res) {
  fs.createReadStream("../website/public/index.html").pipe(res);
});
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
                if (users[i]._id == req.user._id) {
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

app.get('*', function(req, res) {
  send404(res);
});

app.post("/f/createUser", upload.single('profpic'), function(req, res) {
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
          if(req.body.password == req.body.password_confirm){
            if(req.file){
              User.create({
                username: req.body.username,
                password: req.body.password,
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                email: req.body.email,
                phone: req.body.phone,
                profpicpath: profpicDir + req.file.key.substring( 2 )
              }, function(err, user) {
                if (err) {
                  res.end("fail");
                  console.error(err);
                } else {
                  console.log("User " + user._id + ", " + user.firstname + " " + user.lastname + " was saved!");
                  res.end("success");
                }
              });
            }else{
              User.create({
                username: req.body.username,
                password: req.body.password,
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                email: req.body.email,
                phone: req.body.phone,
                profpicpath: "images/user.jpg"
              }, function(err, user) {
                if (err) {
                  res.end("fail");
                  console.error(err);
                } else {
                  console.log("User " + user._id + ", " + user.firstname + " " + user.lastname + " was saved!");
                  res.end("success");
                }
              });
            }
          }else{
            res.end("password mismatch");
          }
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
    _id: req.body._id
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
          _id: req.user._id
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
    name: req.body.name,
    type: req.body.type,
    team: req.user.current_team.id
  }, function(err, subdivision) {
    if (err) {
      console.error(err);
      res.end("fail");
    } else {
      res.end(subdivision._id.toString());
    }
  });
});
app.post("/f/inviteToSubdivision", requireLogin, function(req, res) {
  Subdivision.findOne({
    _id: req.body.subdivision_id
  }, function(err, subdivision) {
    if (err) {
      console.error(err);
      res.end("fail");
    } else {
      if (subdivision) {
        User.findOne({
          _id: req.body.user_id
        }, function(err, user) {
          if (err) {
            console.error(err);
            res.end("fail");
          } else {
            if (user) {
              user.subdivisions.push({
                _id: new ObjectId(req.body.subdivision_id),
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
      if(subdivisions){
        res.end(JSON.stringify(subdivisions));
      }else{
        res.end("[]");
      }
    }
  })
});
app.post("/f/getAllSubdivisionsForUserInTeam", requireLogin, function(req, res) {
  var userSubdivisionIds = []
  for(var i = 0; i < req.user.subdivisions.length; i++){
    if(req.user.subdivisions[i].accepted == true && req.user.subdivisions[i].team == req.user.current_team.id){
      userSubdivisionIds.push(req.user.subdivisions[i]._id);
    }
  }
  Subdivision.find({_id: { "$in": userSubdivisionIds }, team: req.user.current_team.id }, function(err, subdivisions){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      if(subdivisions){
        res.end( JSON.stringify(subdivisions.map(function(subdivision) {return {name: subdivision.name, _id: subdivision._id} })) );
      }else{
        res.end("fail");
      }
    }
  })
});

app.post("/f/loadSubdivisionInvitations", requireLogin, function(req, res) {
  var invitedSubdivisions = [];
  if(req.user.subdivisions.length > 0){
    for (var i = 0; i < req.user.subdivisions.length; i++) {
      if (req.user.subdivisions[i].accepted == false && req.user.subdivisions[i].team == req.user.current_team.id){
        invitedSubdivisions.push(req.user.subdivisions[i]._id);
      }
    }
    Subdivision.find({_id: { "$in": invitedSubdivisions }, team: req.user.current_team.id}, function(err, subdivisions){
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
  User.update({_id: req.user._id, 'subdivisions._id': new ObjectId(req.body.subdivision_id)}, {'$set': {
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
  User.update({_id: req.user._id}, {'$pull': {
    'subdivisions': {_id: new ObjectId(req.body.subdivision_id), team: req.user.current_team.id, accepted: false}
  }}, function(err){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      User.update({_id: req.user._id}, {'$push': {
        'subdivisions': {_id: new ObjectId(req.body.subdivision_id), team: req.user.current_team.id, accepted: true}
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
  User.update({_id: req.user._id}, {'$pull': {
    'subdivisions': {_id: new ObjectId(req.body.subdivision_id), team: req.user.current_team.id}
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
  User.update({_id: req.user._id}, {'$pull': {
    'subdivisions': {_id: new ObjectId(req.body.subdivision_id), team: req.user.current_team.id}
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
  User.findOne({_id: req.user._id}, function(err, user){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      if(user){
        if(req.user.current_team.position == "admin"){
          Subdivision.findOneAndRemove({_id: new ObjectId(req.body.subdivision_id), team: req.user.current_team.id}, function(err){
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
                'subdivisions': {_id: new ObjectId(req.body.subdivision_id), team: req.user.current_team.id, accepted: true}
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
              text: 'The user ' + req.user.firstname + req.user.lastname + ' tried to perform administrator tasks. User ID: ' + req.user._id
          });
          res.end("hax");
        }
      }
    }
  })
})
app.post("/f/removeUserFromSubdivision", requireLogin, function(req, res){
  if(req.user.current_team.position == "admin"){
    User.update({_id: req.body.user_id, teams: { $elemMatch: { "id": req.user.current_team.id } } }, { "$pull": { //TODO: maybe add new objectid
      'subdivisions' : {_id: new ObjectId(req.body.subdivision_id), team: req.user.current_team.id, accepted: true}
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
        text: 'The user ' + req.user.firstname + req.user.lastname + ' tried to perform administrator tasks. User ID: ' + req.user._id
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
  User.findOne({_id: req.body.user_id}, function(err, user){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      if(user){
        current_position = findTeamInUser(user, req.user.current_team.id).position;
        if( positionHA[req.user.current_team.position] >= positionHA[req.body.target_position] && positionHA[req.user.current_team.position] >= positionHA[current_position] ){
          User.update({_id: req.body.user_id, 'teams.id': req.user.current_team.id}, {'$set': {
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
      author: req.user._id,
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
        res.end(announcement._id.toString());
      }
    });
  }else{
    if(req.body.audience == "everyone"){
      Announcement.create({
        author: req.user._id,
        content: req.body.content,
        team: req.user.current_team.id,
        timestamp: new Date(),
        entireTeam: true
      }, function(err, announcement){
        if(err){
          console.error(err);
          res.end("fail");
        }else{
          res.end(announcement._id.toString());
        }
      });
    }else{
      //with subdivision id
      Announcement.create({
        author: req.user._id,
        content: req.body.content,
        team: req.user.current_team.id,
        timestamp: new Date(),
        subdivisionAudience: [ req.body.audience ]
      }, function(err, announcement){
        if(err){
          console.error(err);
          res.end("fail");
        }else{
          res.end(announcement._id.toString());
        }
      });

    }
  }
});
app.post("/f/getAnnouncementsForUser", requireLogin, function(req, res) {
  var finalAnnouncements = [];
  var userSubdivisionIds = req.user.subdivisions.map(function(subdivision) {return new ObjectId(subdivision._id);});
  Announcement.find({
    team: req.user.current_team.id,
    $or: [
      {
        entireTeam: true
      },
      {
        userAudience: new ObjectId(req.user._id)
      },
      {
        subdivisionAudience: {
          "$in": userSubdivisionIds
        }
      }
    ]
  },
  {
    _id: 1,
    author: 1,
    content: 1,
    timestamp: 1
  }).populate("author", "-password").sort('-timestamp').skip(req.body.skip).limit(20).exec(function(err, announcements){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      res.end(JSON.stringify(announcements))
    }
  })
})
app.post("/f/deleteAnnouncement", requireLogin, function(req, res){
  Announcement.findOne({_id: req.body._id}, function(err, announcement){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      if(req.user._id == announcement.author || req.user.current_team.position == "admin"){
        announcement.remove(function(err){
          if(err){
            console.error(err);
            res.end("fail");
          }else{
            res.end("success");
          }
        })
      }
    }
  });
});
app.post("/f/createChat", requireLogin, function(req, res){
  var subdivisionMembers;
  var userMembers;
  if(req.body.subdivisionMembers == undefined){ subdivisionMembers = [] }else{ subdivisionMembers = req.body.subdivisionMembers}
  if(req.body.userMembers == undefined){ userMembers = [] }else{ userMembers = req.body.userMembers}

  if(req.body.type == "private"){
    Chat.findOne({
      group: false,
      team: req.user.current_team.id,
      $or: [ { userMembers: [req.user._id, req.body.user2] }, { userMembers: [req.body.user2, req.user._id] } ] //check to see if private convo exists
    }, function(err, chat){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        if(chat){
          res.end("exists")
        }else{
          Chat.create({
            userMembers: userMembers,
            team: req.user.current_team.id,
            group: false
          }, function(err, chat){
            if(err){
              console.error(err);
              res.end("fail");
            }else{
              var user2_id = getUserOtherThanSelf(chat.userMembers, req.user._id.toString());
              User.findOne({_id: user2_id}, function(err, user){
                if(err){
                  console.error(err);
                  res.end("fail");
                }else{
                  res.end(JSON.stringify({
                    _id: user._id,
                    fn: user.firstname,
                    ln: user.lastname,
                    profpicpath: user.profpicpath,
                    chat_id: chat._id
                  }))
                }
              });
            }
          });
        }
      }
    });
  }else{
    Chat.create({
      team: req.user.current_team.id,
      name: req.body.name,
      userMembers: JSON.parse(userMembers),
      subdivisionMembers: JSON.parse(subdivisionMembers),
      group: true
    }, function(err, chat){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.end(JSON.stringify(chat));
      }
    });
  }
})
app.post("/f/getChatsForUser", requireLogin, function(req, res){
  var userSubdivisionIds = req.user.subdivisions.map(function(subdivision) {return subdivision._id;});
  Chat.find({
    team: req.user.current_team.id,
    $or: [
      {
        userMembers: new ObjectId(req.user._id)
      },
      {
        subdivisionMembers: {
          "$in": userSubdivisionIds
        }
      }
    ]
  },
  {
    _id: 1,
    name: 1,
    group: 1,
    userMembers: 1,
    subdivisionMembers: 1
  }).populate("userMembers subdivisionMembers", "-password").sort('-updated_at').exec(function(err, chats){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      res.end(JSON.stringify(chats));
    }
  })
});
app.post("/f/loadMessagesForChat", requireLogin, function(req, res){ //TODO: maybe in the future combine this with getUsersInChat to improve performance
  Chat.findOne( {_id: req.body.chat_id} ).slice('messages', [-20, 20]).populate('messages.author').exec(function(err, chat){
    if (err) {
      console.error(err);
      res.end("fail");
    }else{
      res.end(JSON.stringify(chat.messages));
    }
  });
});
app.post("/f/getUsersInChat", function(req, res){
  Chat.findOne({_id: req.body.chat_id}, {userMembers: 1, subdivisionMembers: 1}, function(err, chat){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      User.find({
        $or: [
          {
            _id: { "$in": chat.userMembers }
          },
          {
            subdivisions: { $elemMatch: { _id: {"$in": chat.subdivisionMembers} } }
          }
        ]
      }, function(err, users){
        if(err){
          console.error(err);
          res.end("fail");
        }else{
          res.end(JSON.stringify(users))
        }
      });
    }
  });
});
app.post("/f/sendMessage", function(req, res){
  Chat.update({_id: req.body.chat_id}, { '$push': {
    'messages': {author: new ObjectId(req.user._id), content: req.body.content, timestamp: new Date()}
  }}, function(err, model){
    if(err){
      console.error(err);
      res.end("fail");
    }else{
      res.end("success");
    }
  });
});

var online_clients = {};
io.on('connection', function(socket){
  socket.on("add to clients", function(data){
    if(online_clients[data._id] == undefined){
      online_clients[data._id] = socket.id;
    }
  })
  socket.on("disconnect", function(){
    for(var user_id in online_clients) {
      if(online_clients[user_id] == socket.id) {
        delete online_clients[user_id];
      }
    }
  })
  socket.on('message', function(msg){
    for(var i = 0; i < msg.receivers.length; i++){
      if( online_clients[ msg.receivers[i] ] != undefined){
        io.to( online_clients[ msg.receivers[i] ] ).emit("message", msg);
      }
    }
  })
  socket.on('get clients', function(){
    console.log("");
    console.log(online_clients);
    console.log("");
  })
});


// var done = 0;
// var arr = new Array(announcements.length);
// for( var i = 0; i < announcements.length; i++ ){
//   (function(index) {
//     User.findOne({id: announcements[index].author}, function(err, user){
//       if(err){
//         console.error(err);
//         res.end("fail");
//       }else{
//         if(user){
//           arr[index] = {
//             obj: announcements[index],
//             author_fn: user.firstname,
//             author_ln: user.lastname,
//             profpicpath: user.profpicpath
//           };
//           done++;
//           if( done == announcements.length){
//             res.end(JSON.stringify(arr));
//           }
//         }else{
//           res.end("fail");
//         }
//       }
//     });
//   })(i);
// }
