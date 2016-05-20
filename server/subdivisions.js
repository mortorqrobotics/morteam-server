"use strict";

module.exports = function(imports) {

	let express = imports.modules.express;
	let Promise = imports.modules.Promise;
	let util = imports.util;
	let ObjectId = imports.modules.mongoose.Types.ObjectId;

	let requireLogin = util.requireLogin;
	let requireLeader = util.requireLeader;
	let requireAdmin = util.requireAdmin;

	let Subdivision = imports.models.Subdivision;
	let User = imports.models.User;
	let Event = imports.models.Event;
	let AttendanceHandler = imports.models.AttendanceHandler;

	let router = express.Router();

	router.get("/:id", Promise.coroutine(function*(req, res) {
		try {

			let subdivision = yield Subdivision.findOne({
				_id: req.params.id,
				team: req.user.current_team.id
			});

			if (!subdivision) {
				return util.subdivisionNotFound(res);
			}

			let users = yield User.find({
				subdivisions: {
					$elemMatch: {
						_id: subdivision._id, // TODO: maybe add toString
						accepted: true
					}
				}
			});

			let isMember = users.some(user => user._id.toString() == req.user._id.toString());

			if (subdivision.type == "public"
					|| (subdivision.type == "private" && isMember)) {

				return res.render("subdivision", {
					name: subdivision.name,
					type: subdivision.type,
					team: subdivision.team, // TODO: POSSIBLY CHANGE TO subdivision.team._id
					admin: req.user.current_team.position == "admin",
					joined: isMember,
					members: users,
					current_user_id: req.user._id
				});

			} else {
				res.end("nothing to see here.");
			}

		} catch (err) {
			util.send404();
		}
	}));

	router.post("/", requireLogin, requireLeader, Promise.coroutine(function*(req, res) {

		if (req.body.name.length >= 22) {
			return res.end("fail");
		}

		try {

			let subdivision = yield Subdivision.create({
				name: req.body.name,
				type: req.body.type,
				team: req.user.current_team.id
			});

			yield User.findByIdAndUpdate(req.user._id, {
				"$push": {
					"subdivisions": {
						_id: subdivision._id,
						team: req.user.current_team.id,
						accepted: true
					}
				}
			});

			res.end(subdivision._id.toString());

		} catch (err) {
			console.error(err.stack);
			res.end("fail");
		}
	}));

	router.post("/:id/invitations", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let subdivision = yield Subdivision.findById(req.params.id);

			if (!subdivision) {
				return res.end("fail");
			}

			let invitedUser = yield User.findById(req.body.user_id);

			if (!invitedUser) {
				return res.end("fail");
			}

			if (invitedUser.subdivisions.some(sub => sub._id == subdivision._id) {
				return res.end("already invited");
			}

			invitedUser.subdivisions.push({
				_id: new ObjectId(subdivision._id)
				team: req.user.current_team.id,
				accepted: false
			});

			yield invitedUser.save();

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/public", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let subdivisions = yield Subdivision.find({
				team: req.user.current_team.id,
				type: "public"
			});

			if (subdivisions) { // TODO: is this check necessary?
				res.json(subdivisions);
			} else {
				res.json([]);
			}

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/joined", requireLogin, Promise.coroutine(function*(req, res) {
		// get all subdivisions that user making the request is a member of

		let userSubdivisionIds = util.activeSubdivisionIds(req.user.subdivisions);

		try {

			let subdivisions = yield Subdivision.find({ // TODO: is the team check necessary here?
				_id: { "$in": userSubdivisionIds },
				team: req.user.current_team.id
			});

			if (!subdivisions) {
				return res.end("fail");
			}

			res.json(subdivisions.map(subdivision => ({
				name: subdivision.name,
				_id: subdivision._id
			})));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}

	}));

	router.get("/invitations", requireLogin, Promise.coroutine(function*(req, res) {

		if (req.user.subdivisions.length == 0) {
			return res.json([]);
		}

		let invitedSubdivisions = req.user.subdivisions
			.filter(subdivision => !subdivision.accepted)
			.map(subdivision => subdivision._id);

		try {

			let subdivisions = yield Subdivision.find({
				_id: { "$in": invitedSubdivisions },
				team: req.user.current_team.id
			});

			if (subdivisions) { // TODO: is the check necessary here?
				res.json(subdivisions);
			} else {
				res.end("fail");
			}

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.put("/:id/invitations/accept", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			yield User.update({
				_id: req.user._id,
				"subdivisions._id": new ObjectId(req.params.id)
			}, { "$set": {
				"subdivisions.$.accepted": true
			}});

			let events = yield Event.find({ subdivisionAttendees: req.params.id });

			yield Promise.all(events.map(event => AttendanceHandler.update({
				event: event._id,
				event_date: { "$gt": new Date() }
			}, { "$push": {
				attendees: {
					user: req.user._id,
					status: "absent"
				}
			}})));

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.put("/public/:id/join", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let subdivision = yield Subdivision.findById(req.params.id);

			if (subdivision.type != "public") {
				return res.end("fail");
			}

			yield User.findByIdAndUpdate(req.user._id, {
				"$pull": {
					"subdivisions": {
						_id: new ObjectId(subdivision._id),
						team: req.user.current_team.id,
						accepted: false
					}
				}
			});

			yield User.findByIdAndUpdate(req.user._id, {
				"$push": {
					"subdivisions": {
						_id: new ObjectId(subdivision._id),
						team: req.user.current_team.id,
						accepted: true
					}
				}
			});

			let events = yield Event.find({
				subdivisionAttendees: subdivision._id
			});

			yield Promise.all(events.map(event => AttendanceHandler.update({
				event: event._id,
				event_date: { "$gt": new Date() }
			}, {
				"$push": {
					attendees: {
						user: req.user._id,
						status: "absent"
					}
				}
			})));

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}

	}));

	router.put("/:id/invitations/ignore", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			yield User.findByIdAndUpdate(req.user._id, {
				"$pull": {
					"subdivisions": {
						_id: new ObjectId(req.params.id),
						team: req.user.current_team.id
					}
				}
			});

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.put("/:id/leave", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			yield User.findByIdAndUpdate(req.user._id, {
				"$pull": {
					"subdivisions": {
						_id: new ObjectId(req.params.id),
						team: req.user.current_team.id
					}
				}
			});

			let events = yield Event.find({
				subdivisionAttendees: req.params.id
			});

			yield Promise.all(events.map(event => AttendanceHandler.update({
				event: event
			}, {
				"$pull": {
					attendees: {
						user: req.user._id
					}
				}
			})));

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.delete("/:id", requireLogin, requireAdmin, Promise.coroutine(function*(req, res) {
		try {

			yield Subdivision.findOneAndRemove({
				_id: new ObjectId(req.params.id),
				team: req.user.current_team.id
			});

			yield User.update({
				teams: { $elemMatch: { id: req.user.current_team.id } }
			}, {
				"$pull": {
					"subdivisions": {
						_id: new ObjectId(req.params.id),
						team: req.user.current_team.id
					}
				}
			});

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.delete("/:id/user/:userId", requireLogin, requireAdmin, Promise.coroutine(function*(req, res) {
		try {

			yield User.update({
				_id: req.params.userId,
				teams: { $elemMatch: { "id": req.user.current_team.id } }
			}, {
				"$pull": { // TODO: maybe add new objectid
					"subdivisions" : {
						_id: new ObjectId(req.params.id),
						team: req.user.current_team.id,
						accepted: true
					}
				}
			});

			let events = yield Event.find({
				subdivisionAttendees: req.body.subdivision_id
			});

			// TODO: this seems to be repeated a lot
			yield Promise.all(events.map(event => AttendanceHandler.update({
				event: event._id
			}, {
				"$pull": {
					"attendees":  {
						user: req.body.use_id
					}
				}
			})));

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/:id/users", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let users = User.find({
				subdivisions: { $elemMatch: { _id: req.params.id,  accepted: true } }
			});

			res.json(users);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	return router;

};
