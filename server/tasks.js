"use strict";

module.exports = function(app, util, schemas) {

	let Promise = require("bluebird");

	let requireLogin = util.requireLogin;
	let requireLeader = util.requireLeader;

	let Task = schemas.Task;
	let User = schemas.User;

	app.post("/f/assignTask", requireLogin, requireLeader, Promise.coroutine(function*(req, res) {

		// for iOS and Android
		if (typeof(req.body.due_date) == "string") {
			req.body.due_date = new Date(req.body.due_date);
		}

		let task = {
			name: req.body.task_name,
			team: req.user.current_team.id,
			for: req.body.user_id,
			due_date: req.body.due_date,
			creator: req.user._id,
			completed: false
		};

		if (req.body.task_description) {
			task.description = req.body.task_description;
		}

		try {

			task = Task.create({
				name: req.body.task_name,
				description: req.body.task_description,
				team: req.user.current_team.id,
				for: req.body.user_id,
				due_date: req.body.due_date,
				creator: req.user._id,
				completed: false
			});

			let user = yield User.findOne({_id: req.body.user_id});

			if (!user) {
				return res.end("fail");
			}

			yield util.sendEmail({
				to: user.email,
				subject: "New Task Assigned By " + req.user.firstname + " " + req.user.lastname,
				text: "View your new task at http://www.morteam.com/u/" + req.body.user_id
			});

			res.end(task._id.toString());

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/getCompletedUserTasks", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let tasks = yield Task.find({
				for: req.body.user_id,
				completed: true
			}).populate("creator").exec();

			res.end(JSON.stringify(tasks));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	// TODO: should completed and pending tasks be put into one request?

	app.post("/f/getPendingUserTasks", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let tasks = yield Task.find({
				for: req.body.user_id,
				completed: false
			}).populate("creator").exec();

			res.end(JSON.stringify(tasks));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/markTaskAsCompleted", requireLogin, Promise.coroutine(function*(req, res) {

		if (req.user._id != req.body.target_user
				&& req.user.current_team.position != "admin"
				&& req.user.current_team.position != "leader" ) {

			return res.end("fail");

		}

		try {

			yield Task.update({_id: req.body.task_id}, {"$set": {completed: true}});

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

};
