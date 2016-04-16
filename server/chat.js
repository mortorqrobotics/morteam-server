"use strict";

module.exports = function(app, util, schemas) {

	let ObjectId = require("mongoose").Types.ObjectId;
	let Promise = require("bluebird");

	let requireLogin = util.requireLogin;
	let requireAdmin = util.requireAdmin;

	let Chat = schemas.Chat;
	let User = schemas.User;
	let Subdivision = schemas.Subdivision;

	app.post("/f/createChat", requireLogin, Promise.coroutine(function*(req, res) {

		let subdivisionMembers = req.body.subdivisionMembers || [];
		let userMembers = req.body.userMembers || [];

		try {

			if (req.body.type == "private") {
				// private chat

				if((yield Chat.count({
					group: false,
					team: req.user.current_team.id,
					$or: [
						{ userMembers: [req.user._id, req.body.user2] },
						{ userMembers: [req.body.user2, req.user._id] }
					] // check to see if private convo already exists
				})) > 0) {
					return res.end("exists");
				}

				let chat = yield Chat.create({
					userMembers: userMembers,
					team: req.user.current_team.id,
					group: false
				});

				// get the user that is not the person making this request
				let user2_id = util.getUserOtherThanSelf(chat.userMembers, req.user._id.toString());
				let user = yield User.findOne({_id: user2_id});

				res.end(JSON.stringify({
					_id: user._id,
					fn: user.firstname,
					ln: user.lastname,
					profpicpath: user.profpicpath,
					chat_id: chat._id
				}));

			} else {
				// group chat

				if (req.body.name.length >= 20) { // name character limit
					return res.end("fail");
				}

				let chat = yield Chat.create({
					team: req.user.current_team.id,
					name: req.body.name,
					userMembers: JSON.parse(userMembers),
					subdivisionMembers: JSON.parse(subdivisionMembers),
					group: true
				});

				res.end(JSON.stringify(chat));
			}
		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/getChatsForUser", requireLogin, Promise.coroutine(function*(req, res) {
		// get an array of _ids of subdivisions of which the user is a member. (dat proper grammar doe)
		let userSubdivisionIds = util.activeSubdivisionIds(req.user.subdivisions);

		try {

			// find a chat in the current team that also has said user as a member or has a subdivision of which said user is a member.
			let chats = yield Chat.find({
				team: req.user.current_team.id,
				$or: [
					{
						userMembers: req.user._id
					}, {
						subdivisionMembers: {
							"$in": userSubdivisionIds
						}
					}
				]
			}, {
				_id: 1,
				name: 1,
				group: 1,
				userMembers: 1,
				subdivisionMembers: 1,
				updated_at: 1
			}).slice("messages", [0, 1])
				.populate("userMembers subdivisionMembers", "-password")
				.sort("-updated_at")
				.exec();
			// ^ the code above gets the latest message from the chat (for previews in iOS and Android) and orders the list by most recent.

			res.end(JSON.stringify(chats));
		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/loadMessagesForChat", requireLogin, Promise.coroutine(function*(req, res) {
		// TODO: maybe in the future combine this with getUsersInChat to improve performance

		let skip = parseInt(req.body.skip);

		try {

			// loads 20 messages after skip many messages. example: if skip is 0, it loads messages 0-19, if it"s 20, loads 20-39, etc.
			let chat = yield Chat.findOne({_id: req.body.chat_id})
				.slice("messages", [skip, 20])
				.populate("messages.author")
				.exec();

			res.end(JSON.stringify(chat.messages));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/getUsersInChat", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let chat = yield Chat.findOne({
				_id: req.body.chat_id
			}, {
				userMembers: 1,
				subdivisionMembers: 1
			});

			let users = yield User.find({
				$or: [
					{
						_id: { "$in": chat.userMembers }
					}, {
						subdivisions: { $elemMatch: { _id: {"$in": chat.subdivisionMembers} } }
					}
				]
			});

			res.end(JSON.stringify(users));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/getMembersOfChat", requireLogin, Promise.coroutine(function*(req, res) {
		try {

			let chat = yield Chat.findOne({
				_id: req.body.chat_id
			}, {
				userMembers: 1,
				subdivisionMembers: 1,
				group: 1
			});

			let userMembers = yield User.find({_id: { "$in": chat.userMembers }}, "-password");
			let subdivisionMembers = yield Subdivision.find({_id: { "$in": chat.subdivisionMembers }});

			res.end(JSON.stringify({
				members: {
					userMembers: userMembers,
					subdivisionMembers: subdivisionMembers
				},
				group: chat.group
			}));

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/changeGroupName", requireLogin, Promise.coroutine(function*(req, res) {

		if (req.body.newName.length >= 20) {
			return res.end("fail");
		}

		try {

			yield Chat.update({_id: req.body.chat_id}, { name: req.body.newName });

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/deleteChat", requireAdmin, Promise.coroutine(function*(req, res) {
		try {

			yield Chat.findOneAndRemove({_id: req.body.chat_id});

			return res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	app.post("/f/sendMessage", requireLogin, Promise.coroutine(function*(req, res) {
		try {
			
			yield Chat.update({_id: req.body.chat_id}, {
				"$push": {
					"messages": {
						"$each": [ {
							author: req.user._id,
				 			content: util.normalizeDisplayedText(req.body.content),
				  			timestamp: new Date()
						} ],
						"$position": 0
					}
				},
				updated_at: new Date()
			});

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

};
