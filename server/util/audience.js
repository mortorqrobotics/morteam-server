"use strict";

module.exports = function(imports) {

    let util = imports.util;
    let ObjectId = imports.modules.mongoose.Schema.Types.ObjectId;
    let Promise = imports.modules.Promise;

    let Group = imports.models.Group;
    let User = imports.models.User;
    let AllTeamGroup = imports.models.AllTeamGroup;
    let PositionGroup = imports.models.PositionGroup;

    let audience = {};

    audience.audienceQuery = function(query) {
        return {
            $or: [{
                "audience.users": query._id,
            }, {
                "audience.groups": {
                    $in: query.groups,
                },
            }],
        };
    };

    audience.schemaType = {
        type: new imports.modules.mongoose.Schema({
            users: [{
                type: ObjectId,
                ref: "User",
            }],
            groups: [{
                type: ObjectId,
                ref: "Group",
            }],
            isMultiTeam: {
                type: Boolean,
                default: false,
            },
        }),
        validate: {
            validator: (value) => !value.isMultiTeam || value.users.length === 0,
            message: "Users must be empty in a multiteam audience",
        },
    };

    audience.inAudienceQuery = function(audience) {
        return {
            $or: [
                {
                    _id: {
                        $in: audience.users,
                    },
                }, {
                    groups: {
                        $elemMatch: {
                            $in: audience.groups,
                        },
                    },
                },
            ]
        };
    };

    audience.getUsersIn = Promise.coroutine(function*(au) {
        return yield User.find(audience.inAudienceQuery(au));
    });

    audience.isUserInAudience = function(user, audience) {
        return audience.users.indexOf(user._id) !== -1
            || audience.groups.some(groupId =>
                user.groups.indexOf(groupId) !== -1
            );
    };

    audience.ensureIncludes = Promise.coroutine(function*(audience, user) {
        if (!audience.users.some(userId => userId.toString() === user._id.toString())
            && !user.groups.some(groupId =>
                audience.groups.some(gid =>
                    gid.toString() === groupId.toString()))
        ) {
            if (!audience.isMultiTeam) {
                audience.users.push(user._id);
            } else {
                let group = yield AllTeamGroup.findOne({
                    _id: { $in: audience.groups}
                });
                if (group) {
                    group = yield AllTeamGroup.findOne({
                        team: user.team,
                    })
                    audience.groups.push(group._id);
                } else {
                    let positionGroups = yield PositionGroup.find({
                        team: user.team,
                        position: util.positions.adminPositionsQuery,
                    });
                    console.log(positionGroups)
                    positionGroups.forEach(g => audience.groups.push(g._id));
                }
            }
        }
        return audience;
    });

    return audience;

};
