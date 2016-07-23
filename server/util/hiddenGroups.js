"use strict";

module.exports = function(imports) {

    let hiddenGroups = {};

    hiddenGroups.includesQuery = function(query) {
        return {
            users: query,
            "groups.members": {
                $elemMatch: query,
            },
        };
    };

    return hiddenGroups;

};
