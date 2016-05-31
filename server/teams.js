"use strict";

module.exports = function(imports) {

	let express = imports.modules.express;
	let Promise = imports.modules.Promise;
	let util = imports.util;

	let requireLogin = util.requireLogin;
	let requireLeader = util.requireLeader;
	let requireAdmin = util.requireAdmin;

	let User = imports.models.User;
	let Team = imports.models.Team;
	let AttendanceHandler = imports.models.AttendanceHandler;
	let Folder = imports.models.Folder;

	let router = express.Router();

	router.get("/teams/current", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let users = yield User.find({
				teams: { $elemMatch: { id: req.user.current_team.id } }
			});

			let team = yield Team.findById(req.user.current_team.id);

			res.render("team", {
				teamName: team.name,
				teamNum: team.number,
				teamId: team.id,
				members: users,
				viewerIsAdmin: req.user.current_team.position == "admin",
			});

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/teams/current/users", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let users = yield User.find({
				teams: {$elemMatch: {id: req.user.current_team.id }}
			});

			res.json(users);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.post("/teams", requireLogin, Promise.coroutine(function*(req, res) {
		try {

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
				team: team.id,
				entireTeam: true,
				creator: req.user._id,
				defaultFolder: true
			});

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.post("/teams/:teamId/join", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let team = yield Team.findOne({id: req.params.teamId});
			
			if (!team) {
				return res.end("no such team");
			}

			if (req.user.bannedFromTeams.length > 0
					&& req.user.bannedFromTeams.indexOf(req.params.teamId) != -1 ) {
				return res.end("banned");
			}

			let users = yield User.find({ teams: { $elemMatch: { "id": req.params.teamId } } });

			let newTeam = {
				id: req.params.teamId,
				position: users.length == 0 ? "admin" : "member" // make the first member an admin
			};
			if (user.teams.length == 0) {
				user.current_team = newTeam;
			}
			user.teams.push(newTeam);

			// TODO: does this do what it is supposed to do?
			yield AttendanceHandler.update({
				entireTeam: true,
				event_date: { $gte: new Date() }
			}, {"$push": {
				"attendees": { user: req.user._id, status: "absent" }
			}});
			
			yield user.save();
			
			yield Folder.create({
				name: "Personal Files",
				team: req.params.teamId,
				userMembers: req.user._id, // TODO: should this be an [req.user._id] instead?
				creator: req.user._id,
				defaultFolder: true
			});

			res.end("success");

		} catch (err) {
			console.log(err);
			res.end("fail");
		}
	}));

	router.get("/teams/current/number", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let team = yield Team.findOne({id: req.user.current_team.id});

			res.end(String(team.number));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/teams/number/:teamNum/exists", requireLogin, Promise.coroutine(function*(req, res) {
		try {
			
			if (yield Team.find({number: parseInt(req.params.teamNum)})) {
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

	router.delete("/teams/current/users/:userId", requireLogin, requireAdmin, Promise.coroutine(function*(req, res) {
		// remove a user from a team
		try {

			let user = yield User.findOne({ _id: req.params.userId });

			if (user.current_team.position == "admin" && (yield User.count({
				teams: {
					id: req.user.current_team.id,
					position: "admin"
				}
			})) <= 1) {
				return res.end("You cannot remove the only Admin on your team.");
			}

			if (user.current_team.id == req.user.current_team.id) {
				user.current_team = undefined; // TODO: make it so that if current_team is undefined when logging in, it allows you to set current_team
				yield user.save();
			}

			user = yield User.update({
				_id: req.params.userId
			}, { "$pull": {
				"teams": { id: req.user.current_team.id },
				"subdivisions": { team: req.user.current_team.id }
			}});

			yield Chat.update({
				team: req.user.current_team.id,
				userMembers: new ObjectId(req.params.userId)
			}, {
				"$pull": {
					"userMembers": req.params.userId
				}
			});

			yield Folder.update({
				team: req.user.current_team.id,
				userMembers: new ObjectId(req.params.userId)
			}, {
				"$pull": {
					"userMembers": req.body.user_id
				}
			});

			yield Event.update({
				team: req.user.current_team.id,
				userAttendees: new ObjectId(req.body.user_id)
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

	app.get("/users/:userId/teams", requireLogin, Promise.coroutine(function*(req, res) {
		try {
			let user = yield User.findOne({
				_id: req.body._id
			});
			res.json({
				"teams": user.teams,
				"current_team": user.current_team
			});
		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	return router;

};
