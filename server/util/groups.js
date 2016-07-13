"use strict";

module.exports = function(imports) {

    let groups = {};

    groups.includesQuery = function(query) {
        return {
            users: query,
            "groups.members": {
                $elemMatch: query,
            },
        };
    };

    return groups;

};
