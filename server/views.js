"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let Promise = imports.modules.Promise;
    let fs = require("fs"); // TODO: put this into initImports
    let util = imports.util;
    let handler = util.handler;

    let router = express.Router();

    router.get(handler(function*(req, res) {

            let pages = {
                signup: "Signup",
            };

            let page = Object.keys(pages)
                .find(page => req.path.substring(1).startsWith(page)));
        if (!page) {
            return next();
        }

        res.render("../../morteam-web/src/page.html.ejs", {
            page: pages[page]
        });

    }));

router.get("/js/:page", handler(function*(req, res) {
    let page = req.params.page;
    let file = "../../morteam-web/build/" + page + ".js";
    // TODO: use the pacakge fs-promise
    fs.exists(file, function(exists) {
        if (!exists) {
            return res.end("fail"); // AHHHH
        }
        fs.createReadStream(file).pipe(res);
    });
}));

return router;

};
