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

	app.post("/f/deleteEvent", requireLogin, requireLeader, Promise.coroutine(function*(req, res) {
		try {

			yield Event.findOneAndRemove({_id: req.body.event_id});
			
			yield AttendanceHandler.findOneAndRemove({event: req.body.event_id});
			
			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/getEventAttendees", requireLogin, requireLeader, Promise.coroutine(function*(req, res) {
		try {

			let handler = yield AttendanceHandler.findOne({event: req.body.event_id}).populate("attendees.user").exec();
			
			res.end(JSON.stringify(handler.attendees));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/updateAttendanceForEvent", requireLogin, requireLeader, Promise.coroutine(function*(req, res) {
		try {

			yield AttendanceHandler.update({
				event: req.body.event_id
			}, {
				"$set": {attendees: req.body.updatedAttendees}
			});

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	function getPresencesAbsences(attendanceHandlers, userId) {
		let absences = [];
		let present = 0;
		for (let handler of attendanceHandlers) {
			for (let attendee of handler.attendees) {
				if (attendee.user == userId) {
					if (attendee.status == "absent") {
						absences.push(handler.event);
					} else if (attendee.status == "present") {
						present++;
					}
					// do nothing if the absense is excused
				}
			}
		}
		return {present: present, absences: absences};
	}

	app.post("/f/getUserAbsences", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let handlers = yield AttendanceHandler.find({
				event_date: { "$lte": new Date() },
				"attendees.user": req.body.user_id
			}).populate("event").exec();

			let result = getPresencesAbsences(handlers, req.body.user_id);

			res.end(JSON.stringify(result));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/getUserAbsencesBetweenDates", requireLogin, Promise.coroutine(function*(req, res) {

		let startDate = new Date(req.body.startDate);
		let endDate = new Date(req.body.endDate);
		let userId = req.body.userId;

		try {

			let handlers = yield AttendanceHandler.find({
				event_date: {
					"$gte": startDate,
					"$lte": endDate
				},
				"attendees.user": userId
			}).populate("event").exec();

			let result = getPresencesAbsences(handlers, userId);

			res.end(JSON.stringify(results));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/excuseAbsence", requireLogin, requireLeader, Promise.coroutine(function*(req, res) {
		try {

			yield AttendanceHandler.update({
				event : req.body.event_id,
				"attendees.user": req.body.user_id
			}, {
				"$set": {"attendees.$.status": "excused"}
			});
			
			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

};
