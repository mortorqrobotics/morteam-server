"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let ObjectId = imports.modules.mongoose.Types.ObjectId;
    let Promise = imports.modules.Promise;
    let util = imports.util;

    let handler = util.handler;
    let requireLogin = util.requireLogin;
    let requireAdmin = util.requireAdmin;

    let Chat = imports.models.Chat;
    let User = imports.models.User;
    let Group = imports.models.Group;

    let router = express.Router();

    // TODO: separate this into separate requests for group and private chats
    router.post("/chats", requireLogin, handler(function*(req, res) {

        let group = req.body.group;


        if (req.body.type == "private") {
            // private chat

            // check to see if already exists
            if ((yield Chat.count({
                    isTwoPeople: true,
                    "group.members": req.body.group.members
                })) > 0) {
                return res.end("exists");
            }


            let chat = yield Chat.create({
                group: group,
                isTwoPeople: true
            });

            res.json({
                _id: user._id,
                fn: user.firstname,
                ln: user.lastname,
                profpicpath: user.profpicpath,
                chat_id: chat._id
            });

        } else {
            // group chat

            if (req.body.name.length >= 20) { // name character limit
                return res.end("Name has to be 19 characters or fewer.");
            }

            let chat = yield Chat.create({
                name: util.normalizeDisplayedText(req.body.name),
                group: group,
                isTwoPeople: false
            });

            res.json(chat);
        }

    }));

    router.get("/chats", requireLogin, handler(function*(req, res) {

        // find a chat that has said user as a member
        let chats = yield Chat.find({
                "group.members": req.user._id
            }, {
                _id: 1,
                name: 1,
                group: 1,
                updated_at: 1
            })
            .slice("messages", [0, 1])
            .populate("group")
            .sort("-updated_at")
            .exec();
        // ^ the code above gets the latest message from the chat (for previews in iOS and Android) and orders the list by most recent.

        res.json(chats);

    }));

    router.get("/chats/id/:chatId/messages", requireLogin, handler(function*(req, res) {
        // TODO: maybe in the future combine this with getUsersInChat to improve performance

        let skip = parseInt(req.query.skip);

        // loads 20 messages after skip many messages. example: if skip is 0, it loads messages 0-19, if it"s 20, loads 20-39, etc.
        let chat = yield Chat.findOne({
                _id: req.params.chatId
            })
            .slice("messages", [skip, 20])
            .populate("messages.author")
            .exec();

        res.json(chat.messages);

    }));

    router.get("/chats/id/:chatId/users", requireLogin, handler(function*(req, res) {
        // user members only, not groups

        let chat = yield Chat.findOne({
            _id: req.params.chatId
        });

        let users = yield User.find({
            _id: {
                $in: chat.group.members
            }
        });

        res.json(users);

    }));

    router.get("/chats/id/:chatId/allMembers", requireLogin, handler(function*(req, res) {

        let chat = yield Chat.findOne({
            _id: req.params.chatId
        }).populate("group");

        let userMembers = yield User.find({
            _id: {
                $in: chat.group.users
            }
        });

        let groups = yield Group.find({
            _id: {
                $in: chat.group.groups
            }
        })

        // TODO: the purpose of this currently is to show users and subdivisions
        // try clicking on the gear for a chat in morteam
        // should populate the individual users and groups of a chat
        // this will all be figured out once information is necessary on the frontend

        res.json({
            members: {
                userMembers: userMembers,
                groups: groups
            },
            isTwoPeople: chat.isTwoPeople
        });

    }));

    router.put("/chats/group/id/:chatId/name", requireLogin, handler(function*(req, res) {

        if (req.body.newName.length >= 20) {
            return res.end("Name has to be 19 characters or fewer.");
        }

        // TODO: check if the user is a member of the chat

        yield Chat.update({
            _id: req.params.chatId,
        }, {
            name: util.normalizeDisplayedText(req.body.newName)
        });

        res.end("success");

    }));

    router.delete("/chats/id/:chatId", requireAdmin, handler(function*(req, res) {

        // TODO: check if the user has permissions to delete the chat
        // should they have to be a member of it?

        yield Chat.findOneAndRemove({
            _id: req.params.chatId,
        });

        res.end("success");

    }));

    router.post("/chats/id/:chatId/messages", requireLogin, handler(function*(req, res) {

        yield Chat.update({
            _id: req.params.chatId,
        }, {
            $push: {
                messages: {
                    $each: [{
                        author: req.user._id,
                        content: util.normalizeDisplayedText(req.body.content),
                        timestamp: new Date()
                    }],
                    $position: 0
                }
            },
            updated_at: new Date()
        });

        res.end("success");

    }));

    return router;

};
