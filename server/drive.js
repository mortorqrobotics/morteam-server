module.exports = function(app, util, schemas) {

  var ObjectId = require('mongoose').Types.ObjectId;
  var multer = require('multer');
  var extToMime = require("./extToMime.json");

  var User = schemas.User;
  var Folder = schemas.Folder;
  var File = schemas.File;

  var requireLogin = util.requireLogin;
  var requireLeader = util.requireLeader;
  var requireAdmin = util.requireAdmin;
  var uploadToDrive = util.uploadToDrive;
  var deleteFileFromDrive = util.deleteFileFromDrive;
  var normalizeDisplayedText = util.normalizeDisplayedText;
  var extToType = util.extToType;

  app.post("/f/getTeamFolders", requireLogin, function(req, res){
    var userSubdivisionIds = req.user.subdivisions.map(function(subdivision) {
      if (subdivision.accepted == true) {
        return new ObjectId(subdivision._id);
      }
    });
    Folder.find({team: req.user.current_team.id, parentFolder: { "$exists": false }, $or: [
      {entireTeam: true},
      {userMembers: req.user._id},
      {subdivisionMembers: {"$in": userSubdivisionIds} }
    ]}, function(err, folders){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.end(JSON.stringify(folders));
      }
    })
  })
  app.post("/f/getSubFolders", requireLogin, function(req, res){
    var userSubdivisionIds = req.user.subdivisions.map(function(subdivision) {
      if (subdivision.accepted == true) {
        return new ObjectId(subdivision._id);
      }
    });
    Folder.find({team: req.user.current_team.id, parentFolder: req.body.folder_id, $or: [
      {entireTeam: true},
      {userMembers: req.user._id},
      {subdivisionMembers: {"$in": userSubdivisionIds} }
    ]}, function(err, folders){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.end(JSON.stringify(folders));
      }
    })
  })
  app.post("/f/getFilesInFolder", requireLogin, function(req, res){
    File.find({folder: req.body.folder_id}, function(err, files){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        res.end(JSON.stringify(files));
      }
    })
  })
  app.post("/f/createFolder", requireLogin, function(req, res){
    if(req.body.name.length < 22){
      if(req.body.type == "teamFolder"){
        Folder.create({
          name: req.body.name,
          team: req.user.current_team.id,
          userMembers: req.body.userMembers,
          subdivisionMembers: req.body.subdivisionMembers,
          creator: req.user._id,
          parentFolder: undefined,
          ancestors: [],
          defaultFolder: false
        }, function(err, folder){
          if(err){
            console.error(err);
            res.end("fail");
          }else{
            res.end(JSON.stringify(folder));
          }
        });
      }else if (req.body.type == "subFolder") {
        Folder.create({
          name: req.body.name,
          team: req.user.current_team.id,
          userMembers: req.body.userMembers,
          subdivisionMembers: req.body.subdivisionMembers,
          parentFolder: req.body.parentFolder,
          ancestors: req.body.ancestors.concat([req.body.parentFolder]),
          creator: req.user._id,
          defaultFolder: false
        }, function(err, folder){
          if(err){
            console.error(err);
            res.end("fail");
          }else{
            res.end(JSON.stringify(folder));
          }
        });
      }else {
        res.end("fail");
      }
    }else {
      res.end("fail");
    }
  });
  app.post("/f/uploadFile", requireLogin, multer().single('uploadedFile'), function(req, res){
    var ext = req.file.originalname.substring(req.file.originalname.lastIndexOf(".")+1).toLowerCase() || "unknown";
    // var mime = mimetypes[extToType(ext)];
    var mime = extToMime[ext];
    var disposition;
    // if(mime == "application/octet-stream"){
    //   disposition = "attachment; filename="+req.file.originalname;
    // }else{
    //   disposition = "attachment; filename="+req.body.fileName;
    // }
    if (mime == undefined){
      disposition = "attachment; filename="+req.file.originalname;
      mime = "application/octet-stream";
    }else{
      disposition = "attachment; filename="+req.body.fileName+"."+ext;
    }

    req.body.fileName = normalizeDisplayedText(req.body.fileName);

    File.create({
      name: req.body.fileName,
      originalName: req.file.originalname,
      folder: req.body.currentFolderId,
      size: req.file.size,
      type: extToType(ext),
      mimetype: mime,
      creator: req.user._id
    }, function(err, file){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        uploadToDrive(req.file.buffer, file._id, mime, disposition, function(err, data){
          if(err){
            console.error(err);
            res.end("fail");
          }else{
            if(file.type != "image"){
              res.end(JSON.stringify(file));
            }else{
              lwip.open(req.file.buffer, ext, function(err, image){
                if(err){
                  console.error(err);
                  res.end("fail");
                }else{
                  var hToWRatio = image.height()/image.width();
                  if(hToWRatio >= 1){
                    image.resize(280, 280*hToWRatio, function(err, image){
                      if(err){
                        console.error(err);
                        res.end("fail");
                      }else{
                        image.toBuffer(ext, function(err, buffer){
                          if(err){
                            console.error(err);
                            res.end("fail");
                          }else{
                            uploadToDrive(buffer, file._id+"-preview", mime, disposition, function(err, data){
                              if(err){
                                console.error(err);
                                res.end("fail");
                              }else{
                                res.end(JSON.stringify(file));
                              }
                            });
                          }
                        })
                      }
                    })
                  }else{
                    image.resize(280/hToWRatio, 280, function(err, image){
                      if(err){
                        console.error(err);
                        res.end("fail");
                      }else{
                        image.toBuffer(ext, function(err, buffer){
                          if(err){
                            console.error(err);
                            res.end("fail");
                          }else{
                            uploadToDrive(buffer, file._id+"-preview", mime, disposition, function(err, data){
                              if(err){
                                console.error(err);
                                res.end("fail");
                              }else{
                                res.end(JSON.stringify(file));
                              }
                            });
                          }
                        })
                      }
                    })
                  }
                }
              });
            }
          }
        });
      }
    })
  })
  app.post("/f/deleteFile", requireLogin, function(req, res){
    File.findOne({_id: req.body.file_id}, function(err, file){
      if(err){
        console.error(err);
        res.end("fail");
      }else{
        if(req.user._id.toString() == file.creator.toString() || req.user.current_team.position == "admin"){
          deleteFileFromDrive(req.body.file_id, function(err, data){
            if(err){
              console.error(err);
              res.end("fail");
            }else{
              file.remove(function(err){
                if(err){
                  console.error(err);
                  res.end("fail");
                }else{
                  if(req.body.isImg){
                      deleteFileFromDrive(req.body.file_id+"-preview", function(err, data){
                        if(err){
                          console.error(err);
                          res.end("fail");
                        }else{
                          res.end("success");
                        }
                      })
                  }else{
                    res.end("success");
                  }
                }
              });
            }
          })
        }else{
          res.end("fail");
        }
      }
    });
  });

};
