"use strict";

module.exports = function(app, util, schemas) {

	let ObjectId = require("mongoose").Types.ObjectId;

	let requireLogin = util.requireLogin;
	let requireLeader = util.requireLeader;
	let requireAdmin = util.requireAdmin;

	let Subdivision = schemas.Subdivision;

	//assign variables to util functions(and objects) and database schemas
	for (key in util) {
		eval("var " + key + " = util." + key + ";");
	}
	for (key in schemas) {
		eval("var " + key + " = schemas." + key + ";");
	}

	app.get("/s/:id", function(req, res) {
		let joined = false;
		Subdivision.findOne({
			_id: req.params.id,
			team: req.user.current_team.id
		}, function(err, subdivision) {
			if (err) {
				util.send404(res);
			} else {
				if (subdivision) {
					User.find({
						subdivisions: {
							$elemMatch: {
								_id: subdivision._id, //TODO: maybe add toString
								accepted: true
							}
						}
					}, function(err, users) {
						if (err) {
							util.send404(res);
						} else {
							if (subdivision.type == "private") {
								for (let i = 0; i < users.length; i++) {
									if (users[i]._id.toString() == req.user._id) {
										res.render("subdivision", {
											name: subdivision.name,
											type: subdivision.type,
											team: subdivision.team, //TODO: POSSIBLY CHANGE TO subdivision.team._id
											admin: req.user.current_team.position=="admin",
											joined: true,
											members: users,
											current_user_id: req.user._id
										});
										break;
									}
								}
								res.end("nothing to see here.");
							} else if (subdivision.type == "public") {
								for (let i = 0; i < users.length; i++) {
									if (users[i]._id.toString() == req.user._id.toString()) {
										joined = true
										break;
									}
								}

								res.render("subdivision", {
									name: subdivision.name,
									type: subdivision.type,
									team: subdivision.team, //TODO: POSSIBLY CHANGE TO subdivision.team._id
									admin: req.user.current_team.position=="admin",
									joined: joined,
									members: users,
									current_user_id: req.user._id
								});
							}
						}
					})
				} else {
					util.subdivisionNotFound(res);
				}
			}
		})
	});
	app.post("/f/createSubdivision", requireLogin, requireLeader, function(req, res) {
		if (req.body.name.length < 22) {
			Subdivision.create({
				name: req.body.name,
				type: req.body.type,
				team: req.user.current_team.id
			}, function(err, subdivision) {
				if (err) {
					console.error(err);
					res.end("fail");
				} else {
					User.update({_id: req.user._id}, { "$push": {
						"subdivisions": {_id: subdivision._id, team: req.user.current_team.id, accepted: true}
					}}, function(err, model) {
						if (err) {
							console.error(err);
							res.end("fail");
						} else {
							res.end(subdivision._id.toString());
						}
					})
				}
			});
		} else {
			res.end("fail");
		}
	});
	app.post("/f/inviteToSubdivision", requireLogin, function(req, res) {
		Subdivision.findOne({
			_id: req.body.subdivision_id
		}, function(err, subdivision) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				if (subdivision) {
					User.findOne({
						_id: req.body.user_id
					}, function(err, user) {
						if (err) {
							console.error(err);
							res.end("fail");
						} else {
							if (user) {
								if ( !user.subdivisions.hasObjectThatContains("_id", req.body.subdivision_id) ) {
									user.subdivisions.push({
										_id: new ObjectId(req.body.subdivision_id),
										team: req.user.current_team.id, //P
										accepted: false
									});
									user.save(function(err) {
										if (err) {
											console.error(err);
											res.end("fail");
										} else {
											res.end("success");
										}
									})
								} else {
									res.end("already invited");
								}
							} else {
								res.end("fail");
							}
						}
					});
				} else {
					res.end("fail");
				}
			}
		});
	});
	app.post("/f/getPublicSubdivisions", requireLogin, function(req, res) {
		Subdivision.find({team: req.user.current_team.id, type: "public"}, function(err, subdivisions) {
			if (err) {
				console.error(err);
				res.end("fail")
			} else {
				if (subdivisions) {
					res.end(JSON.stringify(subdivisions));
				} else {
					res.end("[]");
				}
			}
		})
	});
	app.post("/f/getAllSubdivisionsForUserInTeam", requireLogin, function(req, res) {
		let userSubdivisionIds = []
		for (let i = 0; i < req.user.subdivisions.length; i++) {
			if (req.user.subdivisions[i].accepted == true && req.user.subdivisions[i].team == req.user.current_team.id) {
				userSubdivisionIds.push(req.user.subdivisions[i]._id);
			}
		}
		Subdivision.find({_id: { "$in": userSubdivisionIds }, team: req.user.current_team.id }, function(err, subdivisions) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				if (subdivisions) {
					res.end( JSON.stringify(subdivisions.map(function(subdivision) {return {name: subdivision.name, _id: subdivision._id} })) );
				} else {
					res.end("fail");
				}
			}
		})
	});

	app.post("/f/loadSubdivisionInvitations", requireLogin, function(req, res) {
		let invitedSubdivisions = [];
		if (req.user.subdivisions.length > 0) {
			for (let i = 0; i < req.user.subdivisions.length; i++) {
				if (req.user.subdivisions[i].accepted == false && req.user.subdivisions[i].team == req.user.current_team.id) {
					invitedSubdivisions.push(req.user.subdivisions[i]._id);
				}
			}
			Subdivision.find({_id: { "$in": invitedSubdivisions }, team: req.user.current_team.id}, function(err, subdivisions) {
				if (err) {
					console.error(err);
					res.end("fail");
				} else {
					if (subdivisions) {
						res.end(JSON.stringify(subdivisions));
					} else {
						res.end("fail");
					}
				}
			})
		} else {
			res.end("[]");
		}
	})
	app.post("/f/acceptSubdivisionInvitation", requireLogin, function(req, res) {
		User.update({_id: req.user._id, "subdivisions._id": new ObjectId(req.body.subdivision_id)}, {"$set": {
			"subdivisions.$.accepted": true
		}}, function(err) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				Event.find({ subdivisionAttendees: req.body.subdivision_id }, function(err, events) {
					if (err) {
						console.error(err);
						res.end("fail");
					} else {
						let done = 0;
						if (events.length > 0) {
							for (let i = 0; i < events.length; i++) {
								AttendanceHandler.update({event: events[i]._id, event_date: {"$gt": new Date()}}, { "$push": {
									attendees: {
										user: req.user._id,
										status: "absent"
									}
								}}, function(err, model) {
									if (err) {
										console.error(err);
										res.end("fail");
									} else {
										done++;
										if (done == events.length) {
											res.end("success");
										}
									}
								})
							}
						} else {
							res.end("success");
						}
					}
				});
			}
		});
	});
	app.post("/f/joinPublicSubdivision", requireLogin, function(req, res) {
		Subdivision.findOne({_id: req.body.subdivision_id}, function(err, subdivision) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				if (subdivision.type == "public") {
					User.update({_id: req.user._id}, {"$pull": {
						"subdivisions": {_id: new ObjectId(req.body.subdivision_id), team: req.user.current_team.id, accepted: false}
					}}, function(err) {
						if (err) {
							console.error(err);
							res.end("fail");
						} else {
							User.update({_id: req.user._id}, {"$push": {
								"subdivisions": {_id: new ObjectId(req.body.subdivision_id), team: req.user.current_team.id, accepted: true}
							}}, function(err) {
								if (err) {
									console.error(err);
									res.end("fail");
								} else {
									Event.find({ subdivisionAttendees: req.body.subdivision_id }, function(err, events) {
										if (err) {
											console.error(err);
											res.end("fail");
										} else {
											if (events.length > 0) {
												let done = 0;
												for (let i = 0; i < events.length; i++) {
													AttendanceHandler.update({event: events[i]._id, event_date: {"$gt": new Date()}}, { "$push": {
														attendees: {
															user: req.user._id,
															status: "absent"
														}
													}}, function(err, model) {
														if (err) {
															console.error(err);
															res.end("fail");
														} else {
															done++;
															if (done == events.length) {
																res.end("success");
															}
														}
													})
												}
											} else {
												res.end("success");
											}
										}
									});
								}
							});
						}
					});
				} else {
					res.end("fail");
				}
			}
		})
	})
	app.post("/f/ignoreSubdivisionInvite", requireLogin, function(req, res) {
		User.update({_id: req.user._id}, {"$pull": {
			"subdivisions": {_id: new ObjectId(req.body.subdivision_id), team: req.user.current_team.id}
		}}, function(err, model) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				res.end("success");
			}
		});
	})
	app.post("/f/leaveSubdivision", requireLogin, function(req, res) {
		User.update({_id: req.user._id}, {"$pull": {
			"subdivisions": {_id: new ObjectId(req.body.subdivision_id), team: req.user.current_team.id}
		}}, function(err, model) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				Event.find({ subdivisionAttendees: req.body.subdivision_id }, function(err, events) {
					if (err) {
						console.error(err);
						res.end("fail");
					} else {
						if (events.length > 0) {
							let done = 0;
							for (let i = 0; i < events.length; i++) {
								AttendanceHandler.update({event: events[i]._id}, { "$pull": {
									"attendees": {
										user: req.user._id,
									}
								}}, function(err, model) {
									if (err) {
										console.error(err);
										res.end("fail");
									} else {
										done++;
										if (done == events.length) {
											res.end("success");
										}
									}
								})
							}
						} else {
							res.end("success");
						}
					}
				});
			}
		});
	})
	app.post("/f/deleteSubdivision", requireLogin, requireAdmin, function(req, res) {
		User.findOne({_id: req.user._id}, function(err, user) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				if (user) {
					Subdivision.findOneAndRemove({_id: new ObjectId(req.body.subdivision_id), team: req.user.current_team.id}, function(err) {
						if (err) {
							console.error(err);
							res.end("fail");
						} else {
							// User.update( {team: req.body.team_id, subdivisions: {$elemMatch: {id: req.body.subdivision_id, team: req.body.team_id}} }, {"$pull": {
							//   "subdivisions": {id: req.body.subdivision_id, team: req.body.team_id, accepted: true}
							// }}, function(err, model) {
							//   if (err) {
							//     console.error(err);
							//     res.end("fail");
							//   } else {
							//     console.log(model);
							//     res.end("success");
							//   }
							// });
							User.update({teams:{$elemMatch:{id: req.user.current_team.id}}}, {"$pull": { //TODO: FIX THIS, it wont remove subdivision from user
								"subdivisions": {_id: new ObjectId(req.body.subdivision_id), team: req.user.current_team.id}
							}}, function(err, model) {
								if (err) {
									console.error(err);
									res.end("fail");
								} else {
									console.log(model);
									res.end("success");
								}
							});

						}
					});
				}
			}
		})
	})
	app.post("/f/removeUserFromSubdivision", requireLogin, requireAdmin, function(req, res) {
		User.update({_id: req.body.user_id, teams: { $elemMatch: { "id": req.user.current_team.id } } }, { "$pull": { //TODO: maybe add new objectid
			"subdivisions" : {_id: new ObjectId(req.body.subdivision_id), team: req.user.current_team.id, accepted: true}
		}}, function(err, model) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				Event.find({ subdivisionAttendees: req.body.subdivision_id }, function(err, events) {
					if (err) {
						console.error(err);
						res.end("fail");
					} else {
						if (events.length > 0) {
							let done = 0;
							for (let i = 0; i < events.length; i++) {
								AttendanceHandler.update({event: events[i]._id}, { "$pull": {
									"attendees": {
										user: req.body.user_id,
									}
								}}, function(err, model) {
									if (err) {
										console.error(err);
										res.end("fail");
									} else {
										done++;
										if (done == events.length) {
											res.end("success");
										}
									}
								})
							}
						} else {
							res.end("success");
						}
					}
				});
			}
		});
	});
	app.post("/f/getUsersInSubdivision", requireLogin, function(req, res) {
		User.find({
			subdivisions: { $elemMatch: { _id: req.body.subdivision_id, accepted: true } }
		}, "-password", function(err, users) {
			if (err) {
				console.error(err);
				res.end("fail");
			} else {
				res.end( JSON.stringify(users) );
			}
		})
	});

};
