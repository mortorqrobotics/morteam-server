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
    let Subdivision = imports.models.Subdivision;

    let router = express.Router();

    // TODO: separate this into separate requests for group and private chats
    router.post("/chats", requireLogin, handler(function*(req, res) {

        let subdivisionMembers = req.body.subdivisionMembers || [];
        let userMembers = req.body.userMembers || [];

        if (req.body.type == "private") {
            // private chat

            if ((yield Chat.count({
                    group: false,
                    team: req.user.team,
                    $or: [{
                            userMembers: [req.user._id, req.body.user2]
                        }, {
                            userMembers: [req.body.user2, req.user._id]
                        }] // check to see if private convo already exists
                })) > 0) {
                return res.end("exists");
            }

            let chat = yield Chat.create({
                userMembers: userMembers,
                team: req.user.team,
                group: false
            });

            // get the user that is not the person making this request
            let user2Id = util.getUserOtherThanSelf(chat.userMembers, req.user._id.toString());
            let user = yield User.findOne({
                _id: user2Id
            }); // check for team here?

            if (!user) {
                return res.end("fail");
            }

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
                return res.end("fail");
            }

            let chat = yield Chat.create({
                team: req.user.team,
                name: util.normalizeDisplayedText(req.body.name),
                userMembers: JSON.parse(userMembers),
                subdivisionMembers: JSON.parse(subdivisionMembers),
                group: true
            });

            res.json(chat);
        }

    }));

    router.get("/chats", requireLogin, handler(function*(req, res) {
        // get an array of _ids of subdivisions of which the user is a member. (dat proper grammar doe)
        let userSubdivisionIds = util.activeSubdivisionIds(req.user.subdivisions);

        // find a chat in the current team that also has said user as a member or has a subdivision of which said user is a member.
        let chats = yield Chat.find({
                team: req.user.team,
                $or: [{
                    userMembers: req.user._id
                }, {
                    subdivisionMembers: {
                        $in: userSubdivisionIds
                    }
                }]
            }, {
                _id: 1,
                name: 1,
                group: 1,
                userMembers: 1,
                subdivisionMembers: 1,
                updated_at: 1
            })
            .slice("messages", [0, 1])
            .populate("userMembers subdivisionMembers")
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
        // user members only, not subdivision members

        let chat = yield Chat.findOne({
            _id: req.params.chatId,
            team: req.user.team
        }, {
            userMembers: 1,
            subdivisionMembers: 1
        });

        let users = yield User.find({
            $or: [{
                _id: {
                    $in: chat.userMembers
                }
            }, {
                subdivisions: {
                    $elemMatch: {
                        _id: {
                            $in: chat.subdivisionMembers
                        }
                    }
                }
            }]
        });

        res.json(users);

    }));

    router.get("/chats/id/:chatId/allMembers", requireLogin, handler(function*(req, res) {
        // both user members and subdivision members

        let chat = yield Chat.findOne({
            _id: req.params.chatId,
            team: req.user.team
        }, {
            userMembers: 1,
            subdivisionMembers: 1,
            group: 1
        });

        let userMembers = yield User.find({
            _id: {
                $in: chat.userMembers
            }
        });
        let subdivisionMembers = yield Subdivision.find({
            _id: {
                $in: chat.subdivisionMembers
            }
        });

        res.json({
            members: {
                userMembers: userMembers,
                subdivisionMembers: subdivisionMembers
            },
            group: chat.group
        });

    }));

    router.put("/chats/group/id/:chatId/name", requireLogin, handler(function*(req, res) {

        if (req.body.newName.length >= 20) {
            return res.end("Name has to be 19 characters or fewer.");
        }

        yield Chat.update({
            _id: req.params.chatId,
            team: req.user.team
        }, {
            name: util.normalizeDisplayedText(req.body.newName)
        });

        res.end("success");

    }));

    router.delete("/chats/id/:chatId", requireLogin, requireAdmin, handler(function*(req, res) {

        yield Chat.findOneAndRemove({
            _id: req.params.chatId,
            team: req.user.team
        });

        res.end("success");

    }));

    router.post("/chats/id/:chatId/messages", requireLogin, handler(function*(req, res) {

        yield Chat.update({
            _id: req.params.chatId,
            team: req.user.team
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
