"use strict";

module.exports = function(app, util, schemas) {

	let Autolinker = require( "autolinker" );
	let ObjectId = require("mongoose").Types.ObjectId;

	//assign variables to util functions(and objects) and database schemas
	for (key in util) {
		eval("var " + key + " = util." + key + ";");
	}
	for (key in schemas) {
		eval("var " + key + " = schemas." + key + ";");
	}

	app.post("/f/postAnnouncement", requireLogin, function(req, res) {
		//attempt to convert audience request to JSON in case client does not explicitly send it as a JSON type
		try {
			req.body.audience = JSON.parse(req.body.audience);
		}  catch(e) { }
		//add <a> tags to detected links
		req.body.content = Autolinker.link( req.body.content )
		if (typeof(req.body.audience) == "object") { //this means user has selected "custom" audience
			Announcement.create({
				author: req.user._id,
				content: req.body.content,
				team: req.user.current_team.id,
				timestamp: new Date(),
				subdivisionAudience: req.body.audience.subdivisionMembers,
				userAudience: req.body.audience.userMembers
			}, function(err, announcement) {
				if (err) {
					console.error(err);
					res.end("fail");
				} else {
					//announcement has been added to database. Now we need to send an email to everyone who is supposed to see it.
					User.find({ $or: [
						{ _id: { $in: req.body.audience.userMembers } },
						//users that have a subdivision which has an _id that is in the audience.subdivisionMembers array
						{ subdivisions: { $elemMatch: { "_id": { $in: req.body.audience.subdivisionMembers } } } }
					] }, "-password", function(err, users) {
						if (err) {
							console.error(err);
							res.end("fail");
						} else if (req.user.current_team.position != "member") {
							//creates a string which is a list of recepients with the following format: "a@a.com, b@b.com, c@c.com"
							let list = createRecepientList(users);
							notify.sendMail({
									from: "MorTeam Notification <notify@morteam.com>",
									to: list,
									subject: "New Announcement By " + req.user.firstname + " " + req.user.lastname,
									html: announcement.content
							}, function(err, info) {
								if (err) {
									console.log("Email error:");
									console.error(err);
								} else {
									console.log("info:");
									console.log(info);
								}
							});
						}
						res.end(announcement._id.toString());
					})
				}
			});
		} else {
			if (req.body.audience == "everyone") {
				Announcement.create({
					author: req.user._id,
					content: req.body.content,
					team: req.user.current_team.id,
					timestamp: new Date(),
					entireTeam: true
				}, function(err, announcement) {
					if (err) {
						console.error(err);
						res.end("fail");
					} else {
						//find all users in the current team
						User.find({ teams: {$elemMatch: {id: req.user.current_team.id }} }, "-password", function(err, users) {
							if (err) {
								console.error(err);
								res.end("fail");
							} else if (req.user.current_team.position != "member") {
								//creates a string which is a list of recepients with the following format: "a@a.com, b@b.com, c@c.com"
								let list = createRecepientList(users);
								notify.sendMail({
										from: "MorTeam Notification <notify@morteam.com>",
										to: list,
										subject: "New Announcement By " + req.user.firstname + " " + req.user.lastname,
										html: announcement.content
								}, function(err, info) {
									if (err) {
										console.log("Email error:");
										console.error(err);
									} else {
										console.log("info:");
										console.log(info);
									}
								});
							}
							res.end(announcement._id.toString());
						})
					}
				});
			} else { //this means that the user selected a specific subdivision to send the announcement to
				Announcement.create({
					author: req.user._id,
					content: req.body.content,
					team: req.user.current_team.id,
					timestamp: new Date(),
					subdivisionAudience: [new ObjectId(String(req.body.audience))] //req.body.audience is a string that is the _id of said subdivision
				}, function(err, announcement) {
					if (err) {
						console.error(err);
						res.end("fail");
					} else {
						//find users that have a subdivision which has an _id that is equal to req.body.audience(the subdivision _id)
						User.find({
							subdivisions: { $elemMatch: { _id: req.body.audience } }
						}, "-password", function(err, users) {
							if (err) {
								console.error(err);
								res.end("fail");
							} else {
								//creates a string which is a list of recepients with the following format: "a@a.com, b@b.com, c@c.com"
								let list = createRecepientList(users);
								notify.sendMail({
										from: "MorTeam Notification <notify@morteam.com>",
										to: list,
										subject: "New Announcement By " + req.user.firstname + " " + req.user.lastname,
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
		//creates an array of the _ids of the subdivisions that the user is a member of
		let userSubdivisionIds = activeSubdivisionIds(req.user.subdivisions);
		//find announcements that the user should be able to see
		Announcement.find({
			team: req.user.current_team.id,
			$or: [
				{
					entireTeam: true
				},
				{
					userAudience: req.user._id
				},
				{
					subdivisionAudience: {
						"$in": userSubdivisionIds
					}
				}
			]
		},
		{
			//only respond with _id, author, content and timestamp
			_id: 1,
			author: 1,
			content: 1,
			timestamp: 1,
			userAudience: 1,
			subdivisionAudience: 1,
			entireTeam: 1
			//populate author and sort by timestamp, skip and limit are for pagination
		}).populate("author", "-password").populate("userAudience").populate("subdivisionAudience").sort("-timestamp").skip(Number(req.body.skip)).limit(20).exec(function(err, announcements) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				res.json(announcements)
			}
		})
	})
	app.post("/f/deleteAnnouncement", requireLogin, function(req, res) {
		Announcement.findOne({_id: req.body._id}, function(err, announcement) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				//check if user is eligible to delete said announcement
				if (req.user._id == announcement.author.toString() || req.user.current_team.position == "admin") {
					announcement.remove(function(err) {
						if (err) {
							console.error(err);
							res.end("fail");
						} else {
							res.end("success");
						}
					})
				} else {
					//warn me about attempted hax, bruh
					notify.sendMail({
							from: "MorTeam Notification <notify@morteam.com>",
							to: "rafezyfarbod@gmail.com",
							subject: "MorTeam Security Alert!",
							text: "The user " + req.user.firstname + " " + req.user.lastname + " tried to perform administrator tasks. User ID: " + req.user._id
					});
					res.end("fail");
				}
			}
		});
	});

};
