"use strict";

let Promise = require("bluebird");
let util = require("./util.js");
let express = require("express");

let requireLogin = util.requireLogin;
let requireLeader = util.requireLeader;
let requireAdmin = util.requireAdmin;

module.exports = function(schemas) {

	let User = schemas.User;
	let Team = schemas.Team;
	let AttendanceHandler = schemas.AttendanceHandler;
	let Folder = schemas.Folder;

	let router = express.Router();

	router.get("/", requireLogin, Promise.coroutine(function*(req, res) {
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

	router.get("/users", requireLogin, Promise.coroutine(function*(req, res) {
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

	router.post("/", requireLogin, Promise.coroutine(function*(req, res) {
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

	router.put("/:teamId/join", requireLogin, Promise.coroutine(function*(req, res) {
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

	router.get("/number", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let team = yield Team.findOne({id: req.user.current_team.id});

			res.end(String(team.number));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/:teamNum/exists", requireLogin, Promise.coroutine(function*(req, res) {
		try {
			
			if (yield Team.find({number: parseInt(req.params.teamNum)})) {
				res.json(teams[0]); // TODO: should this just be "true" instead?
			} else {
				res.end("false");
			}

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	return router;

};
