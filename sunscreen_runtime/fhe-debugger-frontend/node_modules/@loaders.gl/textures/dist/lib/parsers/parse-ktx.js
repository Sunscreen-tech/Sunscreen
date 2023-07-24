"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseKTX = exports.isKTX = void 0;
const ktx_parse_1 = require("ktx-parse");
const extract_mipmap_images_1 = require("../utils/extract-mipmap-images");
const ktx_format_helper_1 = require("../utils/ktx-format-helper");
const KTX2_ID = [
    // '´', 'K', 'T', 'X', '2', '0', 'ª', '\r', '\n', '\x1A', '\n'
    0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a
];
// eslint-disable-next-line complexity
function isKTX(data) {
    // const id = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const id = new Uint8Array(data);
    const notKTX = id.byteLength < KTX2_ID.length ||
        id[0] !== KTX2_ID[0] || // '´'
        id[1] !== KTX2_ID[1] || // 'K'
        id[2] !== KTX2_ID[2] || // 'T'
        id[3] !== KTX2_ID[3] || // 'X'
        id[4] !== KTX2_ID[4] || // ' '
        id[5] !== KTX2_ID[5] || // '2'
        id[6] !== KTX2_ID[6] || // '0'
        id[7] !== KTX2_ID[7] || // 'ª'
        id[8] !== KTX2_ID[8] || // '\r'
        id[9] !== KTX2_ID[9] || // '\n'
        id[10] !== KTX2_ID[10] || // '\x1A'
        id[11] !== KTX2_ID[11]; // '\n'
    return !notKTX;
}
exports.isKTX = isKTX;
function parseKTX(arrayBuffer) {
    const uint8Array = new Uint8Array(arrayBuffer);
    const ktx = (0, ktx_parse_1.read)(uint8Array);
    const mipMapLevels = Math.max(1, ktx.levels.length);
    const width = ktx.pixelWidth;
    const height = ktx.pixelHeight;
    const internalFormat = (0, ktx_format_helper_1.mapVkFormatToWebGL)(ktx.vkFormat);
    return (0, extract_mipmap_images_1.extractMipmapImages)(ktx.levels, {
        mipMapLevels,
        width,
        height,
        sizeFunction: (level) => level.uncompressedByteLength,
        internalFormat
    });
}
exports.parseKTX = parseKTX;
