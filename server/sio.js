"use strict";

module.exports = function(io, util, schemas) {

	let ObjectId = require("mongoose").Types.ObjectId;

	let Chat = schemas.Chat;
	let User = schemas.User;

	//assign variables to util functions(and objects) and database schemas
	for (key in util) {
		eval("var " + key + " = util." + key + ";");
	}
	for (key in schemas) {
		eval("var " + key + " = schemas." + key + ";");
	}

	let online_clients = {};
	io.on("connection", function(socket) {
		let sess = socket.request.session.user;
		if (sess && online_clients[sess._id] == undefined) {
			let userSubdivisionIds = sess.subdivisions.map(function(subdivision) {
				if (subdivision.accepted == true) {
					return new ObjectId(subdivision._id);
				}
			});
			Chat.find({
				team: sess.current_team.id,
				$or: [
					{
						userMembers: new ObjectId(sess._id)
					},
					{
						subdivisionMembers: {
							"$in": userSubdivisionIds
						}
					}
				]
			},
			{
				_id: 1
			}).exec(function(err, chats) {

				if (err) {
					console.error(err);
					res.end("fail");
				} else {
					let chatIds = chats.map(function(chat) { return chat._id.toString() });
					online_clients[sess._id] = {socket: socket.id, chats: chatIds};
					for ( let user_id in online_clients ) {
						if ( online_clients[user_id].chats.hasAnythingFrom( online_clients[sess._id].chats ) && user_id != sess._id  ) {
							io.to( online_clients[user_id].socket ).emit("joined", {_id: sess._id});
						}
					}
				}
			})
		} else if (sess) {
			for ( let user_id in online_clients ) {
				if ( online_clients[user_id].chats.hasAnythingFrom( online_clients[sess._id].chats ) && user_id != sess._id  ) {
					io.to( online_clients[user_id].socket ).emit("joined", {_id: sess._id});
				}
			}
		}

		socket.on("disconnect", function() {
			for ( let user_id in online_clients ) {
				if (sess && online_clients[sess._id]) { //TODO: sometimes online_clients[sess._id] doesnt exist (maybe because it takes time for the mongo query to execute and add user chats to the online_clients object at the sess._id index)
					if ( online_clients[user_id].chats.hasAnythingFrom( online_clients[sess._id].chats ) && user_id != sess._id  ) {
						io.to( online_clients[user_id].socket ).emit("left", {_id: sess._id});
					}
				}
			}
			if (sess) {
				delete online_clients[sess._id];
			}
		})
		socket.on("message", function(msg) {
				for ( let user_id in online_clients ) {
					let client_chats = online_clients[user_id].chats.map(function(chat_id) {
						return chat_id.toString();
					})
					if ( ~client_chats.indexOf( msg.chat_id ) && user_id != sess._id ) {
						if (msg.type == "private") {
							io.to( online_clients[user_id].socket ).emit("message", {
								chat_id: msg.chat_id,
								author_id: sess._id,
								author_fn: sess.firstname,
								author_ln: sess.lastname,
								author_profpicpath: sess.profpicpath,
								content: msg.content,
								timestamp: new Date(),
								type: "private"
							});
						} else {
							io.to( online_clients[user_id].socket ).emit("message", {
								chat_id: msg.chat_id,
								author_id: sess._id,
								author_fn: sess.firstname,
								author_ln: sess.lastname,
								author_profpicpath: sess.profpicpath,
								content: msg.content,
								timestamp: new Date(),
								chat_name: msg.chat_name,
								type: "group"
							});
						}
					}
				}
		})

		socket.on("get clients", function() {
			socket.emit("get clients", online_clients)
		})
		socket.on("new chat", function(data) {
			if (data.type == "private") {
				if ( online_clients[data.receiver] ) {
					online_clients[data.receiver].chats.push( data.chat_id );
					io.to( online_clients[ data.receiver ].socket ).emit("new chat", {
						type: "private",
						chat_id: data.chat_id,
						user_id: sess._id,
						firstname: sess.firstname,
						lastname: sess.lastname,
						profpicpath: sess.profpicpath
					});
				}
			} else if (data.type == "group") {
				User.find({
					$or: [
						{
							_id: { "$in": data.userMembers }
						},
						{
							subdivisions: { $elemMatch: { _id: {"$in": data.subdivisionMembers} } }
						}
					]
				}, function(err, users) {
					if (err) {
						console.error(err);
						res.end("fail");
					} else {
						for (let i = 0; i < users.length; i++) {
							if ( online_clients[ users[i]._id.toString() ] != undefined ) {
								online_clients[users[i]._id.toString()].chats.push( data.chat_id );
								io.to( online_clients[ users[i]._id.toString() ].socket ).emit("new chat", {
									type: "group",
									user_id: sess._id,
									userMembers: data.userMembers,
									subdivisionMembers: data.subdivisionMembers,
									name: data.name,
									chat_id: data.chat_id
								})
							}
						}
					}
				});
			}
		})
		socket.on("start typing", function(data) {
			for ( let user_id in online_clients ) {
				if ( ~online_clients[user_id].chats.indexOf( data.chat_id ) && user_id != sess._id ) {
					io.to( online_clients[user_id].socket ).emit("start typing", data)
				}
			}
		})
		socket.on("stop typing", function(data) {
			for ( let user_id in online_clients ) {
				if ( ~online_clients[user_id].chats.indexOf( data.chat_id ) && user_id != sess._id ) {
					io.to( online_clients[user_id].socket ).emit("stop typing", data)
				}
			}
		})
	});
};
