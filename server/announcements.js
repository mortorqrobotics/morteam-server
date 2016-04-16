"use strict";

module.exports = function(app, util, schemas) {

	let Autolinker = require( "autolinker" );
	let ObjectId = require("mongoose").Types.ObjectId;

	let requireLogin = util.requireLogin;
	let requireAdmin = util.requireAdmin;

	let Announcement = schemas.Announcement;
	let User = schemas.User;

	app.post("/f/postAnnouncement", requireLogin, function(req, res) {
		// attempt to convert audience request to JSON in case client does not explicitly send it as a JSON type
		try {
			req.body.audience = JSON.parse(req.body.audience);
		}  catch(e) { }
		// add <a> tags to detected links
		req.body.content = Autolinker.link(req.body.content);
		let announcement = {
			author: req.user._id,
			content: req.body.content,
			team: req.user.current_team.id,
			timestamp: new Date()
		};
		Promise.resolve().then(function() {
			if (typeof(req.body.audience) == "object") { //this means user has selected "custom" audience
				announcement.subdivisionAudience = req.body.audience.subdivisionMembers;
				announcement.userAudience = req.body.audience.userMembers;
				return Announcement.create(announcement).then(function(_announcement) {
					announcement = _announcement;
					return User.find({$or: [
						{ _id: { $in: req.body.audience.userMembers } },
						// users that have a subdivision which has an _id that is in the audience.subdivisionMembers array
						{ subdivisions: { $elemMatch: { "_id": { $in: req.body.audience.subdivisionMembers } } } }
					] }, "-password").exec();
				});
			} else if (req.body.audience == "everyone") {
				announcement.entireTeam = true;
				return Announcement.create(announcement).then(function(_announcement) {
					announcement = _announcement;
					// find all users in the current team
					return User.find({ teams: {
						$elemMatch: {id: req.user.current_team.id }}
					}, "-password").exec();
				});
			} else { // this means that the user selected a specific subdivision to send the announcement to
				annoucenement.subdivisionAudience = [new ObjectId(String(req.body.audience))];
				return Announcement.create(announcement).then(function(_announcement) {
					announcement = _announcement;
					// find users that have a subdivision which has an _id that is equal to req.body.audience(the subdivision _id)
					return User.find({
						subdivisions: { $elemMatch: { _id: req.body.audience } }
					}, "-password").exec();
				});
			}
		}).then(function(users) { // send emails
			res.end(announcement._id.toString());
			if (req.user.current_team.position != "member") {
				// creates a string which is a list of recepients with the following format: "a@a.com, b@b.com, c@c.com"
				let list = util.createRecepientList(users);
				return util.sendEmail({
					to: list,
					subject: "New Announcement By " + req.user.firstname + " " + req.user.lastname,
					html: announcement.content
				}).then(function(info) {
					console.log(info);
				});
			}
		}).catch(function(err) {
			console.error(err);
			res.end("fail");
		});
	});

	app.post("/f/getAnnouncementsForUser", requireLogin, function(req, res) {
		// creates an array of the _ids of the subdivisions that the user is a member of
		let userSubdivisionIds = util.activeSubdivisionIds(req.user.subdivisions);
		// find announcements that the user should be able to see
		Announcement.find({
			team: req.user.current_team.id,
			$or: [
				{
					entireTeam: true
				}, {
					userAudience: req.user._id
				}, {
					subdivisionAudience: {
						"$in": userSubdivisionIds
					}
				}
			]
		}, {
			// only respond with _id, author, content and timestamp
			_id: 1,
			author: 1,
			content: 1,
			timestamp: 1,
			userAudience: 1,
			subdivisionAudience: 1,
			entireTeam: 1
			// populate author and sort by timestamp, skip and limit are for pagination
		}).populate("author", "-password")
			.populate("userAudience")
			.populate("subdivisionAudience")
			.sort("-timestamp")
			.skip(Number(req.body.skip))
			.limit(20)
			.exec()
			.then(function(announcements) {
				res.json(announcements)
			})
			.catch(function(err) {
				console.error(err);
				res.end("fail");
			});
	});

	app.post("/f/deleteAnnouncement", requireLogin, function(req, res) {
		Announcement.findOne({
			_id: req.body._id
		}).exec().then(function(announcement) {
			// check if user is eligible to delete said announcement
			if (req.user._id == announcement.author.toString() || req.user.current_team.position == "admin") {
				return announcement.remove().then(function() {
					res.end("success");
				});
			} else {
				// warn me about attempted hax, bruh
				util.notify.sendMail({
						from: "MorTeam Notification <notify@morteam.com>",
						to: "rafezyfarbod@gmail.com",
						subject: "MorTeam Security Alert!",
						text: "The user " + req.user.firstname + " " + req.user.lastname + " tried to perform administrator tasks. User ID: " + req.user._id
				});
				res.end("fail");
			}
		}).catch(function(err) {
			console.error(err);
			res.end("fail");
		});
	});

};
