"use strict";

module.exports = function(imports) {

    let ObjectId = imports.modules.mongoose.Schema.Types.ObjectId;
    let Promise = imports.modules.Promise;

    let Group = imports.models.Group;
    let User = imports.models.User;

    let hiddenGroups = {};

    hiddenGroups.audienceQuery = function(query) {
        return {
            $or: [{
                "audience.users": query,
            }, {
                "audience.groups.members": query,
            }],
        };
    };

    hiddenGroups.schemaType = {
        users: {
            type: [{
                type: ObjectId,
                ref: "User",
            }],
            required: true,
        },
        groups: {
            type: [{
                type: ObjectId,
                ref: "Group",
            }],
            required: true,
        },
    };

    hiddenGroups.getUsersIn = Promise.coroutine(function*(audience) {
        let groups = yield Promise.all(audience.groups.map(groupId => (
            Group.findOne({
                _id: groupId
            })
        )));
        return yield User.find({
            _id: {
                $or: [{
                    $in: audience.users
                }, {
                    $in: groups.map(group => group.members)
                }]
            }
        });
    });

    return hiddenGroups;

};
