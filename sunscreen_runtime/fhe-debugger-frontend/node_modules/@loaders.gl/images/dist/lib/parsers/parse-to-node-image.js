"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loader_utils_1 = require("@loaders.gl/loader-utils");
const binary_image_api_1 = require("../category-api/binary-image-api");
// Use polyfills if installed to parsed image using get-pixels
async function parseToNodeImage(arrayBuffer, options) {
    const { mimeType } = (0, binary_image_api_1.getBinaryImageMetadata)(arrayBuffer) || {};
    // @ts-ignore
    const _parseImageNode = globalThis._parseImageNode;
    (0, loader_utils_1.assert)(_parseImageNode); // '@loaders.gl/polyfills not installed'
    // @ts-expect-error TODO should we throw error in this case?
    return await _parseImageNode(arrayBuffer, mimeType);
}
exports.default = parseToNodeImage;
