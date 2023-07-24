"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encode3DTileByteLength = exports.encode3DTileHeader = void 0;
// HELPER ENCODERS
const loader_utils_1 = require("@loaders.gl/loader-utils");
function encode3DTileHeader(tile, dataView, byteOffset) {
    const HEADER_SIZE = 12;
    if (!dataView) {
        return byteOffset + HEADER_SIZE;
    }
    const { magic, version = 1, byteLength = 12 } = tile;
    (0, loader_utils_1.assert)(Array.isArray(magic) && Number.isFinite(version) && Number.isFinite(byteLength));
    dataView.setUint8(byteOffset + 0, magic[0]);
    dataView.setUint8(byteOffset + 1, magic[1]);
    dataView.setUint8(byteOffset + 2, magic[2]);
    dataView.setUint8(byteOffset + 3, magic[3]);
    dataView.setUint32(byteOffset + 4, version, true); // version
    dataView.setUint32(byteOffset + 8, byteLength, true); // byteLength
    byteOffset += HEADER_SIZE;
    return byteOffset;
}
exports.encode3DTileHeader = encode3DTileHeader;
// Bytelength is sometimes only known at the end of writing a tile
function encode3DTileByteLength(dataView, byteOffsetTileStart, byteLength) {
    if (!dataView) {
        return;
    }
    dataView.setUint32(byteOffsetTileStart + 8, byteLength, true); // byteLength
}
exports.encode3DTileByteLength = encode3DTileByteLength;
