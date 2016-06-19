"use strict";

module.exports = function(imports) {

	let express = imports.modules.express;
	let Autolinker = imports.modules.autolinker;
	let ObjectId = imports.modules.mongoose.Types.ObjectId;
	let Promise = imports.modules.Promise;
	let util = imports.util;

	let requireLogin = util.requireLogin;
	let requireAdmin = util.requireAdmin;

	let Announcement = imports.models.Announcement;
	let User = imports.models.User;

	let router = express.Router();

	router.post("/announcements", requireLogin, Promise.coroutine(function*(req, res) {

		// attempt to convert audience request to JSON in case client does not explicitly send it as a JSON type
		try {
			req.body.audience = JSON.parse(req.body.audience);
		}  catch (ex) {}

		// add <a> tags to detected links
		req.body.content = Autolinker.link(req.body.content);
		let announcement = {
			author: req.user._id,
			content: req.body.content,
			team: req.user.current_team._id,
			timestamp: new Date()
		};

		try {

			let users;

			if (typeof(req.body.audience) == "object") { // this means user has selected "custom" audience
				// TODO: seems like this should be reworked
				// multiple parameters of different types instead of changing the type of one parameter
	
				announcement.subdivisionAudience = req.body.audience.subdivisionMembers;
				announcement.userAudience = req.body.audience.userMembers;
				announcement = yield Announcement.create(announcement);
	
				users = yield User.find({$or: [
					{ _id: { $in: req.body.audience.userMembers } },
					// users that have a subdivision which has an _id that is in the audience.subdivisionMembers array
					{ subdivisions: { $elemMatch: { "_id": { $in: req.body.audience.subdivisionMembers } } } }
				] }).exec();
	
			} else if (req.body.audience == "everyone") {
	
				announcement.entireTeam = true;
				announcement = yield Announcement.create(announcement);
	
				// find all users in the current team
				users = yield User.find({ teams: {
					$elemMatch: { _id: req.user.current_team._id } }
				}).exec();
			
			} else { // this means that the user selected a specific subdivision to send the announcement to
	
				announcement.subdivisionAudience = [new ObjectId(String(req.body.audience))];
				announcement = yield Announcement.create(announcement);
	
				// find users that have a subdivision which has an _id that is equal to req.body.audience(the subdivision _id)
				users = yield User.find({
						subdivisions: { $elemMatch: { _id: req.body.audience } }
				}).exec();
	
			}
	
			res.end(announcement._id.toString());
	
		   	// send emails
			if (util.isUserAdmin(req.user)) {
	
				// creates a string which is a list of recipients with the following format: "a@a.com, b@b.com, c@c.com"
				let recipients = util.createRecipientList(users);
	
				let info = yield util.sendEmail({
					to: recipients,
					subject: "New Announcement By " + req.user.firstname + " " + req.user.lastname,
					html: announcement.content
				});
				console.log(info);
	
			}

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/announcements", requireLogin, Promise.coroutine(function*(req, res) {
		// creates an array of the _ids of the subdivisions that the user is a member of
		let userSubdivisionIds = util.activeSubdivisionIds(req.user.subdivisions);

		try {

			// find announcements that the user should be able to see
			let announcements = yield Announcement.find({
				team: req.user.current_team._id,
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
			}).populate("author")
				.populate("userAudience")
				.populate("subdivisionAudience")
				.sort("-timestamp")
				.skip(Number(req.query.skip))
				.limit(20)
				.exec();

			res.json(announcements);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.delete("/announcements/id/:annId", requireLogin, Promise.coroutine(function*(req, res) {
		try {
			let announcement = yield Announcement.findOne({ _id: req.params.annId });

			// check if user is eligible to delete said announcement
			if (req.user._id == announcement.author.toString() || util.isUserAdmin(req.user)) {
				yield announcement.remove();
				res.end("success");
			} else {
				// warn me about attempted hax, bruh
				yield util.sendEmail({
						to: "rafezyfarbod@gmail.com",
						subject: "MorTeam Security Alert!",
						text: "The user " + req.user.firstname + " " + req.user.lastname + " tried to perform administrator tasks. User ID: " + req.user._id
				});
				res.end("fail");
			}
		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	return router;

};
