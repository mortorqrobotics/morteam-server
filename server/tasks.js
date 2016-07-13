"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Promise = imports.modules.Promise;
    let util = imports.util;

    let handler = util.handler;
    let requireLogin = util.requireLogin;
    let requireAdmin = util.requireAdmin;

    let Task = imports.models.Task;
    let User = imports.models.User;

    let router = express.Router();

    router.post("/users/id/:userId/tasks", requireAdmin, handler(function*(req, res) {

        // for iOS and Android
        if (typeof(req.body.due_date) == "string") {
            req.body.due_date = new Date(req.body.due_date);
        }

        let task = {
            name: req.body.task_name,
            for: req.params.userId, // why a reserved word :/
            due_date: req.body.due_date,
            creator: req.user._id,
            completed: false
        };

        if (req.body.task_description) {
            task.description = req.body.task_description;
        }

        task = yield Task.create(task);

        let recipient = yield User.findOne({
            _id: task.for
        });

        if (!recipient) {
            return res.end("fail");
        }

        yield util.mail.sendEmail({
            to: recipient.email,
            subject: "New Task Assigned By " + req.user.firstname + " " + req.user.lastname,
            text: "View your new task at http://www.morteam.com/profiles/id/" + task.for
        });

        res.end(task._id.toString());

    }));

    router.get("/users/id/:userId/tasks/completed", requireLogin, handler(function*(req, res) {

        let tasks = yield Task.find({
            for: req.params.userId,
            completed: true
        }).populate("creator");

        res.json(tasks);

    }));

    // TODO: should completed and pending tasks be put into one request?

    router.get("/users/id/:userId/tasks/pending", requireLogin, handler(function*(req, res) {

        let tasks = yield Task.find({
            for: req.params.userId,
            completed: false
        }).populate("creator");

        res.json(tasks);

    }));

    router.post("/tasks/id/:taskId/markCompleted", requireLogin, handler(function*(req, res) {

        // TODO: is it possible for this route to not take in the target user?

        if (req.user._id != req.body.target_user // TODO: targetUserId instead?
            &&
            !util.positions.isUserAdmin(req.user)) {

            return res.end("fail");

        }

        yield Task.findOneAndUpdate({
            _id: req.params.taskId
        }, {
            "$set": {
                completed: true
            }
        });

        res.end("success");

    }));

    return router;

};
