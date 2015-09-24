Subdivision.findOne({id: req.body.subdivision_id}, function(err, subdivision){
  if(err){
    console.error(err);
    res.end("fail");
  }else{
    if(subdivision){
      User.findOne({id: req.body.user_id}, function(err, user){
        if(err){
          console.error(err);
          res.end("fail");
        }else{
          // searchForValueInObjectsArray(req.body.team_id, user.teams).subdivisions.push(req.body.subdivision_id);
          // for (var i=0; i < user.teams.length; i++) {
          //   if (user.teams[i].id == req.body.team_id) {
          //     user.teams[i].subdivisions.push(req.body.subdivision_id.toString());
          //     console.log(user);
          //     user.save(function(err){
          //       if(err){
          //         console.error(err);
          //         res.end("fail");
          //       }else{
          //         res.end("success")
          //       }
          //     });
          //     break;
          //   }
          // }
          if(user){
            user.subdivisions.push({id: req.body.subdivision_id, team: req.body.team_id);
            user.save(function(err){
              if(err){
                console.error(err);
              }else{
                res.end("success")
              }
            })
          }else{
            res.end("fail");
          }
        }
      });
    }else{
      res.end("fail");
    }
  }
});
