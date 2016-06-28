"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Promise = imports.modules.Promise;
    let util = imports.util;

    let requireLogin = util.requireLogin;

    let router = express.Router();

    return router;

};
