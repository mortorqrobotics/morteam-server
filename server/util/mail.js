"use strict";

module.exports = function(imports) {

    let Promise = imports.modules.Promise;
    let nodemailer = imports.modules.nodemailer;
    let config = imports.config;

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
        return new Promise(function(resolve, reject) {
            mail.notify.sendMail({
                from: "MorTeam Notification <notify@morteam.com>",
                to: options.to,
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
    };

    // TODO: automatically do this in mail.sendEmail?
    // creates a list of email adresses seperated by ", " provided an array of user objects
    mail.createRecipientList = function(users) {
        let result = "";
        users.forEach(function(user) {
            result += user.email + ", ";
            if (user.parentEmail) {
                result += user.parentEmail + ", "
            }
        });
        result = result.substring(0, result.length - 2);
        return result;
    };

    return mail;

};
