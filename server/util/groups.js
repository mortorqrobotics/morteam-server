"use strict";

module.exports = function(imports) {

    let Promise = imports.modules.Promise;

    return {

        includesQuery: function(query) {
            return {
                users: query,
                "groups.members": {
                    $elemMatch: query,
                },
            };
        },

    }

};
