"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Promise = imports.modules.Promise;
    let util = imports.util;
    let handler = util.handler;

    let router = express.Router();

    router.get(handler(function*(req, res) {

        let pages = [
            "signup"
        ];

        let page = pages.find(page => req.path.substring(1).startsWith(page)));
        if (!page) {
            return next();
        }

        res.render("../../morteam-web/src/page.html.ejs", {
            page: page
        });

    }));

    router.get("script.js", handler(function*(req, res) {
        let page = req.query.page;
        res.render("../../morteam-web/src/page.js.ejs", {
            page: page
        });
    }));

    return router;

};

