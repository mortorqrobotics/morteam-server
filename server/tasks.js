module.exports = function(app, util, schemas) {

  var User = schemas.User;
  var Task = schemas.Task;

  var requireLogin = util.requireLogin;
  var requireLeader = util.requireLeader;
  var requireAdmin = util.requireAdmin;
  var notify = util.notify;

  app.post("/f/assignTask", requireLogin, requireLeader, function(req, res){
    if(req.body.task_description){
      Task.create({
        name: req.body.task_name,
        description: req.body.task_description,
        team: req.user.current_team.id,
        for: req.body.user_id,
        due_date: req.body.due_date,
        creator: req.user._id,
        completed: false
      }, function(err, task){
        if(err){
          console.error(err);
          res.end("fail");
        }else{
          //res.end("success");
          User.findOne({_id: req.body.user_id}, function(err, user){
            if(err){
              console.error(err);
              res.end("fail");
            }else{
              if(user){
                notify.sendMail({
                    from: 'MorTeam Notification <notify@morteam.com>',
                    to: user.email,
                    subject: 'New Task Assigned By ' + req.user.firstname + " " + req.user.lastname,
                    text: 'View your new task at http://www.morteam.com/u/' + req.body.user_id
                });
                res.end("success");
              }
            }
          })
        }
      })
    }else{
      Task.create({
        name: req.body.task_name,
        team: req.user.current_team.id,
        for: req.body.user_id,
        due_date: req.body.due_date,
        creator: req.user._id,
        completed: false
      }, function(err, task){
        if(err){
          console.error(err);
          res.end("fail");
        }else{
          res.end(task._id.toString());
        }
      })
    }
  })
  app.post("/f/getUserTasks", requireLogin, function(req, res){
    Task.find({for: req.body.user_id}).populate('creator').exec(function(err, tasks){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.end(JSON.stringify(tasks));
      }
    })
  })
  app.post("/f/getPendingUserTasks", requireLogin, function(req, res){
    Task.find({for: req.body.user_id, completed:false}).populate('creator').exec(function(err, tasks){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.end(JSON.stringify(tasks));
      }
    })
  })
  app.post("/f/markTaskAsCompleted", requireLogin, function(req, res){
    if( req.user._id == req.body.target_user || req.user.current_team.position == "admin" || req.user.current_team.position == "leader" ){
      Task.update({_id: req.body.task_id}, { "$set": {completed: true} }, function(err, model){
        if(err){
          console.error(err);
          res.end("fail");
        }else{
          res.end("success");
        }
      });
    }
  });
};
