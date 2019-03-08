"use strict";

module.exports = function(imports) {

    let Promise = imports.modules.Promise;
    let nodemailer = imports.modules.nodemailer;
    let config = imports.config;
    let defaultConfig = imports.defaultConfig;

    let mail = {};

    // email transport
    mail.notify = nodemailer.createTransport({
        service: "Mailgun",
        auth: {
            user: config.mailgunUser,
            pass: config.mailgunPass
        }
    });
    Promise.promisifyAll(mail.notify);

    mail.sendEmail = function(options) {
        if (config.mailgunUser === defaultConfig.mailgunUser
            && config.mailgunPass === defaultConfig.mailgunPass
        ) {
            return new Promise(resolve => {
                if (process.env.NODE_ENV !== "test") {
                    console.log(options);
                }
                resolve();
            });
        } else {
            return new Promise(function(resolve, reject) {
                mail.notify.sendMail({
                    from: "MorTeam Notification <notify@morteam.com>",
                    bcc: options.to,
                    subject: options.subject,
                    html: options.html
                }, function(err, info) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(info);
                    }
                });
            });
        }
    }

    // TODO: automatically do this in mail.sendEmail?
    // creates a list of email adresses seperated by ", " provided an array of user objects
    mail.createRecipientList = function(users) {
        let result = "";
        users.forEach(function(user) {
            if (user.position !== "alumnus") {
                result += user.email + ", ";
                if (user.parentEmail) {
                    result += user.parentEmail + ", "
                }
            }
        });
        result = result.substring(0, result.length - 2);
        return result;
    };

    return mail;

};
