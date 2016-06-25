"use strict";

module.exports = function(imports) {

	let express = imports.modules.express;
	let Promise = imports.modules.Promise;
	let util = imports.util;

	let requireLogin = util.requireLogin;
	let requireAdmin = util.requireAdmin;

	let User = imports.models.User;
	let Team = imports.models.Team;
	let AttendanceHandler = imports.models.AttendanceHandler;
	let Folder = imports.models.Folder;

	let router = express.Router();

	router.get("/teams/current/users", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let users = yield User.find({
				team: req.user.team
			});

			res.json(users);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.post("/teams", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			if (req.user.team) {
				return res.end("already have a team");
			}

			if (yield Team.findOne({ id: req.body.id })) {
				return res.end("fail");
			}

			let team = yield Team.create({
				id: req.body.id,
				name: req.body.name,
				number: req.body.number
			});

			let folder = yield Folder.create({
				name: "Team Files",
				team: team._id,
				entireTeam: true,
				creator: req.user._id,
				defaultFolder: true
			});

			res.end(team._id.toString());

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.post("/teams/code/:teamCode/join", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			if (req.user.team) {
				return res.end("fail");
			}

			let team = yield Team.findOne({
				id: req.params.teamCode
			});
			
			if (!team) {
				return res.end("fail");
			}

			if (req.user.bannedFromTeams.indexOf(team._id) != -1) {
				return res.end("fail");
			}

			req.user.position = (yield User.find({ team: team._id })) ? "member" : "leader";
			req.user.team = team._id;

			yield AttendanceHandler.update({
				entireTeam: true,
				event_date: { $gte: new Date() },
				"event.team": team._id
			}, {"$push": {
				"attendees": { user: req.user._id, status: "absent" }
			}});
			
			yield req.user.save();
			
			yield Folder.create({
				name: "Personal Files",
				team: team._id,
				userMembers: req.user._id, // TODO: should this be an [req.user._id] instead?
				creator: req.user._id,
				defaultFolder: true
			});

			res.end(team._id.toString());

		} catch (err) {
			console.log(err);
			res.end("fail");
		}
	}));

	router.get("/teams/current/number", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let team = yield Team.findOne({
				_id: req.user.team
			});

			res.end(String(team.number));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/teams/number/:teamNum/exists", requireLogin, Promise.coroutine(function*(req, res) {
		try {
			
			if (yield Team.find({ number: parseInt(req.params.teamNum) })) {
				res.json(teams[0]); // TODO: should this just be "true" instead?
				// the team is used by the client, instead of being "true" the route should be renamed, getIfExists or something
			} else {
				res.end("false");
			}

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.delete("/teams/current/users/id/:userId", requireLogin, requireAdmin, Promise.coroutine(function*(req, res) {
		// remove a user from a team
		try {

			let user = yield User.findOne({
				_id: req.params.userId,
				team: req.user.team
			});

			if (!user) {
				return res.end("fail");
			}

			if (util.isUserAdmin(user) && (yield User.count({
				team: req.user.team,
				position: util.adminPositionsQuery
			})) <= 1) {
				return res.end("You cannot remove the only Admin on your team.");
			}

			delete user.team;
			delete user.position;
			delete user.scoutCaptain;
			user.subdivisions = [];
			yield user.save(); // TODO: does deleting then saving actually delete stuff?

			yield Chat.update({
				team: req.user.team,
				userMembers: new ObjectId(req.params.userId)
			}, {
				"$pull": {
					"userMembers": req.params.userId
				}
			});

			yield Folder.update({
				team: req.user.team,
				userMembers: new ObjectId(req.params.userId)
			}, {
				"$pull": {
					"userMembers": req.params.userId
				}
			});

			yield Event.update({
				team: req.user.team,
				userAttendees: new ObjectId(req.params.userId)
			}, {
				"$pull": {
					"userAttendees": req.params.userId
				}
			});

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	// TODO: does this need to exist?
	router.get("/users/id/:userId/teamInfo", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let user = yield User.findOne({
				_id: req.params.userId,
				team: req.user.team
			});

			res.json({
				team: user.team,
				position: user.position,
				scoutCaptain: user.scoutCaptain
			});

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	return router;

};
