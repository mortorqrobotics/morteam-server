"use strict";

module.exports = function(imports) {

    let Promise = imports.modules.Promise;
    let fs = require("fs");
    let File = imports.models.File;
    let awsConfigPath = require("path").join(__dirname, "../aws-config.json");
    let testingBucketPath = require("path").join(__dirname, "../../buckets");

    // TODO: use NODE_ENV everywhere instead of this
    let isProduction = fs.existsSync(awsConfigPath);

    let AWS;

    if (isProduction) {
        AWS = imports.modules.AWS;
        AWS.config.loadFromPath(awsConfigPath);
    } else {
        AWS = imports.modules.AWSMock;
        AWS.config.basePath = testingBucketPath;
    }

    let s3 = {};

    // define AWS S3 buckets used
    s3.profPicBucket = new AWS.S3({
        params: {
            Bucket: "profilepics.morteam.com"
        }
    });
    s3.driveBucket = new AWS.S3({
        params: {
            Bucket: "drive.morteam.com"
        }
    });
    Promise.promisifyAll(s3.profPicBucket);
    Promise.promisifyAll(s3.driveBucket);

    // determins "type" of file based on extension (is used for color coding files on the client)
    s3.extToType = function(ext) {
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

    // TODO: use the promisified version of the bucket objects

    s3.uploadToProfPics = function(buffer, destFileName, contentType, callback) {
        s3.profPicBucket.upload({
            ACL: "public-read",
            Body: buffer,
            Key: destFileName.toString(),
            ContentType: contentType,
        }, callback);
    };

    s3.uploadToDrive = function(buffer, destFileName, contentType, contentDisposition, callback) {
        s3.driveBucket.upload({
            Body: buffer,
            Key: destFileName.toString(),
            ContentType: contentType,
            ContentDisposition: contentDisposition
        }, callback);
    };

    s3.getFileFromDrive = function(fileName, callback) { //not being used
        s3.driveBucket.getObject({
            Key: fileName
        }, callback);
    };

    s3.deleteFileFromDrive = function(fileName, callback) {
        s3.driveBucket.deleteObject({
            Key: fileName
        }, callback);
    };

    // TODO: this kind of logic should not be in this file
    s3.sendFile = Promise.coroutine(function*(res, fileKey) {
        // the key of each file in drive is its _id
        // image previews are stored in drive as _id-preview
        // a file key is something that can be _id or _id-preview
        // file id is when it is just an _id
        if (isProduction) {
            let url = yield s3.driveBucket.getSignedUrlAsync("getObject", {
                Key: fileKey,
                Expires: 60,
            });
            res.redirect(url);
        } else {
            let suffix = "-preview";
            let fileId = fileKey;
            if (fileId.endsWith(suffix)) {
                fileId = fileId.slice(0, -(suffix.length));
            }
            let file = yield File.findOne({
                _id: fileId,
            });
            res.setHeader("Content-type", file.mimetype);
            fs.createReadStream(require("path").join(
                testingBucketPath,
                "drive.morteam.com",
                fileKey
            )).pipe(res);
        }
    });

    Promise.promisifyAll(s3);

    return s3;

};
