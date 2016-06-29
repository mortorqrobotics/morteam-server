"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Promise = imports.modules.Promise;
    let util = imports.util;
    let Group = imports.models.NormalGroup;
    let requireLogin = util.requireLogin;

    let router = express.Router();

    router.post("/groups", Promise.coroutine(function*(req, res) {
        let group = {
            users: req.body.users,
            groups: req.body.groups
        }
        try {
            group = yield Group.create(group);
            res.json(group);

        } catch (err) {
            console.log(err);
            res.end("fail");
        }
    }));

    router.get("/groups", requireLogin, Promise.coroutine(function(req, res) {
        try {
            let groups = yield Group.find({
                members: req.user._id;
            });
            res.json(group);
        } catch (err) {
            console.log(err);
            res.end("fail")
        }
    }));

    return router;

};
