"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let ObjectId = imports.modules.mongoose.Types.ObjectId;
    let Promise = imports.modules.Promise;
    let util = imports.util;

    let handler = util.handler;
    let requireLogin = util.requireLogin;
    let requireAdmin = util.requireAdmin;
    let checkBody = util.middlechecker.checkBody;
    let types = util.middlechecker.types;
    let audience = util.audience;
    let audienceQuery = audience.audienceQuery;

    let User = imports.models.User;
    let Event = imports.models.Event;
    let Group = imports.models.Group;

    let router = express.Router();

    router.get("/events/startYear/:startYear/startMonth/:startMonth/endYear/:endYear/endMonth/:endMonth", checkBody(), requireLogin, handler(function*(req, res) {


        let startYear = req.params.startYear;
        let startMonth = req.params.startMonth;
        let endYear = parseInt(req.params.endYear);
        let endMonth = parseInt(req.params.endMonth);

        let start = new Date(startYear, startMonth, 1);
        let end = new Date(endYear, endMonth + 1, 1);

        let events = yield Event.find({
            $and: [{
                    date: {
                        $gte: start,
                        $lt: end,
                    },
                },
                audienceQuery(req.user),
            ],
        }).sort("date");

        res.json(events);

    }));

    router.get("/events/upcoming", checkBody(), requireLogin, handler(function*(req, res) {

        let events = yield Event.find({
            $and: [{
                    date: {
                        $gte: new Date(),
                    }
                },
                audienceQuery(req.user),
            ]
        }).sort("date");

        res.json(events);

    }));

    router.post("/events", checkBody({
        sendEmail: types.boolean,
        name: types.string,
        audience: types.audience,
        description: types.string,
    }), requireAdmin, handler(function*(req, res) {

        let event = {
            name: req.body.name,
            date: new Date(req.body.date),
            audience: req.body.audience,
            creator: req.user._id,
            hasTakenAttendance: false,
            attendance: [],
        };

        if (req.body.description.length > 0) {
            event.description = req.body.description;
        }

        event = yield Event.create(event);


        if (req.body.sendEmail) {

            let users = yield audience.getUsersIn(event.audience);
            let list = util.mail.createRecipientList(users);

            yield util.mail.sendEmail({
                to: list,
                subject: "New Event on " + util.readableDate(event.date) + " - " + event.name,
                html: req.user.firstname + " " + req.user.lastname + " has created an event on " + util.readableDate(event.date) + ",<br><br>" + event.name + "<br>" + req.body.description
            });

        }

        res.json(event);

    }));

    router.delete("/events/id/:eventId", checkBody(), requireAdmin, handler(function*(req, res) {

        yield Event.findOneAndRemove({
            _id: req.params.eventId,
        });

        res.end();

    }));

    router.put("/events/id/:eventId/attendance", checkBody({
        attendance: types.attendance,
    }), requireAdmin, handler(function*(req, res) {

        yield Event.update({
            $and: [
                { _id: req.params.eventId },
                audienceQuery(req.user),
            ],
        }, {
            $set: {
                attendance: req.body.attendance,
            },
        });

        res.end();

    }));

    router.post("/events/id/:eventId/startAttendance", checkBody(), requireAdmin, handler(function*(req, res) {

        let event = yield Event.findOne({
            _id: req.params.eventId,
        });

        if (!event) {
            return res.status(400).end("That event does not exist");
        }

        // TODO: check if it already hasTakenAttendance

        let newAttendees = [];
        for (let user of (yield util.audience.getUsersIn(event.audience))) {
            if (!event.attendance.some(obj => obj.user.toString() == user._id.toString())) {
                newAttendees.push({
                    user: user._id,
                    status: "absent",
                });
            }
        }

        Array.prototype.push.apply(event.attendance, newAttendees);
        event.hasTakenAttendance = true;
        yield event.save();

        res.end();

    }));

    router.get("/events/id/:eventId/attendance", checkBody(), requireAdmin, handler(function*(req, res) {

        let event = yield Event.findOne({
            _id: req.params.eventId,
        }).populate("attendance.user");

        res.json(event.attendance);

    }));

    router.put("/events/id/:eventId/excuseAbsences", checkBody({
        userIds: [types.objectId(User)],
    }), requireAdmin, handler(function*(req, res) {

        let event = yield Event.findOne({
            _id: req.params.eventId,
        });

        let newEntries = [];
        for (let userId of req.body.userIds) {
            let index = event.attendance.findIndex(entry => entry.user.toString() == userId);
            if (index !== -1) {
                event.attendance[index].status = "excused";
            } else {
                newEntries.push({
                    user: userId,
                    status: "excused",
                });
            }
        }
        Array.prototype.push.apply(event.attendance, newEntries);

        yield event.save();

        res.end();

    }));

    router.get("/events/id/:eventId/userList", checkBody(), requireLogin, handler(function*(req, res) {

        let event = yield Event.findOne({
            _id: req.params.eventId,
        });

        let users = yield util.audience.getUsersIn(event.audience);

        res.json(users);

    }));

    function getPresencesAbsences(events, userId) {
        let absences = [];
        let present = 0;
        for (let event of events) {
            for (let attendee of event.attendance) {
                if (attendee.user.toString() == userId) {
                    if (attendee.status == "absent") {
                        absences.push(event);
                    } else if (attendee.status == "present") {
                        present++;
                    }
                    // do nothing if the absense is excused or if tardy
                }
            }
        }
        return {
            present: present,
            absences: absences,
        };
    }

    router.get("/users/id/:userId/absences", checkBody({
        startDate: types.maybe(types.string),
        endDate: types.maybe(types.string),
    }), requireLogin, handler(function*(req, res) {

        let dateConstraints = {};
        if (req.query.startDate) {
            dateConstraints.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
            dateConstraints.$lte = new Date(req.query.endDate);
        } else {
            dateConstraints.$lte = new Date();
        }

        let events = yield Event.find({
            date: dateConstraints,
            "attendance.user": req.params.userId,
        });

        let result = getPresencesAbsences(events, req.params.userId);

        res.json(result);

    }));

    return router;

};
