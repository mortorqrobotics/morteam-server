"use strict";

/**
 * This file is meant to keep all of the variables and functions that are used among several different modules.
 */
module.exports = function(imports) {

    // import necessary modules
    let fs = require("fs");
    let config = imports.config;
    let Autolinker = imports.modules.autolinker;
    let Team = imports.models.Team;
    let Promise = imports.modules.Promise;

    let util = imports.util;

    let daysInWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    util.handler = function(generator) {
        let func = Promise.coroutine(generator);
        return function(req, res, next) {
            return func
                .apply(null, arguments)
                .catch(function(err) {
                    console.error(err);
                    res.status(500).end("Internal server error");
                    // TODO: add real error handling and logging
                });
        };
    };

    // quick way to send a 404: not found error
    util.send404 = function(res) {
        res.writeHead(404, {
            "Content-Type": "text/plain"
        });
        res.end("404: Page Not Found");
    };

    // parses JSON without crashing when parsing invalid JSON
    util.parseJSON = function(str) { //not being used
        try {
            return JSON.parse(String(str));
        } catch (ex) {}
    };

    // checks if user provided email adress is valid
    util.validateEmail = function(email) {
        let re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
        return re.test(String(email));
    };

    // checks if user provided phone number adress is valid
    util.validatePhone = function(phone) {
        let match = String(phone).match(/\d/g);
        return match && match.length === 10;
    };

    // creates random string of any size
    util.createToken = function(size) {
        let token = "";
        for (let i = 0; i < size; i++) {
            let rand = Math.floor(Math.random() * 62);
            token += String.fromCharCode(rand + ((rand < 26) ? 97 : ((rand < 52) ? 39 : -4)));
        }
        return token;
    };

    // can be used as middleware to check if user is logged in
    util.requireLogin = function(req, res, next) {
        if (!req.user) {
            res.status(403).end("You are not logged in");
        } else {
            next();
        }
    };

    // can be used as middleware to check if user is an admin
    util.requireAdmin = function(req, res, next) {
        util.requireLogin(req, res, function() {
            if (util.positions.isUserAdmin(req.user)) {
                next();
            } else {
                util.mail.notify.sendMail({
                    from: "MorTeam Notification <notify@morteam.com>",
                    to: "rafezyfarbod@gmail.com",
                    subject: "MorTeam Security Alert!",
                    text: "The user " + req.user.firstname + " " + req.user.lastname + " tried to perform administrator tasks. User ID: " + req.user._id
                });
                res.status(403).end("You are not an admin");
            }
        });
    };

    util.userNotFound = function(response) {
        response.writeHead(200, {
            "Content-Type": "text/plain"
        });
        response.end("User not found");
    };

    util.subdivisionNotFound = function(response) {
        response.writeHead(200, {
            "Content-Type": "text/plain"
        });
        response.end("Subdivision not found");
    };

    // checks if user provided phone number adress is valid
    util.validPhoneNum = function(num) { //not being used
        let phone = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        if (num.value.match(phone)) {
            return true;
        } else {
            return false;
        }
    };

    // receives an array of _ids of users with a length of 2 and another user _id
    // returns the other user
    util.getUserOtherThanSelf = function(twoUsers, selfId) {
        if (twoUsers[0] == selfId) {
            return twoUsers[1];
        } else {
            return twoUsers[0];
        }
    };

    // removes duplicates from an array
    util.removeDuplicates = function(arr) {
        let result = [];
        for (let i = 0; i < arr.length; i++) {
            let dup = false;
            for (let j = 0; j < i; j++) {
                if (JSON.stringify(arr[i]) == JSON.stringify(arr[j])) { // TODO: use deep compare instead of stringify
                    // stringify is unreliable because elements are not guaranteed to be in the same order
                    dup = true;
                    break;
                }
            }
            if (!dup) {
                result.push(arr[i]);
            }
        }
        return result;
    };

    util.removeHTML = function(text) {
        let replacements = [
            [/&/g, "&amp;"],
            [/</g, "&lt;"],
            [/>/g, "&gt;"]
        ];
        for (let replacement of replacements) {
            text = text.replace(replacement[0], replacement[1]);
        }
        return text;
        //  text.replace(/\<(?!a|br).*?\>/g, "");
    };

    // removes html and adds hyperlinks to some text
    util.normalizeDisplayedText = function(text) {
        return Autolinker.link(util.removeHTML(text));
    };

    // converts date string into human readable date
    util.readableDate = function(datestr) {
        let date = new Date(datestr);
        return months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
    };

    util.populateTeams = Promise.coroutine(function*(obj) {
        if (obj.audience.isMultiTeam) {
            let teams = yield Promise.all(obj.audience.groups.map(group => Team.findOne({
                _id: group.team
            })));
            for (let i = 0; i < obj.audience.groups.length; i++) {
                obj.audience.groups[i].team = teams[i];
            }
        }
    });

    String.prototype.contains = function(arg) {
        return this.indexOf(arg) > -1;
    };

    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };

    // checks to see if an array has anything in common with another array
    Array.prototype.hasAnythingFrom = function(arr) {

        let obj = {};

        for (let elem of arr) {
            obj[elem] = true;
        }

        for (let elem of this) {
            if (elem in obj) {
                return true;
            }
        }

        return false;
    };

    return util;

};
