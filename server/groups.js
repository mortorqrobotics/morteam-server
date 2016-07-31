"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Promise = imports.modules.Promise;
    let util = imports.util;
    let NormalGroup = imports.models.NormalGroup;
    let Group = imports.models.Group;

    let handler = util.handler;
    let requireLogin = util.requireLogin;
    let requireAdmin = util.requireAdmin;

    let router = express.Router();

    router.post("/groups", handler(function*(req, res) {

        let group = {
            users: req.body.users,
            groups: req.body.groups,
            name: req.body.name,
            isPublic: req.body.isPublic
        }

        group = yield NormalGroup.create(group);

        res.json(group);

    }));

    router.get("/groups", requireLogin, handler(function*(req, res) {

        let groups = yield Group.find({
            members: req.user._id
        });

        res.json(groups);

    }));

    router.get("/normalgroups", requireLogin, handler(function*(req, res) {

        let groups = yield NormalGroup.find({
            members: req.user._id
        });

        res.json(groups);

    }));

    router.get("/groups/public", requireLogin, handler(function*(req, res) {

        let groups = yield Group.find({
            isPublic: true
        });

        res.json(groups);

    }));

    router.put("/groups/id/:groupId", requireLogin, handler(function*(req, res) {

        let group = yield NormalGroup.update({
            _id: req.params.groupId
        }, {
            users: req.body.users,
            groups: req.body.groups
        });

        res.json(group); // TODO: add permissions?

    }));


    return router;
};
