"use strict";

module.exports = function(imports) {

    // initialize default config file if it does not exist
    let fs = require("fs");
    // config contains password and sensitive information
    let configPath = require("path").join(__dirname, "config.json");
    if (fs.existsSync(configPath)) {
        imports.config = require(configPath);
    } else {
        imports.config = {
            "mailgunUser": "user@morteam.com",
            "malgunPass": "password",
            "dbName": "morteam",
        };
        fs.writeFileSync(configPath, JSON.stringify(imports.config, null, "\t"));
        console.log("Generated default config.json");
    }

    // mongoose comes from mornetwork
    imports.modules.express = require("express");
    imports.modules.multer = require("multer");
    imports.modules.lwip = require("lwip");
    imports.modules.Promise = require("bluebird");
    imports.modules.autolinker = require("autolinker");
    imports.modules.nodemailer = require("nodemailer");
	imports.modules.request = require("request-promise");
    imports.modules.AWS = require("aws-sdk");
    imports.modules.AWSMock = require("mock-aws-s3");

    imports.util = {};
    imports.util.hiddenGroups = require("./util/hiddenGroups")(imports);

    // User, Team, and Group stuff comes from mornetwork
    imports.models.Announcement = require("./models/Announcement")(imports);
    imports.models.Chat = require("./models/Chat")(imports);
    imports.models.Event = require("./models/Event")(imports);
    imports.models.Folder = require("./models/Folder")(imports);
    imports.models.File = require("./models/File")(imports);
    imports.models.Task = require("./models/Task")(imports);

    imports.util.images = require("./util/images")(imports);
    imports.util.mail = require("./util/mail")(imports);
    imports.util.middlechecker = require("./util/middlechecker")(imports);
    imports.util.positions = require("./util/positions")(imports);
    imports.util.s3 = require("./util/s3")(imports);
    require("./util")(imports); // adds stuff to util

    // TODO: add config here

    return imports;

};
