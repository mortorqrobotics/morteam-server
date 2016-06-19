"use strict";

module.exports = function(imports) {

	let ObjectId = imports.modules.mongoose.Types.ObjectId;
	let Promise = imports.modules.Promise;

	let util = imports.util;

	let Chat = imports.models.Chat;
	let User = imports.models.User;

	let io = imports.socketio;

	let online_clients = {};

	io.on("connection", Promise.coroutine(function*(socket) {
		let sess = socket.request.session.userId && (yield User.findOne({
			_id: socket.request.session.userId
		}));
		if (sess) {
			let userSubdivisionIds = util.activeSubdivisionIds(sess.subdivisions);

			try {

				if (!(sess._id in online_clients)) {

					let chats = yield Chat.find({
						team: sess.current_team.id,
						$or: [
							{ userMembers: new ObjectId(sess._id) },
							{ subdivisionMembers: { "$in": userSubdivisionIds } }
						]
					}, { _id: 1 }).exec();

					let chatIds = chats.map(chat => chat._id.toString());

					for ( let user_id in online_clients ) {
						if ( online_clients[user_id].chats.hasAnythingFrom( chatIds ) ) {
							for (let sock of online_clients[user_id].sockets) {
								io.to(sock ).emit("joined", {_id: sess._id});
							}
						}
					}
					online_clients[sess._id] = {
						chats: chatIds,
						sockets: []
					};
				}
				online_clients[sess._id].sockets.push(socket.id);

			} catch (err) {
				console.error(err);
			}
		}

		socket.on("disconnect", function() {
			if (!sess || !(sess._id in online_clients)) {
				// TODO: sometimes online_clients[sess._id] doesnt exist
				// (maybe because it takes time for the mongo query to execute
				// and add user chats to the online_clients object at the sess._id index)
				return;
			}

			let index = online_clients[sess._id].sockets.indexOf(socket.id);
			if (index != -1) {
				online_clients[sess._id].sockets.splice(index, 1); // remove the socket from the list of sockets for the user

				if (online_clients[sess._id].sockets.length == 0) { // if no clients remain for the user

					let chatIds = online_clients[sess._id].chats;
					delete online_clients[sess._id]; // remove from online clients

					for ( let user_id in online_clients ) { // notify other clients that they went offline
						if ( online_clients[user_id].chats.hasAnythingFrom(chatIds)) { // if they have any chats in common
							for (let sock of online_clients[user_id].sockets) {
								io.to(sock).emit("left", {_id: sess._id});
							}
						}
					}

				}
			}
		});

		// TODO: if a user has multiple clients and sends a message, display sent message on all clients

		socket.on("message", function(msg) {
			msg.content = util.normalizeDisplayedText(msg.content);
			for ( let user_id in online_clients ) {
				if (user_id == sess._id) {
					continue; // don't send messages to the user that sent them
				}
				let client_chats = online_clients[user_id].chats.map(chat_id => chat_id.toString());
				if ( client_chats.indexOf( msg.chat_id ) != -1 ) { // if the user is part of the chat the message was sent to
					let message = {
						chat_id: msg.chat_id,
						author_id: sess._id,
						author_fn: sess.firstname,
						author_ln: sess.lastname,
						author_profpicpath: sess.profpicpath,
						content: msg.content,
						timestamp: new Date()
					};
					if (msg.type == "private") {
						message.type = "private";
					} else {
						message.type = "group";
						message.chat_name = msg.chat_name;
					}
					for (let sock of online_clients[user_id].sockets) {
						io.to(sock).emit("message", message);
					}
				}
			}
		});

		socket.on("get clients", function() {
			socket.emit("get clients", Object.keys(online_clients));
		});

		socket.on("new chat", Promise.coroutine(function*(data) {
			if (data.type == "private") {
				if ( online_clients[data.receiver] ) {
					online_clients[data.receiver].chats.push( data.chat_id );
					io.to( online_clients[ data.receiver ].sockets ).emit("new chat", {
						type: "private",
						chat_id: data.chat_id,
						user_id: sess._id,
						firstname: sess.firstname,
						lastname: sess.lastname,
						profpicpath: sess.profpicpath
					});
				}
			} else if (data.type == "group") {
				try {

					let users = yield User.find({
						$or: [
							{
								_id: { "$in": data.userMembers }
							},
							{
								subdivisions: { $elemMatch: { _id: {"$in": data.subdivisionMembers} } }
							}
						]
					});

					for (let user of users) {
						let userId = user._id.toString();
						if ( online_clients[userId] != undefined ) {
							online_clients[userId].chats.push( data.chat_id );
							io.to( online_clients[userId].sockets ).emit("new chat", {
								type: "group",
								user_id: sess._id,
								userMembers: data.userMembers,
								subdivisionMembers: data.subdivisionMembers,
								name: data.name,
								chat_id: data.chat_id
							});
						}
					}

				} catch (err) {
					console.error(err);
					// res.end("fail");
				}
			}
		}));

		socket.on("start typing", function(data) {
			for ( let user_id in online_clients ) {
				if ( ~online_clients[user_id].chats.indexOf( data.chat_id ) && user_id != sess._id ) {
					for (let sock of online_clients[user_id].sockets) {
						io.to(sock).emit("start typing", data);
					}
				}
			}
		});

		socket.on("stop typing", function(data) {
			for ( let user_id in online_clients ) {
				if ( ~online_clients[user_id].chats.indexOf( data.chat_id ) && user_id != sess._id ) {
					for (let sock of online_clients[user_id].sockets) {
						io.to(sock).emit("stop typing", data);
					}
				}
			}
		});

	}));
};
