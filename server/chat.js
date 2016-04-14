"use strict";

module.exports = function(app, util, schemas) {

	let ObjectId = require("mongoose").Types.ObjectId;

	//assign variables to util functions(and objects) and database schemas
	for (key in util) {
		eval("var " + key + " = util." + key + ";");
	}
	for (key in schemas) {
		eval("var " + key + " = schemas." + key + ";");
	}

	app.post("/f/createChat", requireLogin, function(req, res) {
		let subdivisionMembers;
		let userMembers;
		if (req.body.subdivisionMembers == undefined) {
			subdivisionMembers = [];
		} else {
			subdivisionMembers = req.body.subdivisionMembers
		}
		if (req.body.userMembers == undefined) {
			userMembers = [];
		} else {
			userMembers = req.body.userMembers;
		}

		if (req.body.type == "private") {
			//private chat

			Chat.findOne({
				group: false,
				team: req.user.current_team.id,
				$or: [ 
					{ userMembers: [req.user._id, req.body.user2] },
					{ userMembers: [req.body.user2, req.user._id] }
				] //check to see if private convo already exists
			}, function(err, chat) {
				if (err) {
					console.error(err);
					res.end("fail");
				} else {
					if (chat) {
						res.end("exists")
					} else {
						Chat.create({
							userMembers: userMembers,
							team: req.user.current_team.id,
							group: false
						}, function(err, chat) {
							if (err) {
								console.error(err);
								res.end("fail");
							} else {
								//get the user that is not the person making this request
								let user2_id = getUserOtherThanSelf(chat.userMembers, req.user._id.toString());
								User.findOne({_id: user2_id}, function(err, user) {
									if (err) {
										console.error(err);
										res.end("fail");
									} else {
										res.end(JSON.stringify({
											_id: user._id,
											fn: user.firstname,
											ln: user.lastname,
											profpicpath: user.profpicpath,
											chat_id: chat._id
										}))
									}
								});
							}
						});
					}
				}
			});
		} else {
			//group chat

			if (req.body.name.length < 20) { //name character limit
				Chat.create({
					team: req.user.current_team.id,
					name: req.body.name,
					userMembers: JSON.parse(userMembers),
					subdivisionMembers: JSON.parse(subdivisionMembers),
					group: true
				}, function(err, chat) {
					if (err) {
						console.error(err);
						res.end("fail");
					} else {
						res.end(JSON.stringify(chat));
					}
				});
			} else {
				res.end("fail");
			}
		}
	});

	app.post("/f/getChatsForUser", requireLogin, function(req, res) {
		//get an array of _ids of subdivisions of which the user is a member. (dat proper grammar doe)
		let userSubdivisionIds = activeSubdivisionIds(req.user.subdivisions);
		//find a chat in the current team that also has said user as a member or has a subdivision of which said user is a member.
		Chat.find({
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
		}).slice("messages", [0, 1]).populate("userMembers subdivisionMembers", "-password").sort("-updated_at").exec(function(err, chats) {
			// ^ the code above gets the latest message from the chat (for previews in iOS and Android) and orders the list by most recent.
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				res.end(JSON.stringify(chats));
			}
		})
	});

	app.post("/f/loadMessagesForChat", requireLogin, function(req, res) { //TODO: maybe in the future combine this with getUsersInChat to improve performance
		let skip = parseInt(req.body.skip)
		//loads 20 messages after skip many messages. example: if skip is 0, it loads messages 0-19, if it"s 20, loads 20-39, etc.
		Chat.findOne( {_id: req.body.chat_id} ).slice("messages", [skip, 20]).populate("messages.author").exec(function(err, chat) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				res.end(JSON.stringify(chat.messages));
			}
		});
	});
	app.post("/f/getUsersInChat", requireLogin, function(req, res) {
		Chat.findOne({_id: req.body.chat_id}, {userMembers: 1, subdivisionMembers: 1}, function(err, chat) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				User.find({
					$or: [
						{
							_id: { "$in": chat.userMembers }
						},
						{
							subdivisions: { $elemMatch: { _id: {"$in": chat.subdivisionMembers} } }
						}
					]
				}, function(err, users) {
					if (err) {
						console.error(err);
						res.end("fail");
					} else {
						res.end(JSON.stringify(users))
					}
				});
			}
		});
	});

	app.post("/f/getMembersOfChat", requireLogin, function(req, res) {
		Chat.findOne({_id: req.body.chat_id}, {userMembers: 1, subdivisionMembers: 1, group: 1}, function(err, chat) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				let members = {
					userMembers: [],
					subdivisionMembers: []
				}
				User.find({_id: { "$in": chat.userMembers }}, "-password", function(err, users) {
					if (err) {
						console.error(err);
						res.end("fail");
					} else {
						// res.end(JSON.stringify(users))
						for (let i = 0; i < users.length; i++) {
							members.userMembers.push(users[i]);
						}
						Subdivision.find({_id: { "$in": chat.subdivisionMembers }}, function(err, subdivisions) {
							if (err) {
								console.error(err);
								res.end("fail");
							} else {
								for (let i = 0; i < subdivisions.length; i++) {
									members.subdivisionMembers.push(subdivisions[i]);
								}
								res.end(JSON.stringify({members: members, group: chat.group}));
							}
						})
					}
				});
			}
		});
	});

	app.post("/f/changeGroupName", requireLogin, function(req, res) {
		if (req.body.newName.length < 20) {
			Chat.update({_id: req.body.chat_id}, { name: req.body.newName }, function(err, model) {
				if (err) {
					console.error(err);
					res.end("fail");
				} else {
					res.end("success");
				}
			})
		} else {
			res.end("fail")
		}
	});

	app.post("/f/deleteChat", requireAdmin, function(req, res) {
		Chat.findOneAndRemove({_id: req.body.chat_id}, function(err) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				res.end("success");
			}
		});
	});

	app.post("/f/sendMessage", requireLogin, function(req, res) {
		Chat.update({_id: req.body.chat_id}, {
			"$push": {
				"messages": {
					"$each": [ {author: req.user._id, content: normalizeDisplayedText(req.body.content), timestamp: new Date()} ],
					"$position": 0
				}
			}, updated_at: new Date()
		}, function(err, model) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				res.end("success");
			}
		});
	});

};
