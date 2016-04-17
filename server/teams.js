"use strict";

module.exports = function(app, util, schemas) {

	let Promise = require("bluebird");

	let requireLogin = util.requireLogin;
	let requireLeader = util.requireLeader;
	let requireAdmin = util.requireAdmin;

	let User = schemas.User;
	let Team = schemas.Team;
	let AttendanceHandler = schemas.AttendanceHandler;
	let Folder = schemas.Folder;

	app.get("/team", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let users = yield User.find({ teams: { $elemMatch: { id: req.user.current_team.id } } });

			let team = yield Team.findOne({id: req.user.current_team.id});

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

	app.post("/f/getUsersInTeam", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let users = yield User.find({
				teams: {$elemMatch: {id: req.user.current_team.id }}
			});

			res.end(JSON.stringify(users));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/createTeam", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let teams = yield Team.find({id: req.body.id});

			if (teams.length != 0) {
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

	app.post("/f/joinTeam", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let team = yield Team.findOne({id: req.body.team_id});
			
			if (!team) {
				return res.end("no such team");
			}

			let user = yield User.findOne({_id: req.user._id});

			if (!user) {
				return res.end("fail");
			}

			if ( user.bannedFromTeams.length > 0 && user.bannedFromTeams.indexOf(req.body.team_id) > -1 ) {
				return res.end("banned");
			}

			let users = yield User.find({teams: {$elemMatch: {"id": req.body.team_id}}});

			let newTeam = {
				id: req.body.team_id,
				position: users.length == 0 ? "admin" : "member"
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
				"attendees": {user: req.user._id, status: "absent"}
			}});
			
			yield user.save();
			
			yield Folder.create({
				name: "Personal Files",
				team: req.body.team_id,
				userMembers: req.user._id,
				creator: req.user._id,
				defaultFolder: true
			});

			res.end("success");

		} catch (err) {
			console.log(err);
			res.end("fail");
		}
	}));

	app.post("/f/getTeamNum", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let team = yield Team.findOne({id: req.user.current_team.id});

			res.end(String(team.number));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/isTeamOnMorTeam", requireLogin, Promise.coroutine(function*(req, res) {
		try {
			
			let teams = Team.find({number: parseInt(req.body.teamNum)});

			if (teams.length > 0) {
				res.json(teams[0]); // TODO: should this just be "true" instead?
			} else {
				res.end("false");
			}

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

};
