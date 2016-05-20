module.exports = function(imports) {

	imports.modules.express = require("express");
	imports.modules.multer = require("multer");
	imports.modules.lwip = require("lwip");
	imports.modules.Promise = require("bluebird");
	imports.modules.autolinker = require("autolinker");
	imports.modules.nodemailer = require("nodemailer");
	imports.modules.AWS = require("aws-sdk");

	imports.models.Announcement = require("./models/Announcement.js")(imports);
	imports.models.Chat = require("./models/Chat.js")(imports);
	imports.models.Event = require("./models/Event.js")(imports);
	imports.models.AttendanceHandler = require("./models/AttendanceHandler.js")(imports);
	imports.models.Folder = require("./models/Folder.js")(imports);
	imports.models.File = require("./models/File.js")(imports);
	imports.models.Task = require("./models/Task.js")(imports);

	imports.util = require("./util.js");

	return imports;

};
