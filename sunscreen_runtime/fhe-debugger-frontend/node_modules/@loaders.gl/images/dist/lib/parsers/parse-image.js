"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const loader_utils_1 = require("@loaders.gl/loader-utils");
const image_type_1 = require("../category-api/image-type");
const parsed_image_api_1 = require("../category-api/parsed-image-api");
const parse_to_image_1 = __importDefault(require("./parse-to-image"));
const parse_to_image_bitmap_1 = __importDefault(require("./parse-to-image-bitmap"));
const parse_to_node_image_1 = __importDefault(require("./parse-to-node-image"));
// Parse to platform defined image type (data on node, ImageBitmap or HTMLImage on browser)
// eslint-disable-next-line complexity
async function parseImage(arrayBuffer, options, context) {
    options = options || {};
    const imageOptions = options.image || {};
    // The user can request a specific output format via `options.image.type`
    const imageType = imageOptions.type || 'auto';
    const { url } = context || {};
    // Note: For options.image.type === `data`, we may still need to load as `image` or `imagebitmap`
    const loadType = getLoadableImageType(imageType);
    let image;
    switch (loadType) {
        case 'imagebitmap':
            image = await (0, parse_to_image_bitmap_1.default)(arrayBuffer, options, url);
            break;
        case 'image':
            image = await (0, parse_to_image_1.default)(arrayBuffer, options, url);
            break;
        case 'data':
            // Node.js loads imagedata directly
            image = await (0, parse_to_node_image_1.default)(arrayBuffer, options);
            break;
        default:
            (0, loader_utils_1.assert)(false);
    }
    // Browser: if options.image.type === 'data', we can now extract data from the loaded image
    if (imageType === 'data') {
        image = (0, parsed_image_api_1.getImageData)(image);
    }
    return image;
}
exports.default = parseImage;
// Get a loadable image type from image type
function getLoadableImageType(type) {
    switch (type) {
        case 'auto':
        case 'data':
            // Browser: For image data we need still need to load using an image format
            // Node: the default image type is `data`.
            return (0, image_type_1.getDefaultImageType)();
        default:
            // Throw an error if not supported
            (0, image_type_1.isImageTypeSupported)(type);
            return type;
    }
}
