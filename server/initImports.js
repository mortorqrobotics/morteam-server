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
            "dbName": "morteam"
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
    imports.modules.AWS = require("aws-sdk");

    // User, Team, and Subdivision come from mornetwork
    imports.models.Announcement = require("./models/Announcement.js")(imports);
    imports.models.Chat = require("./models/Chat.js")(imports);
    imports.models.Event = require("./models/Event.js")(imports);
    imports.models.AttendanceHandler = require("./models/AttendanceHandler.js")(imports);
    imports.models.Folder = require("./models/Folder.js")(imports);
    imports.models.File = require("./models/File.js")(imports);
    imports.models.Task = require("./models/Task.js")(imports);

    imports.util = require("./util.js")(imports);

    // TODO: add config here

    return imports;

};
