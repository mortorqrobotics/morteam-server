"use strict";

module.exports = function(imports) {

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
