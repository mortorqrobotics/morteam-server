"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let lwip = imports.modules.lwip; // image processing module
    let multer = imports.modules.multer; // for file uploads
    let ObjectId = imports.modules.mongoose.Types.ObjectId;
    let Promise = imports.modules.Promise;
    let util = imports.util;
    let extToMime = require("./extToMime.json"); // used to convert file extensions to MIME types

    let handler = util.handler;
    let requireLogin = util.requireLogin;
    let requireAdmin = util.requireAdmin;
    let checkBody = util.middlechecker.checkBody;
    let types = util.middlechecker.types;

    let User = imports.models.User;
    let Folder = imports.models.Folder;

    let router = express.Router();

    router.post("/login", checkBody({
        rememberMe: types.union([types.boolean, types.string]),
        username: types.string,
        password: types.string,
        mobileDeviceToken: types.maybe(types.string),
    }), handler(function*(req, res) {
        // TODO: maybe move login and logout to separate file?

        // IMPORTANT: req.body.username can either be a username or an email

        // thanks Ben
        req.body.rememberMe = (req.body.rememberMe == true);

        let user = yield User.findOne({
            $or: [{
                username: req.body.username
            }, {
                email: req.body.username
            }]
        }).select("+password").populate("team");

        if (!user || !(yield user.comparePassword(req.body.password))) {
            return res.status(400).end("Invalid login credentials");
        }

        if (req.body.mobileDeviceToken
            && user.mobileDeviceTokens.indexOf(req.body.mobileDeviceToken) === -1
        ) {
            user.mobileDeviceTokens.push(req.body.mobileDeviceToken);
            yield user.save();
        }

        delete user.password;

        // store user info in cookies
        req.session.userId = user._id;
        if (req.body.rememberMe) {
            req.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000; // change cookie expiration date to one year
        }

        res.json(user);

    }));

    router.post("/logout", checkBody({
        mobileDeviceToken: types.maybe(types.string),
    }), requireLogin, handler(function*(req, res) {
        // destroy user session cookie
        req.session.destroy(function(err) {
            if (err) {
                console.error(err);
                res.status(500).end("Logout unsuccessful");
            } else if (req.body.mobileDeviceToken) {
                let index = req.user.mobileDeviceTokens.indexOf(req.body.mobileDeviceToken);
                if (index !== -1) {
                    req.user.mobileDeviceTokens.splice(index, 1);
                    req.user.save().then(() => {
                        res.end();
                    });
                } else {
                    res.end();
                }
            } else {
                res.end();
            }
        });
    }));

    // uses multer middleware to parse uploaded file called "profpic" with a max file size
    router.post("/users", multer({
        limits: {
            fileSize: 10 * 1024 * 1024
        }
    }).single("profpic"), checkBody({
        username: types.string,
        password: types.string,
        firstname: types.string,
        lastname: types.string,
        phone: types.string,
        email: types.string,
    }), handler(function*(req, res) {

        // capitalize names
        req.body.firstname = req.body.firstname.capitalize();
        req.body.lastname = req.body.lastname.capitalize();

        // remove parentheses and dashes from phone number
        req.body.phone = req.body.phone.replace(/[- )(]/g, "")

        // if phone and email are valid (see util.js for validation methods)
        if (!util.validateEmail(req.body.email)) {
            return res.status(400).end("Invalid email");
        }
        if (!util.validatePhone(req.body.phone)) {
            return res.status(400).end("Invalid phone number");
        }

        // check if a user with either same username, email, or phone already exists
        let same = yield User.findOne({
            $or: [{
                username: req.body.username
            }, {
                email: req.body.email
            }, {
                phone: req.body.phone
            }]
        });
        // this code is eh
        if (same) {
            if (same.username == req.body.username) {
                return res.status(400).end("Username is taken");
            }
            if (same.email == req.body.email) {
                return res.status(400).end("Email is taken");
            }
            if (same.phone == req.body.phone) {
                return res.status(400).end("Phone number is taken");
            }
        }

        let userInfo = {
            username: req.body.username,
            password: req.body.password,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            phone: req.body.phone
        };

        // if user uploaded a profile pic
        if (req.file) {

            userInfo.profpicpath = "/pp/" + req.body.username;

            let ext = req.file.originalname.substring(req.file.originalname.lastIndexOf(".") + 1).toLowerCase() || "unknown";
            let mime = extToMime[ext]
            if (mime == undefined) {
                mime = "application/octet-stream";
            }

            // resize image to 60px and upload to AWS S3
            let buffer = yield util.images.resizeImageAsync(req.file.buffer, 60, ext);
            yield util.s3.uploadToProfPicsAsync(buffer, req.body.username + "-60", mime);

            // resize image to 300px and upload to AWS S3
            buffer = yield util.images.resizeImageAsync(req.file.buffer, 300, ext);
            yield util.s3.uploadToProfPicsAsync(buffer, req.body.username + "-300", mime);

        } else {
            userInfo.profpicpath = "/images/user.jpg"; // default profile picture
        }

        let user;
        try {
            user = yield User.create(userInfo);
        } catch (err) {
            return res.status(400).end("Invalid user info");
        }

        yield Folder.create({
            name: "Personal Files",
            audience: { users: [user._id] },
            defaultFolder: true,
        });
        yield user.assignEmailVerif();
        let emailVerif = yield util.mail.sendEmail({
            to: req.body.email,
            subject: "MorTeam Email Verification",
             html: "Welcome to MorTeam. Please verify your email by going to https://morteam.com/users/" + User.email_token + "/verify/",
        });
        console.log(emailVerif);
        res.end();

    }));

    router.get("/users/id/:userId", checkBody(), requireLogin, handler(function*(req, res) {

        let user = yield User.findOne({
            _id: req.params.userId
        });

        res.json(user);

    }));

    router.put("/users/id/:userId/position", checkBody({
        newPosition: types.string,
    }), requireAdmin, handler(function*(req, res) {

        // find target user
        let user = yield User.findOne({
            _id: req.params.userId,
            team: req.user.team
        });

        if (!user) {
            return res.status(404).end("User not found");
        }

        let newPosition = req.body.newPosition.toLowerCase();
        if (["member", "leader", "mentor", "alumnus"].indexOf(newPosition) == -1) {
            return res.status(400).end("Invalid position");
        }

        let currentPosition = user.position;

        if (req.params.userId == req.user._id &&
            !util.positions.isPositionAdmin(newPosition) &&
            (yield User.count({
                team: req.user.team,
                position: util.positions.adminPositionsQuery
            })) <= 1) {

            return res.status(400).end(
                "You are the only leader or mentor on your team, so you cannot demote yourself"
            );
        }

        yield User.setPosition(user, newPosition);

        res.end();

    }));

    router.get("/users/search", checkBody({
        search: types.string,
    }), requireLogin, handler(function*(req, res) {

        let regexString = String(req.query.search).trim().replace(/\s/g, "|");
        let re = new RegExp(regexString, "ig");

        // find maximum of 10 users that match the search criteria
        let users = yield User.find({
            team: req.user.team,
            $or: [{
                firstname: re
            }, {
                lastname: re
            }]
        }).limit(10);

        res.json(users);

    }));

    router.put("/password", checkBody({
        oldPassword: types.string,
        newPassword: types.string,
    }), requireLogin, handler(function*(req, res) {

        let user = yield User.findOne({
            _id: req.user._id
        }, "+password");

        // check if old password is correct
        if (!(yield user.comparePassword(req.body.oldPassword))) {
            return res.status(403).end("Your old password is incorrect");
        }

        // set and save new password (password is automatically encrypted. see /models/User.js)
        user.password = req.body.newPassword;
        yield user.save();
        // TODO: there should be a method on user to create a new encrypted password instead of doing it like this

        res.end("success");

    }));

    router.put("/profile", multer().single("new_prof_pic"), checkBody({
        firstname: types.string,
        lastname: types.string,
        email: types.string,
        phone: types.string,
        parentEmail: types.string,
    }), requireLogin, handler(function*(req, res) {

        if (!util.validateEmail(req.body.email)) {
            return res.status(400).end("Invalid email address");
        }
        if (!util.validatePhone(req.body.phone)) {
            return res.status(400).end("Invalid phone number");
        }

        req.user.firstname = req.body.firstname;
        req.user.lastname = req.body.lastname;
        req.user.email = req.body.email;
        req.user.phone = req.body.phone;

        if (req.body.parentEmail != "") {
            req.user.parentEmail = req.body.parentEmail;
        }

        if (req.file) { // if user chose to update their profile picture too

            req.user.profpicpath = "/pp/" + req.user.username

            // get extension and corresponding mime type
            let ext = req.file.originalname.substring(req.file.originalname.lastIndexOf(".") + 1).toLowerCase() || "unknown";
            let mime = extToMime[ext]
            if (mime == undefined) {
                mime = "application/octet-stream"
            }

            // NOTE: for explanations of the functions used here, see util.js

            let buffer = yield util.images.resizeImageAsync(req.file.buffer, 300, ext);
            yield util.s3.uploadToProfPicsAsync(buffer, req.user.username + "-300", mime);
            buffer = yield util.images.resizeImageAsync(req.file.buffer, 60, ext);
            yield util.s3.uploadToProfPicsAsync(buffer, req.user.username + "-60", mime);
        }

        // update user info in database
        yield req.user.save();

        res.json(req.user);

    }));

    // get information about the currently logged in user
    router.get("/users/self", checkBody(), requireLogin, handler(function*(req, res) {
        res.json(req.user);
    }));

    router.post("/forgotPassword", checkBody({
        emailOrUsername: types.string,
    }), handler(function*(req, res) {

        let user = yield User.findOne({
            $or: [{
                email: req.body.emailOrUsername,
            }, {
                username: req.body.emailOrUsername,
            }],
        });

        if (!user) {
            return res.status(400).end("User not found");
        }

        let newPassword = yield user.assignNewPassword();
        yield user.save();

        // TODO: we are emailing passwords in plaintext
        // they are temporary passwords but still
        // see http://security.stackexchange.com/questions/32589/temporary-passwords-e-mailed-out-as-plain-text
        // should be an access token instead of the actual password

        // email user new password
        let info = yield util.mail.sendEmail({
            to: user.email,
            subject: "New MorTeam Password Request",
            html: "It seems like you requested to reset your password. Your new password is " + newPassword + ". Feel free to reset it after you log in.",
        });
        console.log(info);

        res.end();

    }));
    

    router.put("/users/:email_token/verify", checkBody(), handler(function*(req, res) {
        let user = yield User.findOneAndUpdate(
            {"email_token" : req.params.email_token},
            {$set: { "email_confirmed" : true }
        ); 
        res.end();
    };
    return router;

};
