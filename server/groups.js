"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Promise = imports.modules.Promise;
    let util = imports.util;
    let NormalGroup = imports.models.NormalGroup;
    let Group = imports.models.Group;
    let requireLogin = util.requireLogin;

    let router = express.Router();

    router.post("/groups", Promise.coroutine(function*(req, res) {
        let group = {
            users: req.body.users,
            groups: req.body.groups
        }
        try {
            group = yield NormalGroup.create(group);
            res.json(group);

        } catch (err) {
            console.log(err);
            res.end("fail");
        }
    }));

    router.get("/groups", requireLogin, Promise.coroutine(function*(req, res) {
        try {
            let groups = yield Group.find({
                members: req.user._id
            });
            res.json(groups);
        } catch (err) {
            console.log(err);
            res.end("fail");
        }
    }));

    router.put("/groups/:id", Promise.coroutine(function*(req, res) {

        try {
            let group = yield NormalGroup.update({
                _id: req.params._id
            }, {
                users: req.body.users,
                groups: req.body.groups
            });
            res.json(group);
        } catch (err) {
            console.log(err);
            res.end("fail");
        }
    }));


    return router;
};
