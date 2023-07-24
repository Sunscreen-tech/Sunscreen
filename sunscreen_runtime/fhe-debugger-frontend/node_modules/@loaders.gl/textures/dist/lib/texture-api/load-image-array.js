"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImageArrayUrls = exports.loadImageTextureArray = void 0;
// loaders.gl, MIT license
const images_1 = require("@loaders.gl/images");
const load_image_1 = require("./load-image");
const deep_load_1 = require("./deep-load");
async function loadImageTextureArray(count, getUrl, options = {}) {
    const imageUrls = await getImageArrayUrls(count, getUrl, options);
    return await (0, deep_load_1.deepLoad)(imageUrls, images_1.ImageLoader.parse, options);
}
exports.loadImageTextureArray = loadImageTextureArray;
async function getImageArrayUrls(count, getUrl, options = {}) {
    const promises = [];
    for (let index = 0; index < count; index++) {
        const promise = (0, load_image_1.getImageUrls)(getUrl, options, { index });
        promises.push(promise);
    }
    return await Promise.all(promises);
}
exports.getImageArrayUrls = getImageArrayUrls;
