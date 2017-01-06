"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Promise = imports.modules.Promise;
	let request = imports.modules.request;
    let util = imports.util;

    let handler = util.handler;
    let requireLogin = util.requireLogin;
    let requireAdmin = util.requireAdmin;
    let checkBody = util.middlechecker.checkBody;
    let types = util.middlechecker.types;

    let User = imports.models.User;
    let Team = imports.models.Team;
    let Announcement = imports.models.Announcement;
    let Chat = imports.models.Chat;
    let Event = imports.models.Event;
    let Folder = imports.models.Folder;
    let AllTeamGroup = imports.models.AllTeamGroup;
    let PositionGroup = imports.models.PositionGroup;

    let router = express.Router();

    router.get("/teams/current/users", checkBody(), requireLogin, handler(function*(req, res) {

        let users = yield User.find({
            team: req.user.team,
        });

        res.json(users);

    }));

    router.post("/teams", checkBody({
        number: types.any,
        id: types.string,
        name: types.string,
    }), requireLogin, handler(function*(req, res) {

        if (req.user.team) {
            return res.status(400).end("You already have a team");
        }

        let number = parseInt(req.body.number);
        if (isNaN(number) || number <= 0 || number >= 100000) {
            return res.status(400).end("Invalid team number");
        }

        if (yield Team.findOne({
                id: req.body.id
            })) {
            return res.status(400).end("Team code is taken");
        }

        let team = yield Team.createTeam({
            id: req.body.id,
            name: req.body.name,
            number: req.body.number,
        });

        // TODO: ask user about leader vs mentor when creating team?
        yield User.addToTeam(req.user._id, team._id, "leader", true);

        let group = yield AllTeamGroup.findOne({
            team: team._id
        })

        yield Folder.create({
            name: "Team Files",
            audience: { groups: [group._id] },
            defaultFolder: true,
        });

        res.json(team);

    }));

    router.post("/teams/code/:teamCode/join", checkBody(), requireLogin, handler(function*(req, res) {

        if (req.user.team) {
            return res.status(400).end("You already have a team");
        }

        let team = yield Team.findOne({
            id: req.params.teamCode
        });

        if (!team) {
            return res.status(404).end("Team does not exist");
        }

        if (req.user.bannedFromTeams.indexOf(team._id) != -1) {
            return res.status(400).end("You are banned from this team");
        }

        yield User.addToTeam(req.user._id, team._id, "member", false);

        // TODO: should personal folders still be created automatically?
        //        yield Folder.create({
        //            name: "Personal Files",
        //            team: team._id,
        //            userMembers: req.user._id, // should this be [req.user._id] instead?
        //            creator: req.user._id,
        //            defaultFolder: true
        //        });

        res.json(team);

    }));

    router.get("/teams/current/number", checkBody(), requireLogin, handler(function*(req, res) {

        let team = yield Team.findOne({
            _id: req.user.team
        });

        res.end(String(team.number));

    }));

    router.get("/teams/number/:teamNum/exists", checkBody(), requireLogin, handler(function*(req, res) {

        if (yield Team.find({
                number: parseInt(req.params.teamNum)
            })) {
            res.json(teams[0]); // TODO: should this just be "true" instead?
            // the team is used by the client, instead of being "true" the route should be renamed, getIfExists or something
        } else {
            res.end("false");
        }

    }));

    router.delete("/teams/current/users/id/:userId", checkBody(), handler(function*(req, res) {
        // remove a user from a team

        let user = yield User.findOne({
            _id: req.params.userId,
            team: req.user.team,
        });

        if (!user) {
            return res.status(400).end("That user is not on your team");
        }

        if (util.positions.isUserAdmin(user) && (yield User.count({
                team: req.user.team,
                position: util.positions.adminPositionsQuery,
            })) <= 1) {
            return res.status(400).end("You cannot remove the only Admin on your team");
        }

        if (!util.positions.isUserAdmin(req.user)
            && (user._id.toString() !== req.user._id.toString())
        ) {
            return res.status(403).end("You cannot remove other users from your team if you are not an Admin");
        }

        yield User.removeFromTeam(user);

        yield Promise.all([
            Announcement.update({
                "audience.users": user._id,
            }, {
                $pull: {
                    "audience.users": user._id,
                }
            }, {
                multi: true,
            }),
            Event.update({
                "audience.users": user._id,
            }, {
                $pull: {
                    "audience.users": user._id,
                }
            }, {
                multi: true,
            }),
            Chat.update({
                "audience.users": user._id,
                isTwoPeople: false,
            }, {
                $pull: {
                    "audience.users": user._id,
                }
            }, {
                multi: true,
            }),
            Folder.update({
                "audience.users": user._id,
                defaultFolder: false,
            }, {
                $pull: {
                    "audience.users": user._id,
                }
            }, {
                multi: true,
            }),
        ]);

        res.end();

    }));
	
	router.get("/teams/number/:number/info", requireLogin, handler(function* (req, res) {
		
		let result = yield request({
			uri: "http://www.thebluealliance.com/api/v2/team/frc" + req.params.number,
			headers: { "X-TBA-App-Id": "frc1515:MorMap:1" },
		});
		try {
			res.json(JSON.parse(result));
		} catch (err) {
			res.status(500).end("failed parsing TBA json");
		}
		
	}));


    // TODO: does this need to exist?
    router.get("/users/id/:userId/teamInfo", checkBody(), requireLogin, handler(function*(req, res) {

        let user = yield User.findOne({
            _id: req.params.userId,
            team: req.user.team
        });

        res.json({
            team: user.team,
            position: user.position,
            scoutCaptain: user.scoutCaptain
        });

    }));
    
    router.post("/teams/id/:teamId/contact", checkBody({
        content: types.string,
    }), requireAdmin, handler(function*(req, res) {
        
        let team = yield Team.findOne({
            _id: req.params.teamId,
        });
        
        if (!team) {
            return res.status(400).end("This team does not exist in the morteam database.");
        }
        
        if (req.user.team.toString() === req.params.teamId) {
             return res.status(403).end("You cannot contact your own team");
        }
        
        let positionGroups = yield PositionGroup.find({
            team: {$in: [req.params.teamId, req.user.team]},
            position: util.positions.adminPositionsQuery,
        });
        
        let chat = yield Chat.create({
            name: "Team " + req.user.team.number + " and " + team.number,
            audience: {users: [], groups: positionGroups, isMultiTeam: true},
            creator: req.user._id,
            isTwoPeople: false,
        });
        
        let users = yield User.find({
            team: req.params.teamId,
            position: util.positions.adminPositionsQuery,
        });
        
        let emails = users.map(user => user.email);
        
        
        let reqTeam = Team.findOne({
            _id: req.user.id,
        });
        
        yield util.mail.sendEmail({
            to: emails,
            subject: "You have been contacted by team " + reqTeam.number + " on morteam.",
            html: req.body.content + " " + "www.morteam.com/chat?id=" + chat._id,
        });
        
        res.end();
            
    }));

    return router;

};
