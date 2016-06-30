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
            groups: req.body.groups
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

    router.put("/groups/id/:id", requireLogin, handler(function*(req, res) {

        let group = yield NormalGroup.update({
            _id: req.params._id
        }, {
            users: req.body.users,
            groups: req.body.groups
        });

        res.json(group); // TODO: add permissions?

    }));


    return router;
};
