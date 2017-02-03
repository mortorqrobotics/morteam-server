"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Promise = imports.modules.Promise;
    let util = imports.util;
    let User = imports.models.User;
    let Team = imports.models.Team;
    let NormalGroup = imports.models.NormalGroup;
    let AllTeamGroup = imports.models.AllTeamGroup;
    let MultiTeamGroup = imports.models.MultiTeamGroup;
    let Group = imports.models.Group;

    let handler = util.handler;
    let requireLogin = util.requireLogin;
    let requireAdmin = util.requireAdmin;
    let checkBody = util.middlechecker.checkBody;
    let types = util.middlechecker.types;

    let router = express.Router();

    router.post("/groups/normal", checkBody({
        users: [types.objectId(User)],
        name: types.string,
    }), handler(function*(req, res) {

        if (req.body.users.indexOf(req.user._id.toString()) === -1) {
            req.body.users.push(req.user._id);
        }

        let group = yield NormalGroup.createGroup({
            users: req.body.users,
            name: req.body.name,
            team: req.user.team,
        });

        res.json(group);

    }));

    router.get("/groups", checkBody(), requireLogin, handler(function*(req, res) {

        let groups = yield Group.find({
            _id: {
                $in: req.user.groups,
            },
        });

        res.json(groups);

    }));

    router.get("/groups/normal", checkBody(), requireLogin, handler(function*(req, res) {

        let groups = yield NormalGroup.find({
            _id: {
                $in: req.user.groups,
            },
        });

        res.json(groups);

    }));

    router.get("/groups/other", checkBody(), requireLogin, handler(function*(req, res) {

        let groups = yield NormalGroup.find({
            team: req.user.team,
            _id: {
                $not: {
                    $in: req.user.groups,
                },
            },
        });

        res.json(groups);

    }));

    router.get("/groups/allTeam", checkBody(), requireLogin, handler(function*(req, res) {

        let groups = yield AllTeamGroup.find().populate("team");

        res.json(groups);

    }));

    router.get("/groups/id/:groupId", checkBody(), requireLogin, handler(function*(req, res) {

        let group = yield Group.findOne({
            _id: req.params.groupId,
        });

        res.json(group);

    }));

    router.get("/groups/normal/id/:groupId/users", checkBody(), requireLogin, handler(function*(req, res) {

        let users = yield User.find({
            groups: req.params.groupId,
        });

        res.json(users);

    }));

    // TODO: permissions other than just admin?
    router.post("/groups/normal/id/:groupId/users", checkBody({
        users: [types.objectId(User)],
    }), requireAdmin, handler(function*(req, res) {

        yield NormalGroup.addUsers(req.params.groupId, req.body.users);

        res.end();

        // TODO: update addUsers to use findByIdAndUpdate and { new: true } to return the new audience perhaps

    }));

    router.post("/groups/normal/id/:groupId/join", checkBody(), requireLogin, handler(function*(req, res) {

        let normalGroup = yield NormalGroup.findOne({
            _id: req.params.groupId,
        });

        if (!normalGroup || normalGroup.team.toString() != req.user.team.toString()) {
            return res.status(403).end("Invalid group");
        }

        yield NormalGroup.addUsers(req.params.groupId, [req.user._id]);

        res.end();

    }));

    router.delete("/groups/normal/id/:groupId/users/id/:userId", requireLogin, handler(function*(req, res) {

        if (req.user._id.toString() != req.params.userId
            && !util.positions.isUserAdmin(req.user)
        ) {
            return res.status(403).end("You are not an administrator");
        }

        yield NormalGroup.removeUsers(req.params.groupId, [req.params.userId]);

        res.end();

    }));

    router.post("/groups/multiTeam", checkBody({
        teams: [types.objectId(Team)],
    }), handler(function*(req, res) {

        let group = yield MultiTeamGroup.createGroup({
            teams: req.body.teams,
        });

        res.json(group);

    }));

    return router;
};
