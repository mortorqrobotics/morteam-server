"use strict";

module.exports = function(imports, publicDir, profpicDir) {

	let express = imports.modules.express;
	let Promise = imports.modules.Promise;
	let util = imports.util;

	let requireLogin = util.requireLogin;

	let User = imports.models.User;
	let Team = imports.models.Team;
	let Subdivision = imports.models.Subdivision;

	let router = express.Router();

	function ejsFile(name) {
		return require("path").join(__dirname, "../website/views", name + ".ejs");
	}

	let staticFiles = [
		"cal",
		"chat",
		"drive",
		"fp", // forgot password
		"index",
		"login",
		"networks",
		"signup",
		"void"
	];
	for (let fileName of staticFiles) {
		router.get("/" + fileName, function(req, res) {
			res.render(ejsFile(fileName));
		});
	}
	router.get("/", function(req, res) {
		res.render(ejsFile("index"));
	});

	// load profile page of any user based on _id
	router.get("/profile/id/:userId", Promise.coroutine(function*(req, res) {
		try {

			let user = yield User.findOne({
				_id: req.params.userId,
				teams: {
					$elemMatch: {
						"id": req.user.current_team.id
					}
				} // said user has to be a member of the current team of whoever is loading the page
			});

			if (!user) {
				return util.userNotFound(res);
			}

			// load user.ejs page with said user's profile info
			res.render(ejsFile("user"), {
				firstname: user.firstname,
				lastname: user.lastname,
				_id: user._id,
				email: user.email,
				phone: user.phone,
				profpicpath: user.profpicpath,
				viewedUserPosition: util.findTeamInUser(user, req.user.current_team.id).position,
				viewerUserPosition: req.user.current_team.position,
				viewerUserId: req.user._id
			});

		} catch (err) {
			console.error(err);
			util.send404(res);
		}
	}));

	router.get("/subdivisions/id/:subdivId", Promise.coroutine(function*(req, res) {
		try {

			let subdivision = yield Subdivision.findOne({
				_id: req.params.subdivId,
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

				return res.render(ejsFile("subdivision"), {
					name: subdivision.name,
					type: subdivision.type,
					team: subdivision.team, // TODO: POSSIBLY CHANGE TO subdivision.team._id
					admin: req.user.current_team.position == "admin",
					joined: isMember,
					members: users,
					current_user_id: req.user._id
				});

			} else {
				res.status(404).end("nothing to see here.");
			}

		} catch (err) {
			util.send404(res);
		}
	}));

	router.get("/teams/current", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let users = yield User.find({
				teams: { $elemMatch: { id: req.user.current_team.id } }
			});

			let team = yield Team.findOne({
				id: req.user.current_team.id
			});

			res.render(ejsFile("team"), {
				teamName: team.name,
				teamNum: team.number,
				teamId: team.id,
				members: users,
				viewerIsAdmin: req.user.current_team.position == "admin"
			});

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	return router;
};
