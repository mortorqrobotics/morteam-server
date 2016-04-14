"use strict";

module.exports = function(app, util, schemas) {

	let gcm = require("node-gcm");
	let config = require("./config.json");

	let message = new gcm.Message();

	message.addData("key1", "msg1");

	let regTokens = ["YOUR_REG_TOKEN_HERE"];

	// Set up the sender with you API key
	let sender = new gcm.Sender(config.GCMAPIKey);

	// Now the sender can be used to send messages
	sender.send(message, { registrationTokens: regTokens }, function (err, response) {
			if (err) {
				console.error(err);
			} else {
				console.log(response);
			}
	});

	// Send to a topic, with no retry this time
	sender.sendNoRetry(message, { topic: "/topics/global" }, function (err, response) {
			if (err) console.error(err);
			else    console.log(response);
	});

};
