"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Promise = imports.modules.Promise;
    let util = imports.util;

    let handler = util.handler;
    let requireLogin = util.requireLogin;
    let requireAdmin = util.requireAdmin;
    let checkBody = util.middlechecker.checkBody;
    let types = util.middlechecker.types;

    let Task = imports.models.Task;
    let User = imports.models.User;

    let router = express.Router();

    router.post("/users/id/:userId/tasks", checkBody({
        dueDate: types.string,
        name: types.string,
        description: types.string,
    }), requireAdmin, handler(function*(req, res) {

        // for iOS and Android
        if (typeof(req.body.dueDate) == "string") {
            req.body.dueDate = new Date(req.body.dueDate);
        }

        if (req.body.name == "") {
            return res.status(400).end("Task name cannot be empty");
        }

        let recipient = yield User.findOne({
            _id: req.params.userId,
        });

        if (!recipient) {
            return res.status(400).end("The recipient does not exist");
        }

        let task = {
            name: req.body.name,
            for: req.params.userId,
            dueDate: req.body.dueDate,
            creator: req.user._id,
            completed: false,
        };

        if (req.body.description) {
            task.description = req.body.description;
        }

        task = yield Task.create(task);

        task.creator = req.user;
        res.json(task);

        yield util.mail.sendEmail({
            to: recipient.email,
            subject: "New Task Assigned By " + req.user.firstname + " " + req.user.lastname,
            text: "View your new task at https://www.morteam.com/profiles/id/" + task.for
        });

    }));

    router.get("/users/id/:userId/tasks/completed", checkBody(), requireLogin, handler(function*(req, res) {

        let tasks = yield Task.find({
            for: req.params.userId,
            completed: true
        }).populate("creator");

        res.json(tasks);

    }));

    // TODO: should completed and pending tasks be put into one request?

    router.get("/users/id/:userId/tasks/pending", checkBody(), requireLogin, handler(function*(req, res) {

        let tasks = yield Task.find({
            for: req.params.userId,
            completed: false,
        }).populate("creator");

        res.json(tasks);

    }));

    router.post("/tasks/id/:taskId/markCompleted", checkBody(), requireLogin, handler(function*(req, res) {

        if (!util.positions.isUserAdmin(req.user)) {
            return res.status(403).end("You cannot mark this task as completed");
        }

        yield Task.findOneAndUpdate({
            _id: req.params.taskId
        }, {
            $set: {
                completed: true
            }
        });

        res.end();

    }));

    return router;

};
