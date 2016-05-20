"use strict";

// this file is currently unused
// it is for google cloud messaging for android
// android currently does not have the functionality for this
// I am leaving this file here in case it does in the future

module.exports = function(imports) {

	let gcm = require("node-gcm"); // move this to initImports.js if this file is ever resurrected
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
