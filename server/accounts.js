module.exports = function(app, util, schemas) {

  var extToMime = require("./extToMime.json");
  var lwip = require('lwip');
  var multer = require('multer');

  var User = schemas.User;

  var requireLogin = util.requireLogin;
  var requireLeader = util.requireLeader;
  var requireAdmin = util.requireAdmin;
  var validateEmail = util.validateEmail;
  var validatePhone = util.validatePhone;
  var findTeamInUser = util.findTeamInUser;
  var uploadToProfPics = util.uploadToProfPics;
  var resizeImage = util.resizeImage;
  var notify = util.notify;

  app.post("/f/login", function(req, res) {
    //IMPORTANT: req.body.username can either be a username or an email. Please do not let this confuse you.
    if(req.body.rememberMe == "true"){
      req.body.rememberMe = true;
    }else{
      req.body.rememberMe = false;
    }

    User.findOne({
      $or: [{username: req.body.username}, {email: req.body.username}]
    }, function(err, user) {
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        if (user) {
          user.comparePassword(req.body.password, function(err, isMatch) {
            if (err) {
              console.error(err);
              res.end("fail");
            } else {
              if (isMatch) {
                req.session.user = user;
                if(req.body.rememberMe){
                  req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; //one year
                }
                res.end(JSON.stringify(user));
              } else {
                res.end("inc/password");
              }
            }
          })
        } else {
          res.end("inc/username")
        }
      }
    });
  });
  app.post("/f/logout", requireLogin, function(req, res) {
    req.session.destroy(function(err) {
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.end("success");
      }
    })
  });
  app.post("/f/createUser", multer({limits: {fileSize:10*1024*1024}}).single('profpic'), function(req, res) {
    req.body.firstname = req.body.firstname.capitalize();
    req.body.lastname = req.body.lastname.capitalize();
    req.body.phone = req.body.phone.replace(/[- )(]/g,'')
    if( validateEmail(req.body.email) && validatePhone(req.body.phone) ){
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
                  var ext = req.file.originalname.substring(req.file.originalname.lastIndexOf(".")+1).toLowerCase() || "unknown";
                  var mime = extToMime[ext]
                  if(mime == undefined){
                    mime = "application/octet-stream"
                  }
                  var suffix = req.file.originalname.substring(req.file.originalname.lastIndexOf(".")+1).toLowerCase();
                  lwip.open(req.file.buffer, suffix, function(err, image){
                    if(err){
                      console.error(err);
                      res.end("fail");
                    }else{
                      var hToWRatio = image.height()/image.width();
                      if(hToWRatio >= 1){
                        image.resize(60, 60*hToWRatio, function(err, image){
                          if(err){
                            console.error(err);
                            res.end("fail");
                          }else{
                            image.toBuffer(suffix, function(err, buffer){
                              if(err){
                                console.error(err);
                                res.end("fail");
                              }else{
                                uploadToProfPics(buffer, req.body.username + "-60", mime, function(err, data){
                                  if(err){
                                    console.error(err);
                                    res.end("fail");
                                  }
                                });
                              }
                            })
                          }
                        })
                      }else{
                        image.resize(60/hToWRatio, 60, function(err, image){
                          if(err){
                            console.error(err);
                            res.end("fail");
                          }else{
                            image.toBuffer(suffix, function(err, buffer){
                              if(err){
                                console.error(err);
                                res.end("fail");
                              }else{
                                uploadToProfPics(buffer, req.body.username + "-60", mime, function(err, data){
                                  if(err){
                                    console.error(err);
                                    res.end("fail");
                                  }
                                });
                              }
                            })
                          }
                        })
                      }
                    }
                  });
                  lwip.open(req.file.buffer, suffix, function(err, image){
                    if(err){
                      console.error(err);
                      res.end("fail");
                    }else{
                      var hToWRatio = image.height()/image.width();
                      if(hToWRatio >= 1){
                        image.resize(300, 300*hToWRatio, function(err, image){
                          if(err){
                            console.error(err);
                            res.end("fail");
                          }else{
                            image.toBuffer(suffix, function(err, buffer){
                              if(err){
                                console.error(err);
                                res.end("fail");
                              }else{
                                uploadToProfPics(buffer, req.body.username + "-300", mime, function(err, data){
                                  if(err){
                                    console.error(err);
                                    res.end("fail");
                                  }
                                });
                              }
                            })
                          }
                        })
                      }else{
                        image.resize(300/hToWRatio, 300, function(err, image){
                          if(err){
                            console.error(err);
                            res.end("fail");
                          }else{
                            image.toBuffer(suffix, function(err, buffer){
                              if(err){
                                console.error(err);
                                res.end("fail");
                              }else{
                                uploadToProfPics(buffer, req.body.username + "-300", mime, function(err, data){
                                  if(err){
                                    console.error(err);
                                    res.end("fail");
                                  }
                                });
                              }
                            })
                          }
                        })
                      }
                    }
                  });
                  User.create({
                    username: req.body.username,
                    password: req.body.password,
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    email: req.body.email,
                    phone: req.body.phone,
                    profpicpath: "/pp/" + /*req.file.key.substring( 2 )*/ req.body.username
                  }, function(err, user) {
                    if (err) {
                      res.end("fail");
                      console.error(err);
                    } else {
                      res.end("success");
                      console.log("User " + user._id + ", " + user.firstname + " " + user.lastname + " was saved!");
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
                    profpicpath: "/images/user.jpg"
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
    }else{
      res.end("fail: Form data is invalid");
    }
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
  app.post("/f/searchForUsers", requireLogin, function(req, res){
    var terms = req.body.search.split(' ');
    var regexString = "";
    for (var i = 0; i < terms.length; i++){
      regexString += terms[i];
      if (i < terms.length - 1) regexString += '|';
    }
    var re = new RegExp(regexString, 'ig');
    User.find({
      teams: {$elemMatch: {id: req.user.current_team.id}},
      $or: [
        { firstname: re }, { lastname: re }
      ]
    }, '-password').limit(10).exec(function(err, users) {
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.end(JSON.stringify(users));
      }
    });
  })
  app.post("/f/changePassword", requireLogin, function(req, res){
    if(req.body.new_password == req.body.new_password_confirm){
      User.findOne({_id: req.user._id}, function(err, user){
        user.comparePassword(req.body.old_password, function(err, isMatch) {
          if (err) {
            console.error(err);
            res.end("fail");
          } else {
            if (isMatch) {
              user.password = req.body.new_password;
              user.save(function(err){
                if(err){
                  console.error(err);
                  res.end("fail");
                }else{
                  res.end("success");
                }
              })
            } else {
              res.end("fail: incorrect password");
            }
          }
        })
      })
    }else{
      res.end("fail: new passwords do not match");
    }
  });
  app.post("/f/editProfile", requireLogin, multer().single('new_prof_pic'), function(req, res){
    if(validateEmail(req.body.email)){
      if(validatePhone(req.body.phone)){
        if(req.file){
          var ext = req.file.originalname.substring(req.file.originalname.lastIndexOf(".")+1).toLowerCase() || "unknown";
          var mime = extToMime[ext]
          if(mime == undefined){
            mime = "application/octet-stream"
          }
          // var suffix = req.file.originalname.substring(req.file.originalname.lastIndexOf(".")+1).toLowerCase();
          resizeImage(req.file.buffer, 300, ext, function(err, buffer){
            if(err){
              console.error(err);
              res.end("fail");
            }else{
              uploadToProfPics(buffer, req.user.username+"-300", mime, function(err, data){
                if(err){
                  console.error(err);
                  res.end("fail");
                }else{
                  resizeImage(req.file.buffer, 60, ext, function(err, buffer){
                    if(err){
                      console.error(err);
                      res.end("fail");
                    }else{
                      uploadToProfPics(buffer, req.user.username+"-60", mime, function(err, data){
                        if(err){
                          console.error(err);
                          res.end("fail");
                        }else{
                          User.findOneAndUpdate({_id: req.user._id}, {
                            firstname: req.body.firstname,
                            lastname: req.body.lastname,
                            email: req.body.email,
                            phone: req.body.phone,
  			                    profpicpath: "/pp/" +  req.user.username
                          }, function(err, user){
                            if(err){
                              console.error(err);
                              res.end("fail");
                            }else{
                              res.end("success");
                            }
                          })
                        }
                      })
                    }
                  })
                }
              });
            }
          });
        }else{
          User.findOneAndUpdate({_id: req.user._id}, {
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            phone: req.body.phone
          }, function(err, user){
            if(err){
              console.error(err);
              res.end("fail");
            }else{
              res.end("success");
            }
          })
        }
      }else{
        res.end("fail");
      }
    }else{
      res.end("fail");
    }
  });
  app.post("/f/getSelf", requireLogin, function(req, res){
    User.findOne({_id: req.user._id}, '-password', function(err, user){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.end(JSON.stringify(user));
      }
    });
  });
  app.post("/f/removeUserFromTeam", requireLogin, requireAdmin, function(req, res){
    User.update({_id: req.body.user_id}, { '$pull': {
      'teams': {id: req.user.current_team.id},
    },
    '$push': {
      'bannedFromTeams': req.user.current_team.id
    }}, function(err, model){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        User.findOne({_id: req.body.user_id}, function(err, user){
          if(err){
            console.error(err);
            res.end("fail");
          }else{
            if(user.current_team.id == req.user.current_team.id){
              user.current_team = undefined //TODO: make it so that if current_team is undefined when logging in, it allows you to set current_team
              user.save(function(err){
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
      }
    })
  })
  app.post("/f/forgotPassword", function(req, res){
    User.findOne({email: req.body.email, username: req.body.username}, function(err, user){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        if(user){
          user.assignNewPassword(function(err, new_password){
            if(err){
              console.error(err);
              res.end("fail");
            }else{
              user.save(function(err){
                if(err){
                  console.error(err);
                  res.end("fail");
                }else{
                  notify.sendMail({
                      from: 'MorTeam Notification <notify@morteam.com>',
                      to: req.body.email,
                      subject: 'New MorTeam Password Request',
                      text: 'It seems like you requested to reset your password. Your new password is ' + new_password + '. Feel free to reset it after you log in.'
                  }, function(err, info){
                    if(err){
                      console.error(err);
                      res.end("fail");
                    }else{
                      console.log(info);
                      res.end("success");
                    }
                  });
                }
              })
            }
          });
        }else{
          res.end("does not exist");
        }
      }
    })
  });
};
