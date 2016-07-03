"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Autolinker = imports.modules.autolinker;
    let ObjectId = imports.modules.mongoose.Types.ObjectId;
    let Promise = imports.modules.Promise;
    let util = imports.util;

    let handler = util.handler;
    let requireLogin = util.requireLogin;
    let requireAdmin = util.requireAdmin;

    let Announcement = imports.models.Announcement;
    let User = imports.models.User;
    let Group = imports.models.Group;

    let router = express.Router();

    router.post("/announcements", requireLogin, handler(function*(req, res) {
        let announcement = {
            author: req.user._id,
            content: req.body.content,
            audienceGroup: req.body.groupId,
            timestamp: new Date()
        };
        announcement = yield Announcement.create(announcement);
        res.json(announcement);

    }));

    router.get("/announcements", requireLogin, handler(function*(req, res) {
        // find announcements that the user should be able to see
        let announcements = yield Announcement.find({
                "audienceGroup.members": req.user._id
            }, {
                // only respond with _id, author, content and timestamp
                _id: 1,
                author: 1,
                content: 1,
                timestamp: 1,
                audienceGroup: 1,
                entireTeam: 1
                    // populate author and sort by timestamp, skip and limit are for pagination
            })
            .populate("author")
            .populate("audienceGroup")
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

        // check if user is eligible to delete said announcement
        if (req.user._id == announcement.author.toString() || util.isUserAdmin(req.user)) {
            yield announcement.remove();
            yield Group.remove(req.params.announcementId);
            res.end("success");
        } else {
            // warn me about attempted hax, bruh
            yield util.sendEmail({
                to: "rafezyfarbod@gmail.com",
                subject: "MorTeam Security Alert!",
                text: "The user " + req.user.firstname + " " + req.user.lastname + " tried to perform administrator tasks. User ID: " + req.user._id
            });
            res.end("fail");
        }

    }));

    return router;

};
