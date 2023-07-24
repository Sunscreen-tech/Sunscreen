"use strict";
// This file is derived from the Cesium code base under Apache 2 license
// See LICENSE.md and https://github.com/AnalyticalGraphicsInc/cesium/blob/master/LICENSE.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeBatchedModel3DTile = void 0;
const loader_utils_1 = require("@loaders.gl/loader-utils");
const constants_1 = require("../constants");
const encode_3d_tile_header_1 = require("./helpers/encode-3d-tile-header");
// Procedurally encode the tile array dataView for testing purposes
function encodeBatchedModel3DTile(tile, dataView, byteOffset, options) {
    const { featuresLength = 0, batchTable } = tile;
    const featureTableJson = {
        BATCH_LENGTH: featuresLength
    };
    const featureTableJsonString = JSON.stringify(featureTableJson);
    const batchTableJsonString = batchTable ? JSON.stringify(batchTable) : '';
    const featureTableJsonByteLength = (0, loader_utils_1.padToNBytes)(featureTableJsonString.length, 8);
    const batchTableJsonByteLength = batchTableJsonString
        ? (0, loader_utils_1.padToNBytes)(batchTableJsonString.length, 8)
        : 0;
    // Add default magic for this tile type
    tile = { magic: constants_1.MAGIC_ARRAY.BATCHED_MODEL, ...tile };
    const byteOffsetStart = byteOffset;
    byteOffset = (0, encode_3d_tile_header_1.encode3DTileHeader)(tile, dataView, byteOffset);
    if (dataView) {
        dataView.setUint32(12, featureTableJsonByteLength, true); // featureTableJsonByteLength
        dataView.setUint32(16, 0, true); // featureTableBinaryByteLength
        dataView.setUint32(20, batchTableJsonByteLength, true); // batchTableJsonByteLength
        dataView.setUint32(24, 0, true); // batchTableBinaryByteLength
    }
    byteOffset += 16;
    // TODO feature table binary
    byteOffset = (0, loader_utils_1.copyPaddedStringToDataView)(dataView, byteOffset, featureTableJsonString, 8);
    if (batchTable) {
        byteOffset = (0, loader_utils_1.copyPaddedStringToDataView)(dataView, byteOffset, batchTableJsonString, 8);
    }
    // Add encoded GLTF to the end of data
    const gltfEncoded = tile.gltfEncoded;
    if (gltfEncoded) {
        byteOffset = (0, loader_utils_1.copyBinaryToDataView)(dataView, byteOffset, gltfEncoded, gltfEncoded.byteLength);
    }
    // Go "back" and rewrite the tile's `byteLength` now that we know the value
    (0, encode_3d_tile_header_1.encode3DTileByteLength)(dataView, byteOffsetStart, byteOffset - byteOffsetStart);
    return byteOffset;
}
exports.encodeBatchedModel3DTile = encodeBatchedModel3DTile;
