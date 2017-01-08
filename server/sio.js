"use strict";

module.exports = function(imports) {

    // TODO: update this for groups

    let ObjectId = imports.modules.mongoose.Types.ObjectId;
    let Promise = imports.modules.Promise;

    let util = imports.util;

    let Chat = imports.models.Chat;
    let User = imports.models.User;

    let io = imports.socketio;

    // { [userId]: [ { sockets: [Socket] } ] }
    let onlineClients = {};

    let sio = {};

    io.on("connection", Promise.coroutine(function*(socket) {
        let sess = socket.request.session.userId && (yield User.findOne({
            _id: socket.request.session.userId
        }));
        if (sess) {
            try {

                if (!(sess._id in onlineClients)) { // later

                    let chats = yield Chat.find(util.audience.audienceQuery(sess), {
                        _id: 1,
                    });

                    let chatIds = chats.map(chat => chat._id.toString());

                    for (let user_id in onlineClients) {
                        if (onlineClients[user_id].chats.hasAnythingFrom(chatIds)) {
                            for (let sock of onlineClients[user_id].sockets) {
                                io.to(sock).emit("joined", {
                                    _id: sess._id
                                });
                            }
                        }
                    }
                    onlineClients[sess._id] = {
                        chats: chatIds,
                        sockets: []
                    };
                }
                onlineClients[sess._id].sockets.push(socket.id);

            } catch (err) {
                console.error(err);
            }
        }

        socket.on("disconnect", function() {
            if (!sess || !(sess._id in onlineClients)) {
                // TODO: sometimes onlineClients[sess._id] doesnt exist
                // (maybe because it takes time for the mongo query to execute
                // and add user chats to the onlineClients object at the sess._id index)
                return;
            }

            let index = onlineClients[sess._id].sockets.indexOf(socket.id);
            if (index != -1) {
                onlineClients[sess._id].sockets.splice(index, 1); // remove the socket from the list of sockets for the user

                if (onlineClients[sess._id].sockets.length == 0) { // if no clients remain for the user

                    let chatIds = onlineClients[sess._id].chats;
                    delete onlineClients[sess._id]; // remove from online clients

                    for (let user_id in onlineClients) { // notify other clients that they went offline
                        if (onlineClients[user_id].chats.hasAnythingFrom(chatIds)) { // if they have any chats in common
                            for (let sock of onlineClients[user_id].sockets) {
                                io.to(sock).emit("left", {
                                    _id: sess._id
                                });
                            }
                        }
                    }

                }
            }
        });

        socket.on("sendMessage", util.handler(function*(data) {

            let now = new Date();
            let content = util.normalizeDisplayedText(data.content);
//            let content = data.content;
            let chatId = data.chatId;

            yield Chat.update({
                $and: [
                    { _id: chatId },
                    util.audience.audienceQuery(sess),
                ],
            }, {
                $push: {
                    messages: {
                        $each: [{
                            author: sess._id,
                            content: content,
                            timestamp: now,
                        }],
                        $position: 0
                    }
                },
                updated_at: now,
            });

            let message = {
                author: sess,
                content: content,
                timestamp: now,
            };

            let chat = yield Chat.findOne({
                _id: chatId,
            }, {
                audience: 1,
                isTwoPeople: 1,
                name: 1,
            });
            let users = yield util.audience.getUsersIn(chat.audience);
            let userIds = users
                .map(user => user._id.toString())
                .filter(userId => userId in onlineClients);
            for (let userId of userIds) {
                for (let sock of onlineClients[userId].sockets) {
                    if (sock !== socket.id) {
                        if (chat.isTwoPeople) {
                            io.to(sock).emit("message", {
                                chatId: chatId,
                                message: message,
                                type: "pair",
                            });
                        } else {
                            io.to(sock).emit("message", {
                                chatId: chatId,
                                message: message,
                                type: "group",
                                name: chat.name,
                            });
                        }
                    }
                }
            }
            socket.emit("message-sent", {
                chatId: chatId,
                content: content,
            });

        }));

        // TODO: if a user has multiple clients and sends a message, display sent message on all clients

        socket.on("get clients", function() {
            socket.emit("get clients", Object.keys(onlineClients));
        });

        // TODO: send new chats over socket.io

        socket.on("start typing", function(data) {
            for (let user_id of Object.keys(onlineClients)) {
                if (~onlineClients[user_id].chats.indexOf(data.chatId) && user_id != sess._id) {
                    for (let sock of onlineClients[user_id].sockets) {
                        io.to(sock).emit("start typing", data);
                    }
                }
            }
        });

        socket.on("stop typing", function(data) {
            for (let userId of Object.keys(onlineClients)) {
                if (onlineClients[userId].chats.indexOf(data.chatId) != -1
                    && userId != sess._id
                ) {
                    for (let sock of onlineClients[userId].sockets) {
                        io.to(sock).emit("stop typing", data);
                    }
                }
            }
        });

    }));

    sio.createChat = Promise.coroutine(function*(chat) {
        let users = yield util.audience.getUsersIn({
            users: chat.audience.users.map(u => u._id),
            groups: chat.audience.groups.map(g => g._id),
        });
        for (let user of users) {
            if (user._id in onlineClients) {
                for (let sock of onlineClients[user._id].sockets) {
                    io.to(sock).emit("newChat", {
                        chat: chat,
                    });
                }
            }
        }
    });

    return sio;
};
