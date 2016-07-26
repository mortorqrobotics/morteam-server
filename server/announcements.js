"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Autolinker = imports.modules.autolinker;
    let ObjectId = imports.modules.mongoose.Types.ObjectId;
    let Promise = imports.modules.Promise;
    let util = imports.util;

    let handler = util.handler;
    let requireLogin = util.requireLogin;
    let includesQuery = util.hiddenGroups.includesQuery;

    let Announcement = imports.models.Announcement;
    let User = imports.models.User;
    let Group = imports.models.Group;

    let router = express.Router();

    router.post("/announcements", requireLogin, handler(function*(req, res) {

        let announcement = yield Announcement.create({
            author: req.user._id,
            content: req.body.content,
            audience: req.body.audience,
            timestamp: new Date(),
        });

        res.json(announcement);

    }));

    router.get("/announcements", requireLogin, handler(function*(req, res) {
        // find announcements that the user should be able to see
        let announcements = yield Announcement.find({
                audience: includesQuery(req.user._id)
            }, {
                // only respond with _id, author, content and timestamp
                _id: 1,
                author: 1,
                content: 1,
                timestamp: 1,
                audience: 1,
            }) // populate author and sort by timestamp, skip and limit are for pagination
            .populate("author")
            .sort("-timestamp")
            .skip(Number(req.query.skip))
            .limit(20)
            .exec();

        res.json(announcements);

    }));

    router.delete("/announcements/id/:announcementId", requireLogin, handler(function*(req, res) {

        let announcement = yield Announcement.findOne({
            _id: req.params.announcementId
        });

        // TODO: if the user is an admin, check if they can see the announcement

        // check if user is eligible to delete said announcement
        if (req.user._id == announcement.author.toString() || util.positions.isUserAdmin(req.user)) {
            yield announcement.remove();
            res.end("success");
        } else {
            // warn me about attempted hax, bruh
            yield util.mail.sendEmail({
                to: "rafezyfarbod@gmail.com",
                subject: "MorTeam Security Alert!",
                text: "The user " + req.user.firstname + " " + req.user.lastname + " tried to perform administrator tasks. User ID: " + req.user._id
            });
            res.end("fail");
        }

    }));

    return router;

};
