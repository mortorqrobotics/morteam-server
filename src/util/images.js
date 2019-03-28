"use strict";

module.exports = function(imports) {

    let Promise = imports.modules.Promise;
    let sharp = imports.modules.sharp;

    let images = {};

    // ext is the extension without the period up front --> example: NOT ".txt", but rather "txt"
    images.resizeImage = Promise.coroutine(function*(buffer, size) {
        let image = sharp(buffer);
        image.metadata()
            .then(metadata => {
                let hToWRatio = metadata.height / metadata.width;
                let height = size, width = size;
                if (hToWRatio >= 1) {
                    height *= hToWRatio;
                } else {
                    width /= hToWRatio;
                }
                return image.resize(Math.floor(width), height).toBuffer();
            })
            .catch(err => console.error(err));
        return image;
    });

    return images;

};
