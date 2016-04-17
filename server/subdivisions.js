"use strict";

module.exports = function(app, util, schemas) {

	let ObjectId = require("mongoose").Types.ObjectId;
	let Promise = require("bluebird");

	let requireLogin = util.requireLogin;
	let requireLeader = util.requireLeader;
	let requireAdmin = util.requireAdmin;

	let Subdivision = schemas.Subdivision;
	let User = schemas.User;
	let Event = schemas.Event;
	let AttendanceHandler = schemas.AttendanceHandler;

	app.get("/s/:id", Promise.coroutine(function*(req, res) {
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

	app.post("/f/createSubdivision", requireLogin, requireLeader, Promise.coroutine(function*(req, res) {

		if (req.body.name.length >= 22) {
			return res.end("fail");
		}

		try {

			let subdivision = yield Subdivision.create({
				name: req.body.name,
				type: req.body.type,
				team: req.user.current_team.id
			});

			yield User.update({
				_id: req.user._id
			}, {
				"$push": {"subdivisions": {
						_id: subdivision._id,
						team: req.user.current_team.id,
						accepted: true
				}}
			});

			res.end(subdivision._id.toString());

		} catch (err) {
			console.error(err.stack);
			res.end("fail");
		}
	}));

	app.post("/f/inviteToSubdivision", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let subdivision = yield Subdivision.findOne({
				_id: req.body.subdivision_id
			});

			if (!subdivision) {
				return res.end("fail");
			}

			let user = yield User.findOne({
				_id: req.body.user_id
			});

			if (!user) {
				return res.end("fail");
			}

			if (user.subdivisions.some(sub => sub._id ==  req.body.subdivision_id)) {
				return res.end("already invited");
			}

			user.subdivisions.push({
				_id: new ObjectId(req.body.subdivision_id),
				team: req.user.current_team.id,
				accepted: false
			});

			yield user.save();

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/getPublicSubdivisions", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let subdivisions = yield Subdivision.find({
				team: req.user.current_team.id,
				type: "public"
			});

			if (subdivisions) {
				res.end(JSON.stringify(subdivisions));
			} else {
				res.end("[]");
			}

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/getAllSubdivisionsForUserInTeam", requireLogin, Promise.coroutine(function*(req, res) {

		let userSubdivisionIds = req.user.subdivisions
			.filter(subdivision => subdivision.accepted && subdivision.team == req.user.current_team.id)
			.map(subdivision => subdivision._id);

		try {

			let subdivisions = yield Subdivision.find({
				_id: { "$in": userSubdivisionIds },
				team: req.user.current_team.id
			});

			if (!subdivisions) {
				return res.end("fail");
			}

			res.end(JSON.stringify(subdivisions.map(subdivision => ({
				name: subdivision.name,
				_id: subdivision._id
			}))));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}

	}));

	app.post("/f/loadSubdivisionInvitations", requireLogin, Promise.coroutine(function*(req, res) {

		if (req.user.subdivisions.length == 0) {
			return res.end("[]");
		}

		let invitedSubdivisions = req.user.subdivisions
			.filter(subdivision => !subdivision.accepted && subdivision.team == req.user.current_team.id)
			.map(subdivision => subdivision._id);

		try {

			let subdivisions = yield Subdivision.find({
				_id: { "$in": invitedSubdivisions },
				team: req.user.current_team.id
			});

			if (subdivisions) {
				res.end(JSON.stringify(subdivisions));
			} else {
				res.end("fail");
			}

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/acceptSubdivisionInvitation", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			yield User.update({
				_id: req.user._id,
				"subdivisions._id": new ObjectId(req.body.subdivision_id)
			}, {"$set": {
				"subdivisions.$.accepted": true
			}});

			let events = yield Event.find({ subdivisionAttendees: req.body.subdivision_id });

			yield Promise.all(events.map(event => AttendanceHandler.update({
				event: event._id,
				event_date: {"$gt": new Date()}
			}, {"$push": {
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

	app.post("/f/joinPublicSubdivision", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let subdivision = yield Subdivision.findOne({_id: req.body.subdivision_id});

			if (subdivision.type != "public") {
				return res.end("fail");
			}

			yield User.update({_id: req.user._id}, {"$pull": {
				"subdivisions": {
					_id: new ObjectId(req.body.subdivision_id),
					team: req.user.current_team.id,
					accepted: false
				}
			}});

			yield User.update({_id: req.user._id}, {"$push": {
				"subdivisions": {
					_id: new ObjectId(req.body.subdivision_id),
					team: req.user.current_team.id,
					accepted: true
				}
			}});

			let events = yield Event.find({subdivisionAttendees: req.body.subdivision_id});

			yield Promise.all(events.map(event => AttendanceHandler.update({
				event: event._id,
				event_date: {"$gt": new Date()}
			}, {"$push": {
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

	app.post("/f/ignoreSubdivisionInvite", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			yield User.update({_id: req.user._id}, {"$pull": {
				"subdivisions": {
					_id: new ObjectId(req.body.subdivision_id),
					team: req.user.current_team.id
				}
			}});

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/leaveSubdivision", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			yield User.update({_id: req.user._id}, {"$pull": {
				"subdivisions": {
					_id: new ObjectId(req.body.subdivision_id),
				 	team: req.user.current_team.id
				}
			}});

			let events = yield Event.find({ subdivisionAttendees: req.body.subdivision_id });

			yield Promise.all(events.map(event => AttendanceHandler.update({
				event: event
			}, {"$pull": {
				attendees: {
					user: req.user._id
				}
			}})));

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/deleteSubdivision", requireLogin, requireAdmin, Promise.coroutine(function*(req, res) {
		try {

			let user = User.findOne({_id: req.user._id});

			if (!user) {
				return res.end("fail");
			}

			yield Subdivision.findOneAndRemove({
				_id: new ObjectId(req.body.subdivision_id),
				team: req.user.current_team.id
			});

			yield User.update({
				teams: {$elemMatch: {id: req.user.current_team.id}}
			}, {"$pull": {
				"subdivisions": {
					_id: new ObjectId(req.body.subdivision_id),
					team: req.user.current_team.id
				}
			}});

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/removeUserFromSubdivision", requireLogin, requireAdmin, Promise.coroutine(function*(req, res) {
		try {

			yield User.update({
				_id: req.body.user_id,
				teams: { $elemMatch: { "id": req.user.current_team.id } }
			}, { "$pull": { // TODO: maybe add new objectid
				"subdivisions" : {
					_id: new ObjectId(req.body.subdivision_id),
					team: req.user.current_team.id,
					accepted: true
				}
			}});

			let events = yield Event.find({ subdivisionAttendees: req.body.subdivision_id });

			yield Promise.all(events.map(event => AttendanceHandler.update({
				event: event._id
			}, {"$pull": {
				"attendees":  {
					user: req.body.use_id
				}
			}})));

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/getUsersInSubdivision", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let users = User.find({
				subdivisions: { $elemMatch: { _id: req.body.subdivision_id, accepted: true } }
			});

			res.end(JSON.stringify(users));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

};
