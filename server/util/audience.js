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
        users: [{
            type: ObjectId,
            ref: "User",
        }],
        groups: [{
            type: ObjectId,
            ref: "Group",
        }],
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

    audience.getUsersIn = Promise.coroutine(function*(audience) {
        return yield User.find(audience.inAudienceQuery(audience));
    });

    audience.isUserInAudience = function(user, audience) {
        return audience.users.indexOf(user._id) !== -1
            || audience.groups.some(groupId =>
                user.groups.indexOf(groupId) !== -1
            );
    }

    return audience;

};
