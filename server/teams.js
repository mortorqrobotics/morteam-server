"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Promise = imports.modules.Promise;
    let util = imports.util;

    let handler = util.handler;
    let requireLogin = util.requireLogin;
    let requireAdmin = util.requireAdmin;

    let User = imports.models.User;
    let Team = imports.models.Team;
    let AttendanceHandler = imports.models.AttendanceHandler;
    let Announcement = imports.models.Announcement;
    let Chat = imports.models.Chat;
    let Event = imports.models.Event;
    let Folder = imports.models.Folder;

    let router = express.Router();

    router.get("/teams/current/users", requireLogin, handler(function*(req, res) {

        let users = yield User.find({
            team: req.user.team,
        });

        res.json(users);

    }));

    router.post("/teams", requireLogin, handler(function*(req, res) {

        if (req.user.team) {
            return res.status(400).end("You already have a team");
        }

        let number = parseInt(req.body.number);
        if (isNaN(number) || number <= 0 || number >= 100000) {
            return res.status(400).end("Invalid team number");
        }

        if (yield Team.findOne({
                id: req.body.id
            })) {
            return res.status(400).end("Team code is taken");
        }

        let team = yield Team.create({
            id: req.body.id,
            name: req.body.name,
            number: req.body.number,
        });

        req.user.team = team._id;
        req.user.scoutCaptain = true;
        req.user.position = "leader"; // TODO: ask the user about this when creating team?
        yield req.user.save();

        //let folder = yield Folder.create({
        //    name: "Team Files",
        //    team: team._id,
        //    entireTeam: true,
        //    creator: req.user._id,
        //    defaultFolder: true,
        //});

        res.json(team);

    }));

    router.post("/teams/code/:teamCode/join", requireLogin, handler(function*(req, res) {

        if (req.user.team) {
            return res.status(400).end("You already have a team");
        }

        let team = yield Team.findOne({
            id: req.params.teamCode
        });

        if (!team) {
            return res.status(400).end("Team does not exist");
        }

        if (req.user.bannedFromTeams.indexOf(team._id) != -1) {
            return res.status(400).end("You are banned from this team");
        }

        req.user.position = "member";
        req.user.team = team._id;
        yield req.user.save();

        // TODO: figure out what to do with attendance handlers
        //        yield AttendanceHandler.update({
        //            entireTeam: true,
        //            event_date: {
        //                $gte: new Date()
        //            },
        //            "event.team": team._id
        //        }, {
        //            "$push": {
        //                "attendees": {
        //                    user: req.user._id,
        //                    status: "absent"
        //                }
        //            }
        //        });

        // TODO: should personal folders still be created automatically?
        //        yield Folder.create({
        //            name: "Personal Files",
        //            team: team._id,
        //            userMembers: req.user._id, // should this be [req.user._id] instead?
        //            creator: req.user._id,
        //            defaultFolder: true
        //        });

        res.json(team);

    }));

    router.get("/teams/current/number", requireLogin, handler(function*(req, res) {

        let team = yield Team.findOne({
            _id: req.user.team
        });

        res.end(String(team.number));

    }));

    router.get("/teams/number/:teamNum/exists", requireLogin, handler(function*(req, res) {

        if (yield Team.find({
                number: parseInt(req.params.teamNum)
            })) {
            res.json(teams[0]); // TODO: should this just be "true" instead?
            // the team is used by the client, instead of being "true" the route should be renamed, getIfExists or something
        } else {
            res.end("false");
        }

    }));

    router.delete("/teams/current/users/id/:userId", requireAdmin, handler(function*(req, res) {
        // remove a user from a team

        let user = yield User.findOne({
            _id: req.params.userId,
            team: req.user.team
        });

        if (!user) {
            return res.status(400).end("That user is not on your team");
        }

        if (util.positions.isUserAdmin(user) && (yield User.count({
                team: req.user.team,
                position: util.positions.adminPositionsQuery,
            })) <= 1) {
            return res.status(400).end("You cannot remove the only Admin on your team");
        }

        user.team = undefined;
        user.position = undefined;
        user.scoutCaptain = undefined;
        // TODO: remove the user from all hidden groups
        yield user.save();

        let allModels = [
            Announcement,
            Chat,
            Event,
            Folder,
        ];
        for (let Model of allModels) {
            yield Model.update({
                "audience.users": user._id,
            }, {
                $pull: {
                    "audience.users": user._id,
                }
            });
        }

        res.end();

    }));

    // TODO: does this need to exist?
    router.get("/users/id/:userId/teamInfo", requireLogin, handler(function*(req, res) {

        let user = yield User.findOne({
            _id: req.params.userId,
            team: req.user.team
        });

        res.json({
            team: user.team,
            position: user.position,
            scoutCaptain: user.scoutCaptain
        });

    }));

    return router;

};
