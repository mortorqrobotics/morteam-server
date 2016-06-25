"use strict";

module.exports = function(imports, publicDir, profpicDir) {

	let express = imports.modules.express;
	let Promise = imports.modules.Promise;
	let fs = require("fs");
	let util = imports.util;

	let requireLogin = util.requireLogin;

	let User = imports.models.User;
	let Team = imports.models.Team;
	let Subdivision = imports.models.Subdivision;

	let router = express.Router();

	function ejsFile(name) {
		return require("path").join(__dirname, "../website/views", name + ".ejs");
	}

	// load homepage
	router.get("/", function(req, res) {
		res.render(ejsFile("index"));
	});

	// load profile page of any user based on _id
	router.get("/profiles/id/:userId", Promise.coroutine(function*(req, res) {
		try {

			let user = yield User.findOne({
				_id: req.params.userId,
				team: req.user.team
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
				viewedUserPosition: user.position,
				viewerUserPosition: req.user.position,
				viewerUserId: req.user._id,
				created_at: user.created_at
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
				team: req.user.team
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
					admin: util.isUserAdmin(req.user),
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
				team: req.user.team
			});

			let team = yield Team.findOne({
				_id: req.user.team
			});

			res.render(ejsFile("team"), {
				teamName: team.name,
				teamNum: team.number,
				teamId: team._id,
				members: users,
				viewerIsAdmin: util.isUserAdmin(req.user)
			});

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	// TODO: cache static ejs files
	// automatically serve ejs files that require no parameters
	router.get("*", function(req, res, next) {
		let file = req.path.substring(1); // remove leading forward slash
		let index = file.indexOf("?");
		if (index != -1) { // in case of url parameters like /a?b=c&d=e
			file = file.substring(0, index);
		}
		if (file.indexOf("/") != -1 || file.indexOf(".") != -1) {
			// prevent any funny business like /shared/navbar.ejs or /..
			return next();
		}
		if (["subdivision", "team", "user"].indexOf(file) != -1) {
			// do not load ejs file that require parameters
			return next();
		}
		file = ejsFile(file);
		fs.exists(file, function(exists) {
			if (exists) {
				res.render(file, {});
			} else {
				next();
			}
		});
	});

	return router;
};
