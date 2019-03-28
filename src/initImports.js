"use strict";

module.exports = function(imports) {
    imports.defaultConfig = {
        "mailgunUser": "user@morteam.com",
        "mailgunPass": "password",
        "dbName": "morteam",
        "fcmApiKey": "",
    };
    // initialize default config file if it does not exist
    let fs = require("fs");
    // config contains password and sensitive information
    let configPath = require("path").join(__dirname, "config.json");
    if (fs.existsSync(configPath)) {
        imports.config = require(configPath);
        for (let key in imports.defaultConfig) {
            if (!(key in imports.config)) {
                imports.config[key] = imports.defaultConfig[key];
            }
        }
    } else {
        imports.config = imports.defaultConfig;
        console.log("Generated default config.json");
    }
    fs.writeFileSync(configPath, JSON.stringify(imports.config, null, "\t"));

    imports.webDir = require("path").join(__dirname, "../../morteam-web");
    imports.publicDir = imports.webDir + "/public";
    imports.profpicDir = "https://s3-us-west-2.amazonaws.com/profilepics.morteam.com/";

    // mongoose comes from mornetwork
    imports.modules.express = require("express");
    imports.modules.multer = require("multer");
    imports.modules.sharp = require("sharp");
    imports.modules.Promise = require("bluebird");
    imports.modules.autolinker = require("autolinker");
    imports.modules.nodemailer = require("nodemailer");
	imports.modules.request = require("request-promise");
    imports.modules.AWS = require("aws-sdk");
    imports.modules.AWSMock = require("mock-aws-s3");
    imports.modules.FCM = require("fcm-node");

    imports.util = {};
    imports.util.audience = require("./util/audience")(imports);

    // User, Team, and Group stuff comes from mornetwork
    imports.models.Announcement = require("./models/Announcement")(imports);
    imports.models.Chat = require("./models/Chat")(imports);
    imports.models.Event = require("./models/Event")(imports);
    imports.models.Folder = require("./models/Folder")(imports);
    imports.models.File = require("./models/File")(imports);
    imports.models.Task = require("./models/Task")(imports);

    imports.util.fcm = require("./util/fcm")(imports);
    imports.util.images = require("./util/images")(imports);
    imports.util.mail = require("./util/mail")(imports);
    imports.util.middlechecker = require("./util/middlechecker")(imports);
    imports.util.positions = require("./util/positions")(imports);
    imports.util.s3 = require("./util/s3")(imports);
    require("./util")(imports); // adds stuff to util

    // TODO: add config here

    module.exports.imports = imports;
    return imports;

};
