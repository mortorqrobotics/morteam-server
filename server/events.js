"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let ObjectId = imports.modules.mongoose.Types.ObjectId;
    let Promise = imports.modules.Promise;
    let util = imports.util;

    let handler = util.handler;
    let requireLogin = util.requireLogin;
    let requireAdmin = util.requireAdmin;

    let User = imports.models.User;
    let Event = imports.models.Event;
    let AttendanceHandler = imports.models.AttendanceHandler;
    let Group = imports.models.Group;

    let router = express.Router();

    router.get("/events/year/:year/month/:month", requireLogin, handler(function*(req, res) {


        let year = req.params.year;
        let month = req.params.month;

        let numberOfDays = new Date(year, month, 0).getDate(); // month is 1 based
        let start = new Date(year, month - 1, 1, 0, 0, 0); // month is 0 based
        let end = new Date(year, month - 1, numberOfDays, 23, 59, 59); // month is 0 based

        let events = yield Event.find({
            "group.members": req.user._id,
            date: {
                $gte: start,
                $lte: end
            }
        });

        res.json(events);

    }));

    router.get("/events/upcoming", requireLogin, handler(function*(req, res) {

        let events = yield Event.find({
            "group.members": req.user._id,
            date: {
                $gte: new Date()
            }
        }).sort("date");

        res.json(events);

    }));

    router.post("/events", requireAdmin, handler(function*(req, res) {

        req.body.hasAttendance = req.body.hasAttendance == "true";
        req.body.sendEmail = req.body.sendEmail == "true";
        req.body.entireTeam = req.body.entireTeam == "true";

        yield Event.create({
            name: req.body.name,
            date: new Date(req.body.date),
            group: req.body.groupId,
            creator: req.user._id,
            hasAttendance: req.body.hasAttendance
        });

        if (req.body.description.length > 0) {
            event.description = req.body.description;
        }

        let group = Group.findOne({
            _id: req.body.groupId
        });

        let users = group.members;

        if (req.body.sendEmail) {

            let list = util.mail.createRecepientList(users);

            yield util.mail.sendEmail({
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
                attendees: attendees
            });
        }

        res.json(event);

    }));

    router.delete("/events/id/:eventId", requireAdmin, handler(function*(req, res) {

        // TODO: check permissions

        yield Event.findOneAndRemove({
            _id: req.params.eventId
        });

        yield AttendanceHandler.findOneAndRemove({
            event: req.params.eventId
        });

        res.end("success");

    }));

    router.get("/events/id/:eventId/attendance", requireAdmin, handler(function*(req, res) {

        // TODO: check permissions

        let handler = yield AttendanceHandler.findOne({
            event: req.params.eventId
        }).populate("attendees.user");

        res.json(handler.attendees);

    }));

    router.put("/events/id/:eventId/attendance", requireAdmin, handler(function*(req, res) {

        // TODO: check permissions

        yield AttendanceHandler.update({
            event: req.params.eventId
        }, {
            "$set": {
                attendees: req.body.updatedAttendees
            }
        });

        res.end("success");

    }));

    // TODO: rename this route?
    router.put("/events/id/:eventId/users/:userId/excuseAbsence", requireAdmin, handler(function*(req, res) {

        // TODO: should permissions have to be checked here? I think not

        yield AttendanceHandler.update({
            event: req.params.eventId,
            "attendees.user": req.body.user_id
        }, {
            "$set": {
                "attendees.$.status": "excused"
            }
        });

        res.end("success");

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
        return {
            present: present,
            absences: absences
        };
    }

    router.get("/users/id/:userId/absences", requireLogin, handler(function*(req, res) {

        let dateConstraints = {};
        if (req.query.startDate) {
            dateConstraints.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
            dateConstraints.$lte = new Date(req.query.endDate);
        } else {
            dateConstraints.$lte = new Date();
        }

        let handlers = yield AttendanceHandler.find({
            event_date: dateConstraints,
            "attendees.user": req.params.userId
        }).populate("event").exec();

        let result = getPresencesAbsences(handlers, req.params.userId);

        res.json(result);

    }));

    return router;

};
