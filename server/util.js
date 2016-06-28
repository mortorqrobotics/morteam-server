"use strict";

/**
 * This file is meant to keep all of the variables and functions that are used among several different modules.
 */
module.exports = function(imports) {

    // import necessary modules
    let fs = require("fs");
    let config = imports.config;
    let Autolinker = imports.modules.autolinker;
    let nodemailer = imports.modules.nodemailer;
    let lwip = imports.modules.lwip;
    let AWS = imports.modules.AWS;
    let AWSConfigPath = require("path").join(__dirname, "aws-config.json");
    AWS.config.loadFromPath(AWSConfigPath); // comment this line for testing without S3
    let Promise = imports.modules.Promise;

    // TODO: split this file up

    return new(function() {

        let self = this; // now "self" can be used to refer to this class inside the scope of the functions

        let daysInWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        this.activeSubdivisionIds = function(subdivisions) {
            return subdivisions
                .filter(subdivision => subdivision.accepted)
                .map(subdivision => subdivision._id);
        };

        // email transport
        this.notify = nodemailer.createTransport({
            service: "Mailgun",
            auth: {
                user: config.mailgunUser,
                pass: config.mailgunPass
            }
        });
        Promise.promisifyAll(this.notify);

        this.sendEmail = function(options) {
            return new Promise(function(resolve, reject) {
                self.notify.sendMail({
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

        // define AWS S3 buckets used
        this.profPicBucket = new AWS.S3({
            params: {
                Bucket: "profilepics.morteam.com"
            }
        });
        this.driveBucket = new AWS.S3({
            params: {
                Bucket: "drive.morteam.com"
            }
        });
        Promise.promisifyAll(this.profPicBucket);
        Promise.promisifyAll(this.driveBucket);

        // quick way to send a 404: not found error
        this.send404 = function(res) {
            res.writeHead(404, {
                "Content-Type": "text/plain"
            });
            res.end("404: Page Not Found");
        };

        // parses JSON without crashing when parsing invalid JSON
        this.parseJSON = function(str) { //not being used
            try {
                return JSON.parse(String(str));
            } catch (ex) {}
        };

        // checks if user provided email adress is valid
        this.validateEmail = function(email) {
            let re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
            return re.test(email);
        };

        // checks if user provided phone number adress is valid
        this.validatePhone = function(phone) {
            return phone.match(/\d/g).length === 10;
        };

        // creates random string of any size
        this.createToken = function(size) {
            let token = "";
            for (let i = 0; i < size; i++) {
                let rand = Math.floor(Math.random() * 62);
                token += String.fromCharCode(rand + ((rand < 26) ? 97 : ((rand < 52) ? 39 : -4)));
            }
            return token;
        };

        // can be used as middleware to check if user is logged in
        this.requireLogin = function(req, res, next) {
            if (!req.user) {
                res.end("fail");
            } else {
                next();
            }
        };

        // can be used as middleware to check if user is an admin
        this.requireAdmin = function(req, res, next) {
            if (self.isUserAdmin(req.user)) {
                next();
            } else {
                self.notify.sendMail({
                    from: "MorTeam Notification <notify@morteam.com>",
                    to: "rafezyfarbod@gmail.com",
                    subject: "MorTeam Security Alert!",
                    text: "The user " + req.user.firstname + " " + req.user.lastname + " tried to perform administrator tasks. User ID: " + req.user._id
                });
                res.end("fail");
            }
        };

        // leaders and mentors are considered admins
        // if an alumnus is active enough to need admin rights, that makes them a mentor
        let adminPositions = ["leader", "mentor"];
        this.isPositionAdmin = function(position) {
            return adminPositions.indexOf(position) != -1;
        };
        this.isUserAdmin = function(user) {
            return self.isPositionAdmin(user.position);
        };
        this.adminPositionsQuery = {
            $or: adminPositions
        };


        this.userNotFound = function(response) {
            response.writeHead(200, {
                "Content-Type": "text/plain"
            });
            response.end("User not found");
        };

        this.subdivisionNotFound = function(response) {
            response.writeHead(200, {
                "Content-Type": "text/plain"
            });
            response.end("Subdivision not found");
        };

        // makes handling errors very easy
        // TODO: replace this with something similar and actually use it everywhere
        this.handleError = function(err, res) {
            if (err) {
                console.error(err);
                fs.appendFile("errors.txt", err.toString());
                fs.appendFile("errors.txt", "##################");
                res.end("fail");
            }
        };

        // checks if user provided phone number adress is valid
        this.validPhoneNum = function(num) { //not being used
            let phone = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
            if (num.value.match(phone)) {
                return true;
            } else {
                return false;
            }
        };

        // returns the team object with an id of teamId of a user
        this.findTeamInUser = function(user, teamId) {
            for (let i = 0; i < user.teams.length; i++) {
                if (user.teams[i]._id.toString() == teamId.toString()) {
                    return user.teams[i];
                }
            }
        };

        // returns an array of _ids provided an array of objects that contain a _id variable
        this.getIdsFromObjects = function(objects) { //not being used
            result = [];
            for (let i = 0; i < objects.length; i++) {
                result.push(objects[i]._id);
            }
            return result;
        };

        // receives an array of _ids of users with a length of 2 and another user _id
        // returns the other user
        this.getUserOtherThanSelf = function(twoUsers, selfId) {
            if (twoUsers[0] == selfId) {
                return twoUsers[1];
            } else {
                return twoUsers[0];
            }
        };

        // removes duplicates from an array
        this.removeDuplicates = function(arr) {
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

        this.removeHTML = function(text) {
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
        this.normalizeDisplayedText = function(text) {
            return Autolinker.link(self.removeHTML(text));
        };

        // converts date string into human readable date
        this.readableDate = function(datestr) {
            let date = new Date(datestr);
            return months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
        };

        // creates a list of email adresses seperated by ", " provided an array of user objects
        this.createRecipientList = function(users) {
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

        // determins "type" of file based on extension (is used for color coding files on the client)
        this.extToType = function(ext) {
            let spreadsheet = ["xls", "xlsx", "numbers", "_xls", "xlsb", "xlsm", "xltx", "xlt"];
            let word = ["doc", "rtf", "pages", "txt", "docx"];
            let image = ["png", "jpg", "jpeg", "jif", "jfif", "gif", "raw", "tiff", "bmp", "rif", "tif", "webp"];
            let keynote = ["key", "ppt", "pptx"];
            let audio = ["mp4", "webm", "mp3", "wav", "m4a", "avi", "wma", "ogg", "m4p", "ra", "ram", "rm", "mid", "flv", "mkv", "ogv", "mov", "mpg"];
            if (~spreadsheet.indexOf(ext)) {
                return "spreadsheet";
            } else if (~word.indexOf(ext)) {
                return "word";
            } else if (~image.indexOf(ext)) {
                return "image";
            } else if (~keynote.indexOf(ext)) {
                return "keynote";
            } else if (~audio.indexOf(ext)) {
                return "audio";
            } else if (ext == "pdf") {
                return "pdf";
            } else {
                return "unknown";
            }
        };

        this.uploadToProfPics = function(buffer, destFileName, contentType, callback) {
            self.profPicBucket.upload({
                ACL: "public-read",
                Body: buffer,
                Key: destFileName.toString(),
                ContentType: contentType,
            }).send(callback);
        };

        this.uploadToDrive = function(buffer, destFileName, contentType, contentDisposition, callback) {
            self.driveBucket.upload({
                Body: buffer,
                Key: destFileName.toString(),
                ContentType: contentType,
                ContentDisposition: contentDisposition
            }).send(callback);
        };

        this.getFileFromDrive = function(fileName, callback) { //not being used
            self.driveBucket.getObject({
                Key: fileName
            }).send(callback)
        };

        this.deleteFileFromDrive = function(fileName, callback) {
            self.driveBucket.deleteObject({
                Key: fileName
            }).send(callback)
        };

        // ext is the extension without the period up front --> example: NOT ".txt", but rather "txt"
        this.resizeImage = function(buffer, size, ext, callback) {
            lwip.open(buffer, ext, function(err, image) {
                if (err) {
                    callback(err, undefined);
                } else {
                    let hToWRatio = image.height() / image.width();
                    if (hToWRatio >= 1) {
                        image.resize(size, size * hToWRatio, function(err, image) {
                            if (err) {
                                callback(err, undefined);
                            } else {
                                image.toBuffer(ext, function(err, buffer) {
                                    if (err) {
                                        callback(err, undefined);
                                    } else {
                                        callback(undefined, buffer);
                                    }
                                });
                            }
                        });
                    } else {
                        image.resize(size / hToWRatio, size, function(err, image) {
                            if (err) {
                                callback(err, undefined);
                            } else {
                                image.toBuffer(ext, function(err, buffer) {
                                    if (err) {
                                        callback(err, undefined);
                                    } else {
                                        callback(undefined, buffer);
                                    }
                                });
                            }
                        });
                    }
                }
            });
        };

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

        // checks to see if an array of objects has an object with a specific key value pair
        Array.prototype.hasObjectThatContains = function(key, value) {
            for (let i = 0; i < this.length; i++) {
                if (this[i][key] == value) {
                    return true;
                }
            }
            return false;
        };

    })();

};
