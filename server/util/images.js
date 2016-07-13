"use strict";

module.exports = function(imports) {

    // TODO: switch to this https://www.npmjs.com/package/lwip-promise

    let Promise = imports.modules.Promise;
    let lwip = imports.modules.lwip;

    let images = {};

    // ext is the extension without the period up front --> example: NOT ".txt", but rather "txt"
    images.resizeImage = function(buffer, size, ext, callback) {
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

    Promise.promisifyAll(images);

    return images;

};
