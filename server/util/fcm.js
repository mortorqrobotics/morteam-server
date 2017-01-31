"use strict";

module.exports = function(imports) {

    let Promise = imports.modules.Promise;
    let FCM = imports.modules.FCM;

    let fcmApiKey = imports.config.fcmApiKey;
    let isProduction = fcmApiKey !== imports.defaultConfig.fcmApiKey;
    let fcm = isProduction ? new FCM(fcmApiKey) : null;

    return {
        sendMessage: (users, message) => new Promise((resolve, reject) => {
            if (isProduction) {
                message.registration_ids = users.reduce((arr, user) =>
                    ([].push.apply(arr, user.mobileDeviceTokens), arr), []);
                fcm.send(message, (err, msgId) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(msgId);
                    }
                });
            } else {
                console.log(message);
                resolve();
            }
        }),
    }

};
