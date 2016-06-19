"use strict";

module.exports = function(imports) {

	let express = imports.modules.express;
	let ObjectId = imports.modules.mongoose.Types.ObjectId;
	let Promise = imports.modules.Promise;
	let util = imports.util;

	let requireLogin = util.requireLogin;
	let requireAdmin = util.requireAdmin;

	let Chat = imports.models.Chat;
	let User = imports.models.User;
	let Subdivision = imports.models.Subdivision;

	let router = express.Router();

	// TODO: separate this into separate requests for group and private chats
	router.post("/chats", requireLogin, Promise.coroutine(function*(req, res) {

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
					team: req.user.current_team.id,
					name: req.body.name,
					userMembers: JSON.parse(userMembers),
					subdivisionMembers: JSON.parse(subdivisionMembers),
					group: true
				});

				res.json(chat);
			}
		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/chats", requireLogin, Promise.coroutine(function*(req, res) {
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
				.populate("userMembers subdivisionMembers")
				.sort("-updated_at")
				.exec();
			// ^ the code above gets the latest message from the chat (for previews in iOS and Android) and orders the list by most recent.

			res.json(chats);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/chats/id/:chatId/messages", requireLogin, Promise.coroutine(function*(req, res) {
		// TODO: maybe in the future combine this with getUsersInChat to improve performance

		try {

			let skip = parseInt(req.query.skip);

			// loads 20 messages after skip many messages. example: if skip is 0, it loads messages 0-19, if it"s 20, loads 20-39, etc.
			let chat = yield Chat.findOne({ _id: req.params.chatId })
				.slice("messages", [skip, 20])
				.populate("messages.author")
				.exec();

			res.json(chat.messages);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/chats/id/:chatId/users", requireLogin, Promise.coroutine(function*(req, res) {
		// user members only, not subdivision members

		try {

			let chat = yield Chat.findOne({
				_id: req.params.chatId
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

			res.json(users);

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.get("/chat/id/:chatId/allMembers", requireLogin, Promise.coroutine(function*(req, res) {
		// both user members and subdivision members

		try {

			let chat = yield Chat.findOne({
				_id: req.params.chatId
			}, {
				userMembers: 1,
				subdivisionMembers: 1,
				group: 1
			});

			let userMembers = yield User.find({ _id: { "$in": chat.userMembers } });
			let subdivisionMembers = yield Subdivision.find({_id: { "$in": chat.subdivisionMembers } });

			res.json({
				members: {
					userMembers: userMembers,
					subdivisionMembers: subdivisionMembers
				},
				group: chat.group
			});

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.put("/chats/group/id/:chatId/name", requireLogin, Promise.coroutine(function*(req, res) {

		if (req.body.newName.length >= 20) {
			return res.end("Name has to be 19 characters or fewer.");
		}

		try {

			yield Chat.update({
				_id: req.body.chat_id
			}, {
				name: util.normalizeDisplayedText(req.body.newName)
			});

			res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.delete("/chats/id/:chatId", requireAdmin, Promise.coroutine(function*(req, res) {
		try {

			yield Chat.findOneAndRemove({ _id: req.params.chatId });

			return res.end("success");

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}));

	router.post("/chats/id/:chatId/messages", requireLogin, Promise.coroutine(function*(req, res) {
		try {
			
			yield Chat.update({ _id: req.params.chatId }, {
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

	return router;

};
