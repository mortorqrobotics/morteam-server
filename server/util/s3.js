"use strict";

module.exports = function(imports) {

    // TODO: make this work https://www.npmjs.com/package/s3rver
    // we need to be able to test s3 locally

    let Promise = imports.modules.Promise;
    let AWS = imports.modules.AWS;
    let fs = require("fs");
    let AWSConfigPath = require("path").join(__dirname, "../aws-config.json");

    if (fs.existsSync(AWSConfigPath)) {
        AWS.config.loadFromPath(AWSConfigPath);
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

    s3.uploadToProfPics = function(buffer, destFileName, contentType, callback) {
        s3.profPicBucket.upload({
            ACL: "public-read",
            Body: buffer,
            Key: destFileName.toString(),
            ContentType: contentType,
        }).send(callback);
    };

    s3.uploadToDrive = function(buffer, destFileName, contentType, contentDisposition, callback) {
        s3.driveBucket.upload({
            Body: buffer,
            Key: destFileName.toString(),
            ContentType: contentType,
            ContentDisposition: contentDisposition
        }).send(callback);
    };

    s3.getFileFromDrive = function(fileName, callback) { //not being used
        s3.driveBucket.getObject({
            Key: fileName
        }).send(callback);
    };

    s3.deleteFileFromDrive = function(fileName, callback) {
        s3.driveBucket.deleteObject({
            Key: fileName
        }).send(callback);
    };

    Promise.promisifyAll(s3);

    return s3;

};
