"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMipLevels = exports.getImageUrls = exports.loadImageTexture = void 0;
const loader_utils_1 = require("@loaders.gl/loader-utils");
const images_1 = require("@loaders.gl/images");
const generate_url_1 = require("./generate-url");
const deep_load_1 = require("./deep-load");
async function loadImageTexture(getUrl, options = {}) {
    const imageUrls = await getImageUrls(getUrl, options);
    return await (0, deep_load_1.deepLoad)(imageUrls, images_1.ImageLoader.parse, options);
}
exports.loadImageTexture = loadImageTexture;
async function getImageUrls(getUrl, options, urlOptions = {}) {
    const mipLevels = (options && options.image && options.image.mipLevels) || 0;
    return mipLevels !== 0
        ? await getMipmappedImageUrls(getUrl, mipLevels, options, urlOptions)
        : (0, generate_url_1.generateUrl)(getUrl, options, urlOptions);
}
exports.getImageUrls = getImageUrls;
async function getMipmappedImageUrls(getUrl, mipLevels, options, urlOptions) {
    const urls = [];
    // If no mip levels supplied, we need to load the level 0 image and calculate based on size
    if (mipLevels === 'auto') {
        const url = (0, generate_url_1.generateUrl)(getUrl, options, { ...urlOptions, lod: 0 });
        const image = await (0, deep_load_1.shallowLoad)(url, images_1.ImageLoader.parse, options);
        const { width, height } = (0, images_1.getImageSize)(image);
        mipLevels = getMipLevels({ width, height });
        // TODO - push image and make `deepLoad` pass through non-url values, avoid loading twice?
        urls.push(url);
    }
    // We now know how many mipLevels we need, remaining image urls can now be constructed
    (0, loader_utils_1.assert)(mipLevels > 0);
    for (let mipLevel = urls.length; mipLevel < mipLevels; ++mipLevel) {
        const url = (0, generate_url_1.generateUrl)(getUrl, options, { ...urlOptions, lod: mipLevel });
        urls.push(url);
    }
    return urls;
}
// Calculates number of mipmaps based on texture size (log2)
function getMipLevels(size) {
    return 1 + Math.floor(Math.log2(Math.max(size.width, size.height)));
}
exports.getMipLevels = getMipLevels;
