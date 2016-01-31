module.exports = function(app, util, schemas) {

  var ObjectId = require('mongoose').Types.ObjectId;

  //assign variables to util functions(and objects) and database schemas
  for(key in util){
    eval("var " + key + " = util." + key + ";");
  }
  for(key in schemas){
    eval("var " + key + " = schemas." + key + ";");
  }

  app.post("/f/getEventsForUserInTeamInMonth", requireLogin, function(req, res){
    var userSubdivisionIds = req.user.subdivisions.map(function(subdivision) {
      if (subdivision.accepted == true) {
        return new ObjectId(subdivision._id);
      }
    });
    var numberOfDays = new Date(req.body.year, req.body.month, 0).getDate(); //month is 1 based
    var start = new Date(req.body.year, req.body.month-1, 1); //month is 0 based
    var end = new Date(req.body.year, req.body.month-1, numberOfDays); //month is 0 based
    Event.find({
      team: req.user.current_team.id,
      $or: [
        { entireTeam: true },
        { userAttendees: req.user._id },
        { subdivisionAttendees: { "$in": userSubdivisionIds } }
      ],
      date: {$gte: start, $lt: end}
    }, function(err, events){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.json(events)
      }
    });
  });
  app.post("/f/getUpcomingEventsForUser", requireLogin, function(req, res){
    var userSubdivisionIds = req.user.subdivisions.map(function(subdivision) {
      if (subdivision.accepted == true) {
        return new ObjectId(subdivision._id);
      }
    });
    Event.find({
      team: req.user.current_team.id,
      $or: [
        { entireTeam: true },
        { userAttendees: req.user._id },
        { subdivisionAttendees: { "$in": userSubdivisionIds } }
      ],
      date: {$gte: new Date()}
    }).sort('date').exec(function(err, events){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.end( JSON.stringify(events) );
      }
    });
  });
  app.post("/f/createEvent", requireLogin, requireLeader, function(req, res){

    if(req.body.userAttendees == undefined){
      req.body.userAttendees = []
    }
    if(req.body.subdivisionAttendees == undefined){
      req.body.subdivisionAttendees = []
    }

    if(req.body.hasAttendance == "true"){
      req.body.hasAttendance = true;
    }else{
      req.body.hasAttendance = false;
    }

    if(req.body.sendEmail == "true"){
      req.body.sendEmail = true;
    }else{
      req.body.sendEmail = false;
    }


    if(req.body.description != ""){
      if(req.body.entireTeam == "true"){
        Event.create({
          name: req.body.name,
          description: req.body.description,
          entireTeam: true,
          date: new Date(req.body.date),
          team: req.user.current_team.id,
          creator: req.user._id,
          hasAttendance: req.body.hasAttendance
        }, function(err, event){
          if(err){
            console.error(err);
            res.end("fail");
          }else{
            User.find({ teams: {$elemMatch: {id: req.user.current_team.id }} }, '-password', function(err, users){
              if(err){
                console.error(err);
                res.end("fail");
              }else{
                if(req.body.sendEmail){
                  var list = createRecepientList(users);
                  notify.sendMail({
                      from: 'MorTeam Notification <notify@morteam.com>',
                      to: list,
                      subject: 'New Event on ' + readableDate(event.date) + ' - ' + event.name,
                      html: req.user.firstname + ' ' + req.user.lastname + ' has created an event on ' + readableDate(event.date) + ',<br><br>' + event.name + '<br>' + event.description
                  });
                }
                if(req.body.hasAttendance){
                  var attendees = [];
                  User.find({ teams: {$elemMatch: {id: req.user.current_team.id }} }, function(err, users){
                    for(var i = 0; i < users.length; i++){
                      attendees.push( { user: users[i]._id, status: "absent" } );
                    }
                    AttendanceHandler.create({
                      event: event._id,
                      event_date: event.date,
                      attendees: attendees,
                      entireTeam: true
                    }, function(err, attendanceHandler){
                      if(err){
                        console.error(err);
                        res.end("fail");
                      }else{
                        res.end(JSON.stringify(event));
                      }
                    });
                  });
                }else{
                  res.end(JSON.stringify(event));
                }
              }
            })
          }
        });
      }else{
        Event.create({
          name: req.body.name,
          description: req.body.description,
          userAttendees: req.body.userAttendees,
          subdivisionAttendees: req.body.subdivisionAttendees,
          date: new Date(req.body.date),
          team: req.user.current_team.id,
          creator: req.user._id,
          hasAttendance: req.body.hasAttendance
        }, function(err, event){
          if(err){
            console.error(err);
            res.end("fail");
          }else{
            User.find({ $or: [
              { _id: { $in: req.body.userAttendees } },
              { subdivisions: { $elemMatch: { '_id': { $in: req.body.subdivisionAttendees } } } }
            ] }, '-password', function(err, users){
              if(err){
                console.error(err);
                res.end("fail");
              }else{
                if(req.body.sendEmail){
                  var list = createRecepientList(users);
                  notify.sendMail({
                      from: 'MorTeam Notification <notify@morteam.com>',
                      to: list,
                      subject: 'New Event on ' + readableDate(event.date) + ' - ' + event.name,
                      html: req.user.firstname + ' ' + req.user.lastname + ' has created an event on ' + readableDate(event.date) + ',<br><br>' + event.name + '<br>' + event.description
                  });
                }
                if(req.body.hasAttendance){
                  var attendees = [];
                  for(var i = 0; i < req.body.userAttendees.length; i++){
                    attendees.push( { user: req.body.userAttendees[i], status: "absent" } );
                  }
                  User.find({ subdivisions: { $elemMatch: { _id: {"$in": req.body.subdivisionAttendees} } } }, function(err, users){
                    for(var i = 0; i < users.length; i++){
                      attendees.push( { user: users[i]._id, status: "absent" } );
                    }
                    attendees = removeDuplicates(attendees);
                    AttendanceHandler.create({
                      event: event._id,
                      event_date: event.date,
                      attendees: attendees
                    }, function(err, attendanceHandler){
                      if(err){
                        console.error(err);
                        res.end("fail");
                      }else{
                        res.end( JSON.stringify(event) )
                      }
                    });
                  });
                }else{
                  res.end(JSON.stringify(event));
                }
              }
            })
          }
        });
      }
    }else{
      if(req.body.entireTeam == "true"){
        Event.create({
          name: req.body.name,
          entireTeam: true,
          date: new Date(req.body.date),
          team: req.user.current_team.id,
          creator: req.user._id,
          hasAttendance: req.body.hasAttendance
        }, function(err, event){
          if(err){
            console.error(err);
            res.end("fail");
          }else{
            User.find({ teams: {$elemMatch: {id: req.user.current_team.id }} }, '-password', function(err, users){
              if(err){
                console.error(err);
                res.end("fail");
              }else{
                if(req.body.sendEmail){
                  var list = createRecepientList(users);
                  notify.sendMail({
                      from: 'MorTeam Notification <notify@morteam.com>',
                      to: list,
                      subject: 'New Event on ' + readableDate(event.date) + ' - ' + event.name,
                      html: req.user.firstname + ' ' + req.user.lastname + ' has created an event on ' + readableDate(event.date) + ',<br><br>' + event.name
                  });
                }
                if(req.body.hasAttendance){
                  var attendees = [];
                  User.find({ teams: {$elemMatch: {id: req.user.current_team.id }} }, function(err, users){
                    for(var i = 0; i < users.length; i++){
                      attendees.push( { user: users[i]._id, status: "absent" } );
                    }
                    AttendanceHandler.create({
                      event: event._id,
                      event_date: event.date,
                      attendees: attendees,
                      entireTeam: true
                    }, function(err, attendanceHandler){
                      if(err){
                        console.error(err);
                        res.end("fail");
                      }else{
                        res.end( JSON.stringify(event) )
                      }
                    });
                  });
                }else{
                  res.end(JSON.stringify(event));
                }
              }
            })
          }
        });
      }else{
        Event.create({
          name: req.body.name,
          userAttendees: req.body.userAttendees,
          subdivisionAttendees: req.body.subdivisionAttendees,
          date: new Date(req.body.date),
          team: req.user.current_team.id,
          creator: req.user._id,
          hasAttendance: req.body.hasAttendance
        }, function(err, event){
          if(err){
            console.error(err);
            res.end("fail");
          }else{
            User.find({ $or: [
              { _id: { $in: req.body.userAttendees } },
              { subdivisions: { $elemMatch: { '_id': { $in: req.body.subdivisionAttendees } } } }
            ] }, '-password', function(err, users){
              if(err){
                console.error(err);
                res.end("fail");
              }else{
                if(req.body.sendEmail){
                  var list = createRecepientList(users);
                  notify.sendMail({
                      from: 'MorTeam Notification <notify@morteam.com>',
                      to: list,
                      subject: 'New Event on ' + readableDate(event.date) + ' - ' + event.name,
                      html: req.user.firstname + ' ' + req.user.lastname + ' has created an event on ' + readableDate(event.date) + ',<br><br>' + event.name
                  });
                }
                if(req.body.hasAttendance){
                  var attendees = [];
                  for(var i = 0; i < req.body.userAttendees.length; i++){
                    attendees.push( { user: req.body.userAttendees[i], status: "absent" } );
                  }
                  User.find({ subdivisions: { $elemMatch: { _id: {"$in": req.body.subdivisionAttendees} } } }, function(err, users){
                    for(var i = 0; i < users.length; i++){
                      attendees.push( { user: users[i]._id, status: "absent" } );
                    }
                    attendees = removeDuplicates(attendees);
                    AttendanceHandler.create({
                      event: event._id,
                      event_date: event.date,
                      attendees: attendees
                    }, function(err, attendanceHandler){
                      if(err){
                        console.error(err);
                        res.end("fail");
                      }else{
                        res.end( JSON.stringify(event) )
                      }
                    });
                  });
                }else{
                  res.end(JSON.stringify(event));
                }
              }
            })
          }
        });
      }
    }
  });
  app.post("/f/deleteEvent", requireLogin, requireLeader, function(req, res){
    Event.findOneAndRemove({_id: req.body.event_id}, function(err){
      if(err){
        console.error(err);
        res.end("fail")
      }else{
        AttendanceHandler.findOneAndRemove({event: req.body.event_id}, function(err){
          if(err){
            console.error(err);
            res.end("fail");
          }else{
            res.end("success");
          }
        })
      }
    });
  });
  app.post("/f/getEventAttendees", requireLogin, requireLeader, function(req, res){
    AttendanceHandler.findOne({event: req.body.event_id}).populate('attendees.user').exec(function(err, attendanceHandler){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.end(JSON.stringify(attendanceHandler.attendees));
      }
    });
  });
  app.post("/f/updateAttendanceForEvent", requireLogin, requireLeader, function(req, res){
    AttendanceHandler.update({event: req.body.event_id}, {"$set": {attendees: req.body.updatedAttendees}}, function(err, model){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.end("success");
      }
    });
  });
  app.post("/f/getUserAbsences", requireLogin, function(req, res){
    AttendanceHandler.find({event_date:{ "$lte": new Date() }, 'attendees.user': req.body.user_id}).populate('event').exec(function(err, attendanceHandlers){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        var absences = [];
        var present = 0;
        for(var i = 0; i < attendanceHandlers.length; i++){
          for(var j = 0; j < attendanceHandlers[i].attendees.length; j++){
            if(attendanceHandlers[i].attendees[j].user == req.body.user_id && attendanceHandlers[i].attendees[j].status == "absent"){
              absences.push(attendanceHandlers[i].event);
            }else if (attendanceHandlers[i].attendees[j].user == req.body.user_id && attendanceHandlers[i].attendees[j].status == "present") {
              present++;
            }
          }
        }
        res.end(JSON.stringify({present: present, absences: absences}));
      }
    })
  })
  app.post("/f/excuseAbsence", requireLogin, requireLeader, function(req, res){
    AttendanceHandler.update({event : req.body.event_id , "attendees.user": req.body.user_id} , {"$set": {"attendees.$.status": "excused"}}, function(err, model){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.end("success");
      }
    })
  })

};
