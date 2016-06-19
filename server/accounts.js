"use strict";

module.exports = function(app, util, schemas, publicDir, profpicDir) {

	let extToMime = require("./extToMime.json"); // used to convert file extensions to mime types
	let lwip = require("lwip"); // image processing module
	let multer = require("multer"); // for file uploads
	let ObjectId = require("mongoose").Types.ObjectId;

	let Promise = require("bluebird");

	let requireLogin = util.requireLogin;
	let requireAdmin = util.requireAdmin;

	let User = schemas.User;
	let Chat = schemas.Chat;
	let Folder = schemas.Folder;
	let Event = schemas.Event;

	// load profile page of any user based on _id
	app.get("/u/:id", Promise.coroutine(function*(req, res) {
		try {

			let user = yield User.findOne({
				_id: req.params.id,
				teams: {
					$elemMatch: {
						"id": req.user.current_team.id
					}
				} // said user has to be a member of the current team of whoever is loading the page
			}).exec();

			if (!user) {
				return util.userNotFound(res);
			}

			// load user.ejs page with said user's profile info
			res.render("user", {
				firstname: user.firstname,
				lastname: user.lastname,
				_id: user._id,
				email: user.email,
				phone: user.phone,
				profpicpath: user.profpicpath,
				created_at: user.created_at,
				viewedUserPosition: util.findTeamInUser(user, req.user.current_team.id).position,
				viewerUserPosition: req.user.current_team.position,
				viewerUserId: req.user._id
			});

		} catch (err) {
			console.error(err);
			send404(res);
		}
	}));

	// load default profile picture
	app.get("/images/user.jpg-60", function(req, res) {
		res.sendFile(publicDir + "/images/user.jpg");
	});

	app.get("/images/user.jpg-300", function(req, res) {
		res.sendFile(publicDir + "/images/user.jpg");
	});

	// load user profile picture from AWS S3
	app.get("/pp/:path", function(req, res) {
		res.redirect(profpicDir + req.params.path);
	});

	app.post("/f/login", Promise.coroutine(function*(req, res) {
		try {
			// IMPORTANT: req.body.username can either be a username or an email

			// because you can"t send booleans via HTTP
			if (req.body.rememberMe == "true") {
				req.body.rememberMe = true;
			} else {
				req.body.rememberMe = false;
			}

			let user = yield User.findOne({
				$or: [{username: req.body.username}, {email: req.body.username}]
			}).select("+password").exec();

			if (user) {
				let isMatch = yield user.comparePassword(req.body.password);
				if (isMatch) {
					// store user info in cookies
					req.session.user = user;
					if (req.body.rememberMe) {
						req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // change cookie expiration date to one year
					}
					res.json(user);
				} else {
					res.end("inc/password"); // incorrect password
				}
			} else {
				res.end("inc/username") // incorrect username
			}
		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/logout", requireLogin, function(req, res) {
		// destroy user session cookie
		req.session.destroy(function(err) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				res.end("success");
			}
		})
	});

	// uses multer middleware to parse uploaded file called "profpic" with a max file size
	app.post("/f/createUser", multer({
		limits: {fileSize:10*1024*1024}
	}).single("profpic"), Promise.coroutine(function*(req, res) {
		try {
			// capitalize names
			req.body.firstname = req.body.firstname.capitalize();
			req.body.lastname = req.body.lastname.capitalize();

			// remove parentheses and dashes from phone number
			req.body.phone = req.body.phone.replace(/[- )(]/g,"")

			// if phone and email are valid (see util.js for validation methods)
			if (!util.validateEmail(req.body.email) || !util.validatePhone(req.body.phone)) {
				return res.end("fail: Form data is invalid");
			}

			// check if a user with either same username, email, or phone already exists
			if((yield User.count({
				$or: [{
					username: req.body.username
				}, {
					email: req.body.email
				}, {
					phone: req.body.phone
				}]
			})) > 0) {
				// user exists
				return res.end("exists");
			}

			if (req.body.password != req.body.password_confirm) {
				return res.end("password mismatch");
			}

			let userInfo = {
				username: req.body.username,
				password: req.body.password,
				firstname: req.body.firstname,
				lastname: req.body.lastname,
				email: req.body.email,
				phone: req.body.phone
			};

			// if user uploaded a profile pic
			if (req.file) {

				userInfo.profpicpath = "/pp/" + req.body.username;

				let ext = req.file.originalname.substring(req.file.originalname.lastIndexOf(".") + 1).toLowerCase() || "unknown";
				let mime = extToMime[ext]
				if (mime == undefined) {
					mime = "application/octet-stream";
				}

				// resize image to 60px and upload to AWS S3
				let buffer = yield util.resizeImageAsync(req.file.buffer, 60, ext);
				yield util.uploadToProfPicsAsync(buffer, req.body.username + "-60", mime);

				// resize image to 300px and upload to AWS S3
				buffer = yield util.resizeImageAsync(req.file.buffer, 300, ext);
				yield util.uploadToProfPicsAsync(buffer, req.body.username + "-300", mime);

			} else {
				userInfo.profpicpath = "/images/user.jpg"; // default profile picture
			}

			yield User.create(userInfo);

			res.end("success");
		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/getUser", requireLogin, Promise.coroutine(function*(req, res) {
		try {
			let user = yield User.findOne({
				_id: req.body._id
			}, "-password").exec();
			res.json(user);
		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/getUserTeams", requireLogin, Promise.coroutine(function*(req, res) {
		try {
			let user = yield User.findOne({
				_id: req.body._id
			}, "-password").exec();
			res.json({
				"teams": user.teams,
				"current_team": user.current_team
			});
		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/changePosition", requireLogin, Promise.coroutine(function*(req, res) {
		try {
			// position hierarchy
			let positionHA = {
				"member": 0,
				"leader": 1,
				"admin": 2
			};

			// find target user
			let user = yield User.findOne({
				_id: req.body.user_id
			}).exec();

			if (!user) {
				return res.end("fail");
			}

			let current_position = util.findTeamInUser(user, req.user.current_team.id).position;

			if (current_position == "admin" && (yield User.count({
				teams: {
					id: req.user.current_team.id,
					position: "admin"
				}
			}).exec()) <= 1) {
				return res.end("You are the only Admin on your team, so you cannot demote yourself.");
			}

			// check position hierarchy to see if it is allowed for user to change the position of target user
			if (!(positionHA[req.user.current_team.position] >= positionHA[req.body.target_position]
					&& positionHA[req.user.current_team.position] >= positionHA[current_position])) {
				return res.end("fail");
			}

			// update position of target user
			yield User.update({
				_id: req.body.user_id,
				"teams.id": req.user.current_team.id
			}, {"$set": {
				"teams.$.position": req.body.target_position, // find out what .$. means and if it means selected "teams" element
				"current_team.position": req.body.target_position // make sure in the future current_team.position is checked with "teams" array of the document when user is logging in as opposed to doing this
			}}).exec();

			res.end("success");
		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/searchForUsers", requireLogin, Promise.coroutine(function*(req, res) {
		// create array of search terms
		let terms = String(req.body.search).trim().split(" ");
		let regexString = "";
		// create regular expression
		for (let i = 0; i < terms.length; i++) {
			regexString += terms[i];
			if (i < terms.length - 1) regexString += "|";
		}
		let re = new RegExp(regexString, "ig");

		try {
			// find maximum of 10 users that match the search criteria
			let users = yield User.find({
				teams: {$elemMatch: {id: req.user.current_team.id}},
				$or: [
					{ firstname: re }, { lastname: re }
				]
			}, "-password").limit(10).exec();
			res.json(users);
		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/changePassword", requireLogin, Promise.coroutine(function*(req, res) {
		if (req.body.new_password != req.body.new_password_confirm) {
			return res.end("fail: new passwords do not match");
		}
		try {

			let user = yield User.findOne({_id: req.user._id}).exec();

			// check if old password is correct
			if(!(yield user.comparePassword(req.body.old_password))) {
				return res.end("fail: incorrect password");
			}

			// set and save new password (password is automatically encrypted. see /schemas/User.js)
			user.password = req.body.new_password;
			yield user.save();

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/editProfile", requireLogin, multer().single("new_prof_pic"), Promise.coroutine(function*(req, res) {

		let updatedUser = {
			firstname: req.body.firstname,
			lastname: req.body.lastname,
			email: req.body.email,
			phone: req.body.phone
		};

		if (req.body.parentEmail != "") {
			updatedUser.parentEmail = req.body.parentEmail;
		}

		if (!util.validateEmail(req.body.email) || !util.validatePhone(req.body.phone)) {
			return res.end("fail");
		}

		try {
			if (req.file) { // if user chose to update their profile picture too

				updatedUser.profpicpath = "/pp/" +  req.user.username

				// get extension and corresponding mime type
				let ext = req.file.originalname.substring(req.file.originalname.lastIndexOf(".")+1).toLowerCase() || "unknown";
				let mime = extToMime[ext]
				if (mime == undefined) {
					mime = "application/octet-stream"
				}

				// NOTE: for explanations of the functions used here, see util.js

				let buffer = yield util.resizeImageAsync(req.file.buffer, 300, ext);
				yield util.uploadToProfPicsAsync(buffer, req.user.username + "-300", mime);
				buffer = util.resizeImageAsync(req.file.buffer, 60, ext);
				yield util.uploadToProfPicsAsync(buffer, req.user.username + "-60", mime);
			}

			// update user info in database
			yield User.findOneAndUpdate({_id: req.user._id}, updatedUser);

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	// get information about the currently logged in user
	app.post("/f/getSelf", requireLogin, Promise.coroutine(function*(req, res) {
		try {
			let user = yield User.findOne({_id: req.user._id}, "-password").exec();
			res.end(JSON.stringify(user));
		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/removeUserFromTeam", requireLogin, requireAdmin, Promise.coroutine(function*(req, res) {
		try {
			let user = yield User.findOne({_id: req.body.user_id}).exec();

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
				_id: req.body.user_id
			}, { "$pull": {
				"teams": {id: req.user.current_team.id},
				"subdivisions": {team: req.user.current_team.id}
			}});

			yield Chat.update({
				team: req.user.current_team.id,
				userMembers: new ObjectId(req.body.user_id)
			}, {
				"$pull": {
					"userMembers": req.body.user_id
				}
			});

			yield Folder.update({
				team: req.user.current_team.id,
				userMembers: new ObjectId(req.body.user_id)
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
					"userAttendees": req.body.user_id
				}
			});

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/forgotPassword", Promise.coroutine(function*(req, res) {
		try {

			let user = yield User.findOne({
				email: req.body.email,
				username: req.body.username
			}).exec();

			if (!user) {
				return res.end("does not exist");
			}

			let newPassword = yield user.assignNewPassword();
			yield user.save();

			// email user new password
			let info = yield util.sendEmail({
				to: req.body.email,
				subject: "New MorTeam Password Request",
				text: "It seems like you requested to reset your password. Your new password is " + newPassword + ". Feel free to reset it after you log in."
			});
			console.log(info);

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));
};
