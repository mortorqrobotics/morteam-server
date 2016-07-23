"use strict";

module.exports = function(imports) {

    let positions = {};

    // leaders and mentors are considered admins
    // if an alumnus is active enough to need admin rights, that makes them a mentor
    let adminPositions = ["leader", "mentor"];

    positions.isPositionAdmin = function(position) {
        return adminPositions.indexOf(position) != -1;
    };

    positions.isUserAdmin = function(user) {
        return positions.isPositionAdmin(user.position);
    };

    positions.adminPositionsQuery = {
        $or: adminPositions
    };

    return positions;

};
