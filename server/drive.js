"use strict";

module.exports = function(imports) {

    let express = imports.modules.express;
    let ObjectId = imports.modules.mongoose.Types.ObjectId;
    let multer = imports.modules.multer;
    let extToMime = require("./extToMime.json");
    let lwip = imports.modules.lwip;
    let Promise = imports.modules.Promise;
    let https = require("https");
    let util = imports.util;

    let handler = util.handler;
    let requireLogin = util.requireLogin;

    let Folder = imports.models.Folder;
    let File = imports.models.File;
    let Group = imports.models.Group;

    let router = express.Router();

    router.get("/files/id/:fileId", requireLogin, handler(function*(req, res) {

        if (req.params.fileId.indexOf("-preview") == -1) {

            let file = yield File.findOne({
                _id: req.params.fileId,
                "folder.group.members": req.user._id
            }).populate("folder");

            if (!file) {
                return res.end("fail");
            }

        }

        let url = yield util.s3.driveBucket.getSignedUrlAsync("getObject", {
            Key: req.params.fileId,
            Expires: 60
        });
        // res.redirect(url); do not use this
        // this caused a security flaw
        // the S3 key was included in the url and sent to the user
        https.get(url, function(response) {
            response.pipe(res);
        });

    }));

    router.get("/folders/team", requireLogin, handler(function*(req, res) {

        let folders = yield Folder.find({
            parentFolder: {
                "$exists": false
            },
            "group.members": req.user._id
        });

        res.json(folders);

    }));

    router.get("/folders/id/:folderId/subfolders", requireLogin, handler(function*(req, res) {

        let folders = yield Folder.find({
            parentFolder: req.params.folderId,
            "group.members": req.user._id
        });

        res.json(folders);

    }));

    router.get("/folders/id/:folderId/files", requireLogin, handler(function*(req, res) {

        let files = yield File.find({
            folder: req.params.folderId,
            "folder.group.members": req.user._id
        });

        res.json(files);

    }));

    router.post("/folders", requireLogin, handler(function*(req, res) {

        if (req.body.name.length >= 22) {
            return res.end("fail");
        }

        // what to do about this
        if (req.body.type != "teamFolder" && req.body.type != "subFolder") {
            return res.end("fail");
        }

        let folder = {
            name: util.normalizeDisplayedText(req.body.name),
            group: req.body.groupId,
            creator: req.user._id,
            defaultFolder: false
        };

        if (req.body.type == "teamFolder") {
            folder.parentFolder = undefined;
            folder.ancestors = [];
        } else if (req.body.type == "subFolder") {
            folder.parentFolder = req.body.parentFolder;
            folder.ancestors = req.body.ancestors.concat([req.body.parentFolder]);
        }

        folder = yield Folder.create(folder);

        res.json(folder);

    }));

    router.post("/files/upload", requireLogin, multer({
        limits: 50 * 1000000 // 50 megabytes
    }).single("uploadedFile"), handler(function*(req, res) {

        let ext = req.file.originalname.substring(req.file.originalname.lastIndexOf(".") + 1).toLowerCase() || "unknown";

        let mime = extToMime[ext];
        let disposition;

        if (mime == undefined) {
            disposition = "attachment; filename=" + req.file.originalname;
            mime = "application/octet-stream";
        } else {
            disposition = "attachment; filename=" + req.body.fileName + "." + ext;
        }

        req.body.fileName = util.normalizeDisplayedText(req.body.fileName);

        // TODO: check if the user has access to the folder

        let file = yield File.create({
            name: req.body.fileName,
            originalName: req.file.originalname,
            folder: req.body.currentFolderId,
            size: req.file.size,
            type: util.s3.extToType(ext),
            mimetype: mime,
            creator: req.user._id
        });

        yield util.s3.uploadToDriveAsync(req.file.buffer, file._id, mime, disposition);

        if (file.type == "image") {

            // TODO: move this to util.images

            let image = yield lwip.openAsync(req.file.buffer, ext);

            Promise.promisifyAll(image);

            let hToWRatio = image.height() / image.width();
            if (hToWRatio >= 1) {
                image = yield image.resizeAsync(280, 280 * hToWRatio);
            } else {
                image = yield image.resizeAsync(280 / hToWRatio, 280);
            }

            Promise.promisifyAll(image);
            let buffer = yield image.toBufferAsync(ext);

            util.s3.uploadToDriveAsync(buffer, file._id + "-preview", mime, disposition);
        }

        res.json(file);

    }));

    router.delete("/files/id/:fileId", requireLogin, handler(function*(req, res) {

        let file = yield File.findOne({
            _id: req.params.fileId
        }).populate("folder");

        // TODO: check permissions

        if (req.user._id.toString() != file.creator.toString() &&
            !util.isUserAdmin(req.user)) {
            return res.end("fail");
        }

        yield util.s3.deleteFileFromDriveAsync(req.params.fileId);

        yield file.remove();

        // TODO: this should not be passed by the client, it should be found by the server
        if (req.query.isImg == "true") {
            yield util.s3.deleteFileFromDriveAsync(req.params.fileId + "-preview");
        }

        res.end("success");

    }));

    return router;

};
