"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMipLevels = exports.getImageUrls = exports.loadImage = void 0;
const loader_utils_1 = require("@loaders.gl/loader-utils");
const parse_image_1 = __importDefault(require("../parsers/parse-image"));
const parsed_image_api_1 = require("../category-api/parsed-image-api");
const generate_url_1 = require("./generate-url");
const deep_load_1 = require("./deep-load");
async function loadImage(getUrl, options = {}) {
    const imageUrls = await getImageUrls(getUrl, options);
    return await (0, deep_load_1.deepLoad)(imageUrls, parse_image_1.default, options);
}
exports.loadImage = loadImage;
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
        const image = await (0, deep_load_1.shallowLoad)(url, parse_image_1.default, options);
        const { width, height } = (0, parsed_image_api_1.getImageSize)(image);
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
function getMipLevels({ width, height }) {
    return 1 + Math.floor(Math.log2(Math.max(width, height)));
}
exports.getMipLevels = getMipLevels;
