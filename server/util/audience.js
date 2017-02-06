"use strict";

module.exports = function(imports) {

    let ObjectId = imports.modules.mongoose.Schema.Types.ObjectId;
    let Promise = imports.modules.Promise;

    let Group = imports.models.Group;
    let User = imports.models.User;

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

    audience.getUsersIn = Promise.coroutine(function*(au, noCache) {
        if (noCache || !au.cachedUserList) {
            au.cachedUserList = yield User.find(audience.inAudienceQuery(au));
        }
        return au.cachedUserList;
    });

    audience.isUserInAudience = function(user, audience) {
        return audience.users.indexOf(user._id) !== -1
            || audience.groups.some(groupId =>
                user.groups.indexOf(groupId) !== -1
            );
    };

    audience.ensureIncludes = function(audience, user) {
        if (!audience.users.some(userId => userId.toString() === user._id.toString())
            && !user.groups.some(groupId =>
                audience.groups.some(gid =>
                    gid.toString() === groupId.toString()))
        ) {
            audience.users.push(user._id);
        }
        return audience;
    };

    return audience;

};
