"use strict";

module.exports = function(imports, publicDir, profpicDir) {

	let express = imports.modules.express;
	let lwip = imports.modules.lwip; // image processing module
	let multer = imports.modules.multer; // for file uploads
	let ObjectId = imports.modules.mongoose.Types.ObjectId;
	let Promise = imports.modules.Promise;
	let util = imports.util;
	let extToMime = require("./extToMime.json"); // used to convert file extensions to MIME types

	let requireLogin = util.requireLogin;
	let requireAdmin = util.requireAdmin;

	let User = imports.models.User;
	let Chat = imports.models.Chat;
	let Folder = imports.models.Folder;
	let Event = imports.models.Event;
	let AttendanceHandler = imports.models.AttendanceHandler;

	let router = express.Router();

	// load default profile picture
	router.get("/images/user.jpg-60", function(req, res) {
		res.sendFile(publicDir + "/images/user.jpg");
	});

	router.get("/images/user.jpg-300", function(req, res) {
		res.sendFile(publicDir + "/images/user.jpg");
	});

	// load user profile picture from AWS S3
	router.get("/pp/:path", function(req, res) {
		res.redirect(profpicDir + req.params.path);
	});

	router.post("/login", Promise.coroutine(function*(req, res) {
		// TODO: maybe move login and logout to separate file?
		try {
			// IMPORTANT: req.body.username can either be a username or an email

			// v this if statement though
			// because you can"t send booleans via HTTP
			if (req.body.rememberMe == "true") {
				req.body.rememberMe = true;
			} else {
				req.body.rememberMe = false;
			}

			let user = yield User.findOne({
				$or: [
					{ username: req.body.username },
					{ email: req.body.username }
				]
			}).select("+password").populate("team");

			if (!user) {
				return res.end("inc/username"); // incorrect username
			}

			let isMatch = yield user.comparePassword(req.body.password);
			if (!isMatch) {
				res.end("inc/password"); // incorrect password
			}
			delete user.password;

			// store user info in cookies
			req.session.userId = user._id;
			if (req.body.rememberMe) {
				req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // change cookie expiration date to one year
			}

			res.json(user);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.post("/logout", requireLogin, function(req, res) {
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
	router.post("/users", multer({
		limits: { fileSize: 10 * 1024 * 1024 }
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
				$or: [
					{ username: req.body.username },
					{ email: req.body.email },
					{ phone: req.body.phone }
				]
			})) > 0) {
				// user exists
				return res.end("exists");
			}

			// TODO: this should not be on the server, only on the client
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

	router.get("/users/id/:userId", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let user = yield User.findOne({
				_id: req.params.userId
			});

			res.json(user);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.put("/users/id/:userId/position/:newPosition", requireLogin, requireAdmin, Promise.coroutine(function*(req, res) {
		try {

			// find target user
			let user = yield User.findOne({
				_id: req.params.userId,
				team: req.user.team
			});

			if (!user) {
				return res.end("fail");
			}

			let newPosition = req.params.newPosition.toLowerCase();
			if (["member", "leader", "mentor", "alumnus"].indexOf(newPosition) != -1) {
				return res.end("fail");
			}

			let currentPosition = user.position;

			if (req.params.userId == req.user._id
					&& !util.isPositionAdmin(newPosition)
					&& (yield User.count({
						team: req.user.team,
						position: util.adminPositionsQuery
					})) <= 1) {

				return res.end("You are the only leader or mentor on your team, so you cannot demote yourself.");

			}

			user.position = newPosition;
			yield user.save();

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/users/search", requireLogin, Promise.coroutine(function*(req, res) {

		// create array of search terms
		let terms = String(req.query.search).trim().split(" ");
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
				team: req.user.team,
				$or: [
					{ firstname: re },
					{ lastname: re }
				]
			}).limit(10);

			res.json(users);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.put("/password", requireLogin, Promise.coroutine(function*(req, res) {

		// TODO: this check should only be client side
		if (req.body.newPassword != req.body.newPasswordConfirm) {
			return res.end("fail: new passwords do not match");
		}

		try {

			let user = yield User.findOne({
				_id: req.user._id
			}, "+password");

			// check if old password is correct
			if(!(yield user.comparePassword(req.body.oldPassword))) {
				return res.end("fail: incorrect password");
			}

			// set and save new password (password is automatically encrypted. see /models/User.js)
			user.password = req.body.newPassword;
			yield user.save();
			// TODO: there should be a method on user to create a new encrypted password instead of doing it like this

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	// TODO: get rid of the form in the client so that this can be PUT
	router.post("/profile", requireLogin, multer().single("new_prof_pic"), Promise.coroutine(function*(req, res) {

		if (!util.validateEmail(req.body.email) || !util.validatePhone(req.body.phone)) {
			return res.end("fail");
		}

		req.user.firstname = req.body.firstname;
		req.user.lastname = req.body.lastname;
		req.user.email = req.body.email;
		req.user.phone = req.body.phone;

		if (req.body.parentEmail != "") {
			req.user.parentEmail = req.body.parentEmail;
		}

		try {
			if (req.file) { // if user chose to update their profile picture too

				req.user.profpicpath = "/pp/" + req.user.username

				// get extension and corresponding mime type
				let ext = req.file.originalname.substring(req.file.originalname.lastIndexOf(".")+1).toLowerCase() || "unknown";
				let mime = extToMime[ext]
				if (mime == undefined) {
					mime = "application/octet-stream"
				}

				// NOTE: for explanations of the functions used here, see util.js

				let buffer = yield util.resizeImageAsync(req.file.buffer, 300, ext);
				yield util.uploadToProfPicsAsync(buffer, req.user.username + "-300", mime);
				buffer = yield util.resizeImageAsync(req.file.buffer, 60, ext);
				yield util.uploadToProfPicsAsync(buffer, req.user.username + "-60", mime);
			}

			// update user info in database
			yield req.user.save();

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	// get information about the currently logged in user
	router.get("/users/self", requireLogin, function(req, res) {
		res.json(req.user);
	});

	router.post("/forgotPassword", Promise.coroutine(function*(req, res) {
		try {

			let user = yield User.findOne({
				email: req.body.email,
				username: req.body.username
			});

			if (!user) {
				return res.end("does not exist");
			}

			let newPassword = yield user.assignNewPassword();
			yield user.save();

			// TODO: WE ARE EMAILING PASSWORDS IN PLAINTEXT
			// they are temporary passwords but still
			// see http://security.stackexchange.com/questions/32589/temporary-passwords-e-mailed-out-as-plain-text

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

	return router;

};
