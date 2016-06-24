"use strict";

module.exports = function(imports) {

	let express = imports.modules.express;
	let Promise = imports.modules.Promise;
	let util = imports.util;
	let ObjectId = imports.modules.mongoose.Types.ObjectId;

	let requireLogin = util.requireLogin;
	let requireAdmin = util.requireAdmin;

	let Subdivision = imports.models.Subdivision;
	let User = imports.models.User;
	let Event = imports.models.Event;
	let AttendanceHandler = imports.models.AttendanceHandler;

	let router = express.Router();

	router.post("/subdivisions", requireLogin, requireAdmin, Promise.coroutine(function*(req, res) {

		if (req.body.name.length >= 22) {
			return res.end("fail");
		}

		try {

			let subdivision = yield Subdivision.create({
				name: req.body.name,
				type: req.body.type,
				team: req.user.team
			});

			yield User.findOneAndUpdate({
				_id: req.user._id
			}, {
				"$push": {
					"subdivisions": {
						_id: subdivision._id,
						team: req.user.team,
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

	router.post("/subdivisions/id/:subdivId/invitations/userId/:userId", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let subdivision = yield Subdivision.findOne({
				_id: req.params.subdivId
			});

			if (!subdivision) {
				return res.end("fail");
			}

			let invitedUser = yield User.findOne({
				_id: req.params.userId
			});

			if (!invitedUser) {
				return res.end("fail");
			}

			if (invitedUser.subdivisions.some(sub => sub._id == subdivision._id)) {
				return res.end("already invited");
			}

			invitedUser.subdivisions.push({
				_id: new ObjectId(subdivision._id),
				team: req.user.team,
				accepted: false
			});

			yield invitedUser.save();

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/subdivisions/public", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let subdivisions = yield Subdivision.find({
				team: req.user.team,
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

	router.get("/subdivisions/joined", requireLogin, Promise.coroutine(function*(req, res) {
		// get all subdivisions that user making the request is a member of

		let userSubdivisionIds = util.activeSubdivisionIds(req.user.subdivisions);

		try {

			let subdivisions = yield Subdivision.find({ // TODO: is the team check necessary here?
				_id: { "$in": userSubdivisionIds },
				team: req.user.team
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

	router.get("/subdivisions/invitations", requireLogin, Promise.coroutine(function*(req, res) {

		if (req.user.subdivisions.length == 0) {
			return res.json([]);
		}

		let invitedSubdivisions = req.user.subdivisions
			.filter(subdivision => !subdivision.accepted)
			.map(subdivision => subdivision._id);

		try {

			let subdivisions = yield Subdivision.find({
				_id: { "$in": invitedSubdivisions },
				team: req.user.team
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

	router.put("/subdivisions/id/:subdivId/invitations/accept", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			yield User.update({
				_id: req.user._id,
				"subdivisions._id": new ObjectId(req.params.subdivId)
			}, { "$set": {
				"subdivisions.$.accepted": true
			}});

			let events = yield Event.find({ subdivisionAttendees: req.params.subdivId });

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

	router.post("/subdivisions/public/id/:subdivId/join", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let subdivision = yield Subdivision.findOne({
				_id: req.params.subdivId
			});

			if (subdivision.type != "public") {
				return res.end("fail");
			}

			yield User.findOneAndUpdate({
				_id: req.user._id
			}, {
				"$pull": {
					"subdivisions": {
						_id: new ObjectId(subdivision._id),
						team: req.user.team,
						accepted: false
					}
				}
			});

			yield User.findOneAndUpdate({
				_id: req.user._id
			}, {
				"$push": {
					"subdivisions": {
						_id: new ObjectId(subdivision._id),
						team: req.user.team,
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

	router.post("/subdivisions/id/:subdivId/invitations/ignore", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			yield User.findOneAndUpdate({
				_id: req.user._id
			}, {
				"$pull": {
					"subdivisions": {
						_id: new ObjectId(req.params.subdivId),
						team: req.user.team
					}
				}
			});

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.post("/subdivisions/id/:subdivId/leave", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			yield User.findOneAndUpdate({
				_id: req.user._id
			}, {
				"$pull": {
					"subdivisions": {
						_id: new ObjectId(req.params.subdivId),
						team: req.user.team
					}
				}
			});

			let events = yield Event.find({
				subdivisionAttendees: req.params.subdivId
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

	router.delete("/subdivisions/id/:subdivId", requireLogin, requireAdmin, Promise.coroutine(function*(req, res) {
		try {

			yield Subdivision.findOneAndRemove({
				_id: new ObjectId(req.params.subdivId),
				team: req.user.team
			});

			yield User.update({
				team: req.user.team
			}, {
				"$pull": {
					"subdivisions": {
						_id: new ObjectId(req.params.subdivId),
						team: req.user.team
					}
				}
			});

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.delete("/subdivisions/id/:subdivId/users/id/:userId", requireLogin, requireAdmin, Promise.coroutine(function*(req, res) {
		try {

			// TODO: check permissions...

			yield User.update({
				_id: req.params.userId,
				team: req.user.team
			}, {
				"$pull": { // TODO: maybe add new objectid
					"subdivisions" : {
						_id: new ObjectId(req.params.subdivId),
						team: req.user.team
						accepted: true
					}
				}
			});

			let events = yield Event.find({
				subdivisionAttendees: req.params.subdivId
			});

			// TODO: this seems to be repeated a lot
			yield Promise.all(events.map(event => AttendanceHandler.update({
				event: event._id
			}, {
				"$pull": {
					"attendees":  {
						user: req.params.userId
					}
				}
			})));

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/subdivisions/id/:subdivId/users", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let users = User.find({
				subdivisions: { $elemMatch: { _id: req.params.subdivId,  accepted: true } }
			});

			res.json(users);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	return router;

};
