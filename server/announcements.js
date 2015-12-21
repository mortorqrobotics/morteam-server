module.exports = function(app, util, schemas) {

  var Autolinker = require( 'autolinker' );
  var ObjectId = require('mongoose').Types.ObjectId;

  //assign variables to util functions(and objects) and database schemas
  for(key in util){
    eval("var " + key + " = util." + key + ";");
  }
  for(key in schemas){
    eval("var " + key + " = schemas." + key + ";");
  }

  app.post("/f/postAnnouncement", requireLogin, function(req, res){
    //Attempt to convert audience request to JSON in case client does not explicitly send it as a JSON type
    try {
      req.body.audience = JSON.parse(req.body.audience);
    }  catch(e) { }
    req.body.content = Autolinker.link( req.body.content )
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
          User.find({ $or: [
            { _id: { $in: req.body.audience.userMembers } },
            { subdivisions: { $elemMatch: { '_id': { $in: req.body.audience.subdivisionMembers } } } }
          ] }, '-password', function(err, users){
            if(err){
              console.error(err);
              res.end("fail");
            }else{
              var list = createRecepientList(users);
              notify.sendMail({
                  from: 'MorTeam Notification <notify@morteam.com>',
                  to: list,
                  subject: 'New Announcement By ' + req.user.firstname + ' ' + req.user.lastname,
                  html: announcement.content
              }, function(err, info){
                if(err){
                  console.log("Email error:");
                  console.error(err);
                }else{
                  console.log("info:");
                  console.log(info);
                }
              });
              res.end(announcement._id.toString());
            }
          })
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
            User.find({ teams: {$elemMatch: {id: req.user.current_team.id }} }, '-password', function(err, users){
              if(err){
                console.error(err);
                res.end("fail");
              }else{
                var list = createRecepientList(users);
                notify.sendMail({
                    from: 'MorTeam Notification <notify@morteam.com>',
                    to: list,
                    subject: 'New Announcement By ' + req.user.firstname + ' ' + req.user.lastname,
                    html: announcement.content
                }, function(err, info){
                  if(err){
                    console.log("Email error:");
                    console.error(err);
                  }else{
                    console.log("info:");
                    console.log(info);
                  }
                });
                res.end(announcement._id.toString());
              }
            })
          }
        });
      }else{
        //with subdivision id
        Announcement.create({
          author: req.user._id,
          content: req.body.content,
          team: req.user.current_team.id,
          timestamp: new Date(),
  	      subdivisionAudience: [new ObjectId(String(req.body.audience))]
        }, function(err, announcement){
          if(err){
            console.error(err);
            res.end("fail");
          }else{
            User.find({
              subdivisions: { $elemMatch: { _id: req.body.audience } }
            }, '-password', function(err, users){
              if(err){
                console.error(err);
                res.end("fail");
              }else{
                var list = createRecepientList(users);
                notify.sendMail({
                    from: 'MorTeam Notification <notify@morteam.com>',
                    to: list,
                    subject: 'New Announcement By ' + req.user.firstname + ' ' + req.user.lastname,
                    html: announcement.content
                });
                res.end(announcement._id.toString());
              }
            })
          }
        });
      }
    }
  });
  app.post("/f/getAnnouncementsForUser", requireLogin, function(req, res) {
    var finalAnnouncements = [];
    var userSubdivisionIds = req.user.subdivisions.map(function(subdivision) {
      if (subdivision.accepted == true) {
        return new ObjectId(subdivision._id);
      }
    });
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
        if(req.user._id == announcement.author.toString() || req.user.current_team.position == "admin"){
          announcement.remove(function(err){
            if(err){
              console.error(err);
              res.end("fail");
            }else{
              res.end("success");
            }
          })
        }else{
          notify.sendMail({
              from: 'MorTeam Notification <notify@morteam.com>',
              to: 'rafezyfarbod@gmail.com',
              subject: 'MorTeam Security Alert!',
              text: 'The user ' + req.user.firstname + " " + req.user.lastname + ' tried to perform administrator tasks. User ID: ' + req.user._id
          });
          res.end("fail");
        }
      }
    });
  });

};
