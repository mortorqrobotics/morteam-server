"use strict";

module.exports = function(app, util, schemas) {

	let ObjectId = require("mongoose").Types.ObjectId;
	let Promise = require("bluebird");

	let requireLogin = util.requireLogin;
	let requireLeader = util.requireLeader;
	let requireAdmin = util.requireAdmin;

	let User = schemas.User;
	let Event = schemas.Event;
	let AttendanceHandler = schemas.AttendanceHandler;

	app.post("/f/getEventsForUserInTeamInMonth", requireLogin, Promise.coroutine(function*(req, res) {
		let userSubdivisionIds = util.activeSubdivisionIds(req.user.subdivisions);

		let numberOfDays = new Date(req.body.year, req.body.month, 0).getDate(); // month is 1 based
		let start = new Date(req.body.year, req.body.month - 1, 1, 0, 0, 0); // month is 0 based
		let end = new Date(req.body.year, req.body.month - 1, numberOfDays, 23, 59, 59); // month is 0 based

		try {

			let events = yield Event.find({
				team: req.user.current_team.id,
				$or: [
					{ entireTeam: true },
					{ userAttendees: req.user._id },
					{ subdivisionAttendees: { "$in": userSubdivisionIds } }
				],
				date: {$gte: start, $lte: end}
			});
			
			res.json(events);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/getUpcomingEventsForUser", requireLogin, Promise.coroutine(function*(req, res) {
		let userSubdivisionIds = util.activeSubdivisionIds(req.user.subdivisions);

		try {

			let events = yield Event.find({
				team: req.user.current_team.id,
				$or: [
					{ entireTeam: true },
					{ userAttendees: req.user._id },
					{ subdivisionAttendees: { "$in": userSubdivisionIds } }
				],
				date: {$gte: new Date()}
			}).sort("date").exec();
			
			res.end( JSON.stringify(events) );

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/createEvent", requireLogin, requireLeader, Promise.coroutine(function*(req, res) {

		req.body.userAttendees = req.body.userAttendees || [];
		req.body.subdivisionAttendees = req.body.subdivisionAttendees || [];

		req.body.hasAttendance = req.body.hasAttendance == "true";
		req.body.sendEmail = req.body.sendEmail == "true";
		req.body.entireTeam = req.body.entireTeam == "true";

		let event = {
			name: req.body.name,
			date: new Date(req.body.date),
			team: req.user.current_team.id,
			creator: req.user._id,
			hasAttendance: req.body.hasAttendance
		};

		if (req.body.description.length > 0) {
			event.description = req.body.description;
		}

		try {

			let users; // TODO: do not query for users unless either email or attendance is true

			if (req.body.entireTeam) {

				event.entireTeam = true;

				users = yield User.find({
					teams: {$elemMatch: {id: req.user.current_team.id}}
				}, "-password");

			} else {

				event.userAttendees = req.body.userAttendees;
				event.subdivisionAttendees = req.body.subdivisionAttendees;

				users = yield User.find({ $or: [
					{ _id: { $in: req.body.userAttendees } },
					{ subdivisions: { $elemMatch: { "_id": { $in: req.body.subdivisionAttendees } } } }
				] }, "-password");

			}

			event = yield Event.create(event);

			if (req.body.sendEmail) {

				let list = util.createRecepientList(users);

				yield util.sendEmail({
					to: list,
					subject: "New Event on " + util.readableDate(event.date) + " - " + event.name,
					html: req.user.firstname + " " + req.user.lastname + " has created an event on " + util.readableDate(event.date) + ",<br><br>" + event.name + "<br>" + req.body.description
				});

			}

			if (req.body.hasAttendance) {

				let attendees = users.map(attendee => ({
					user: attendee._id,
					status: "absent"
				}));

				yield AttendanceHandler.create({
					event: event._id,
					event_date: event.date,
					attendees: attendees,
					entireTeam: req.body.entireTeam
				});
			}
		
			res.end(JSON.stringify(event));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/deleteEvent", requireLogin, requireLeader, function(req, res) {
		Event.findOneAndRemove({_id: req.body.event_id}, function(err) {
			if (err) {
				console.error(err);
				res.end("fail")
			} else {
				AttendanceHandler.findOneAndRemove({event: req.body.event_id}, function(err) {
					if (err) {
						console.error(err);
						res.end("fail");
					} else {
						res.end("success");
					}
				})
			}
		});
	});
	app.post("/f/getEventAttendees", requireLogin, requireLeader, function(req, res) {
		AttendanceHandler.findOne({event: req.body.event_id}).populate("attendees.user").exec(function(err, attendanceHandler) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				res.end(JSON.stringify(attendanceHandler.attendees));
			}
		});
	});
	app.post("/f/updateAttendanceForEvent", requireLogin, requireLeader, function(req, res) {
		AttendanceHandler.update({event: req.body.event_id}, {"$set": {attendees: req.body.updatedAttendees}}, function(err, model) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				res.end("success");
			}
		});
	});
	app.post("/f/getUserAbsences", requireLogin, function(req, res) {
		AttendanceHandler.find({event_date:{ "$lte": new Date() }, "attendees.user": req.body.user_id}).populate("event").exec(function(err, attendanceHandlers) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				let absences = [];
				let present = 0;
				for (let i = 0; i < attendanceHandlers.length; i++) {
					for (let j = 0; j < attendanceHandlers[i].attendees.length; j++) {
						if (attendanceHandlers[i].attendees[j].user == req.body.user_id && attendanceHandlers[i].attendees[j].status == "absent") {
							absences.push(attendanceHandlers[i].event);
						} else if (attendanceHandlers[i].attendees[j].user == req.body.user_id && attendanceHandlers[i].attendees[j].status == "present") {
							present++;
						}
					}
				}
				res.end(JSON.stringify({present: present, absences: absences}));
			}
		})
	})
	app.post("/f/excuseAbsence", requireLogin, requireLeader, function(req, res) {
		AttendanceHandler.update({event : req.body.event_id , "attendees.user": req.body.user_id} , {"$set": {"attendees.$.status": "excused"}}, function(err, model) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				res.end("success");
			}
		})
	})

};
