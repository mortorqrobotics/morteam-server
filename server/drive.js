"use strict";

module.exports = function(app, util, schemas) {

	let ObjectId = require("mongoose").Types.ObjectId;
	let multer = require("multer");
	let extToMime = require("./extToMime.json");
	let lwip = require("lwip");
	let Promise = require("bluebird");

	let requireLogin = util.requireLogin;
	let requireAdmin = util.requireAdmin;

	let Folder = schemas.Folder;
	let File = schemas.File;

	app.get("/file/:fileId", requireLogin, Promise.coroutine(function*(req, res) {
		let userSubdivisionIds = util.activeSubdivisionIds(req.user.subdivisions);
		try {

			if (req.params.fileId.indexOf("-preview") == -1) {
				
				let file = yield File.findOne({_id: req.params.fileId}).populate("folder").exec();
				
				if (!file) {
					return res.end("fail");
				}

				if (!( (file.folder.team == req.user.current_team.id && file.folder.entireTeam)
					|| file.folder.userMembers.indexOf(req.user._id) > -1
					|| file.folder.subdivisionMembers.hasAnythingFrom(userSubdivisionIds) )) {
				
					return res.end("restricted");
				}
			}

			let url = yield util.driveBucket.getSignedUrlAsync("getObject", { Key: req.params.fileId, Expires: 60 });
			res.redirect(url);
			
		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/getTeamFolders", requireLogin, Promise.coroutine(function*(req, res) {
		let userSubdivisionIds = util.activeSubdivisionIds(req.user.subdivisions);
		try {

			let folders = yield Folder.find({
				team: req.user.current_team.id,
				parentFolder: { "$exists": false },
				$or: [
					{entireTeam: true},
					{userMembers: req.user._id},
					{subdivisionMembers: {"$in": userSubdivisionIds} }
				]
			});

			res.end(JSON.stringify(folders));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/getSubFolders", requireLogin, function(req, res) {
		let userSubdivisionIds = util.activeSubdivisionIds(req.user.subdivisions);
		Folder.find({team: req.user.current_team.id, parentFolder: req.body.folder_id, $or: [
			{entireTeam: true},
			{userMembers: req.user._id},
			{subdivisionMembers: {"$in": userSubdivisionIds} }
		]}, function(err, folders) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				res.end(JSON.stringify(folders));
			}
		})
	})
	app.post("/f/getFilesInFolder", requireLogin, function(req, res) {
		File.find({folder: req.body.folder_id}, function(err, files) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				res.end(JSON.stringify(files));
			}
		})
	})
	app.post("/f/createFolder", requireLogin, function(req, res) {
		if (req.body.name.length < 22) {
			if (req.body.type == "teamFolder") {
				Folder.create({
					name: req.body.name,
					team: req.user.current_team.id,
					userMembers: req.body.userMembers,
					subdivisionMembers: req.body.subdivisionMembers,
					creator: req.user._id,
					parentFolder: undefined,
					ancestors: [],
					defaultFolder: false
				}, function(err, folder) {
					if (err) {
						console.error(err);
						res.end("fail");
					} else {
						res.end(JSON.stringify(folder));
					}
				});
			} else if (req.body.type == "subFolder") {
				Folder.create({
					name: req.body.name,
					team: req.user.current_team.id,
					userMembers: req.body.userMembers,
					subdivisionMembers: req.body.subdivisionMembers,
					parentFolder: req.body.parentFolder,
					ancestors: req.body.ancestors.concat([req.body.parentFolder]),
					creator: req.user._id,
					defaultFolder: false
				}, function(err, folder) {
					if (err) {
						console.error(err);
						res.end("fail");
					} else {
						res.end(JSON.stringify(folder));
					}
				});
			} else {
				res.end("fail");
			}
		} else {
			res.end("fail");
		}
	});
	app.post("/f/uploadFile", requireLogin, multer({limits: 50*1000000 /* 50 megabytes */}).single("uploadedFile"), function(req, res) {

		File.find({}).populate( "folder", null, { team: req.user.current_team.id } ).exec(function(err, files) {
			if (err) console.error(err);
			console.log(files);
		});

		let ext = req.file.originalname.substring(req.file.originalname.lastIndexOf(".")+1).toLowerCase() || "unknown";

		let mime = extToMime[ext];
		let disposition;

		if (mime == undefined) {
			disposition = "attachment; filename="+req.file.originalname;
			mime = "application/octet-stream";
		} else {
			disposition = "attachment; filename="+req.body.fileName+"."+ext;
		}

		req.body.fileName = util.normalizeDisplayedText(req.body.fileName);

		File.create({
			name: req.body.fileName,
			originalName: req.file.originalname,
			folder: req.body.currentFolderId,
			size: req.file.size,
			type: util.extToType(ext),
			mimetype: mime,
			creator: req.user._id
		}, function(err, file) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				util.uploadToDrive(req.file.buffer, file._id, mime, disposition, function(err, data) {
					if (err) {
						console.error(err);
						res.end("fail");
					} else {
						if (file.type != "image") {
							res.end(JSON.stringify(file));
						} else {
							lwip.open(req.file.buffer, ext, function(err, image) {
								if (err) {
									console.error(err);
									res.end("fail");
								} else {
									let hToWRatio = image.height()/image.width();
									if (hToWRatio >= 1) {
										image.resize(280, 280*hToWRatio, function(err, image) {
											if (err) {
												console.error(err);
												res.end("fail");
											} else {
												image.toBuffer(ext, function(err, buffer) {
													if (err) {
														console.error(err);
														res.end("fail");
													} else {
														util.uploadToDrive(buffer, file._id+"-preview", mime, disposition, function(err, data) {
															if (err) {
																console.error(err);
																res.end("fail");
															} else {
																res.end(JSON.stringify(file));
															}
														});
													}
												})
											}
										})
									} else {
										image.resize(280/hToWRatio, 280, function(err, image) {
											if (err) {
												console.error(err);
												res.end("fail");
											} else {
												image.toBuffer(ext, function(err, buffer) {
													if (err) {
														console.error(err);
														res.end("fail");
													} else {
														util.uploadToDrive(buffer, file._id+"-preview", mime, disposition, function(err, data) {
															if (err) {
																console.error(err);
																res.end("fail");
															} else {
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
	app.post("/f/deleteFile", requireLogin, function(req, res) {
		File.findOne({_id: req.body.file_id}, function(err, file) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				if (req.user._id.toString() == file.creator.toString() || req.user.current_team.position == "admin") {
					util.deleteFileFromDrive(req.body.file_id, function(err, data) {
						if (err) {
							console.error(err);
							res.end("fail");
						} else {
							file.remove(function(err) {
								if (err) {
									console.error(err);
									res.end("fail");
								} else {
									if (req.body.isImg) {
											util.deleteFileFromDrive(req.body.file_id+"-preview", function(err, data) {
												if (err) {
													console.error(err);
													res.end("fail");
												} else {
													res.end("success");
												}
											})
									} else {
										res.end("success");
									}
								}
							});
						}
					})
				} else {
					res.end("fail");
				}
			}
		});
	});

};
