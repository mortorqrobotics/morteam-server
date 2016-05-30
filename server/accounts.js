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

	// load profile page of any user based on _id
	router.get("/profile/:userId", Promise.coroutine(function*(req, res) {
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
			res.render("user", {
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
			send404(res);
		}
	}));

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

			// because you can"t send booleans via HTTP
			if (req.body.rememberMe == "true") {
				req.body.rememberMe = true;
			} else {
				req.body.rememberMe = false;
			}

			let user = yield User.findOne({
				$or: [{ username: req.body.username }, { email: req.body.username }]
			}).select("+password");

			if (user) {
				let isMatch = yield user.comparePassword(req.body.password);
				if (isMatch) {
					// store user info in cookies
					req.session.userId = user._id;
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

	router.get("/users/:userId", requireLogin, Promise.coroutine(function*(req, res) {
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

	router.put("/users/:userId/position", requireLogin, Promise.coroutine(function*(req, res) {
		try {
			// position hierarchy
			let positionHA = {
				"member": 0,
				"leader": 1,
				"admin": 2
			};

			// find target user
			let user = yield User.findOne({
				_id: req.params.userId
			});

			if (!user) {
				return res.end("fail");
			}

			let current_position = util.findTeamInUser(user, req.user.current_team.id).position;

			if (current_position == "admin" && (yield User.count({
				teams: {
					id: req.user.current_team.id,
					position: "admin"
				}
			})) <= 1) {
				return res.end("You are the only Admin on your team, so you cannot demote yourself.");
			}

			// check position hierarchy to see if it is allowed for user to change the position of target user
			if (!(positionHA[req.user.current_team.position] >= positionHA[req.body.target_position]
					&& positionHA[req.user.current_team.position] >= positionHA[current_position])) {
				return res.end("fail");
			}
			
			// update position of target user
			yield User.update({
				_id: req.params.userId,
				"teams.id": req.user.current_team.id
			}, { "$set": {
				"teams.$.position": req.body.target_position, // find out what .$. means and if it means selected "teams" element
				"current_team.position": req.body.target_position // make sure in the future current_team.position is checked with "teams" array of the document when user is logging in as opposed to doing this
			}});

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/users/search", requireLogin, Promise.coroutine(function*(req, res) {

		// create array of search terms
		let terms = req.body.search.split(" ");
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
				teams: { $elemMatch: { id: req.user.current_team.id } },
				$or: [
					{ firstname: re }, { lastname: re }
				]
			}).limit(10).exec();

			res.json(users);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.put("/password", requireLogin, Promise.coroutine(function*(req, res) {

		// TODO: this check should only be client side
		if (req.body.new_password != req.body.new_password_confirm) {
			return res.end("fail: new passwords do not match");
		}

		try {

			let user = yield User.findOne({ _id: req.user._id }, "+password");

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

	router.put("/profile", requireLogin, multer().single("new_prof_pic"), Promise.coroutine(function*(req, res) {

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
			yield User.findOneAndUpdate({ _id: req.user._id }, updatedUser);

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
			}).exec();

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
				text: "It seems like you requested to reset your password. Your new password is " + netPassword + ". Feel free to reset it after you log in."
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
