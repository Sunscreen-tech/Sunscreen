"use strict";
// This file is derived from the Cesium code base under Apache 2 license
// See LICENSE.md and https://github.com/AnalyticalGraphicsInc/cesium/blob/master/LICENSE.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeInstancedModel3DTile = void 0;
const loader_utils_1 = require("@loaders.gl/loader-utils");
const constants_1 = require("../constants");
const encode_3d_tile_header_1 = require("./helpers/encode-3d-tile-header");
// Procedurally encode the tile array buffer for testing purposes
// eslint-disable-next-line max-statements
function encodeInstancedModel3DTile(tile, dataView, byteOffset, options) {
    const { featuresLength = 1, gltfFormat = 1, gltfUri = '' } = tile;
    const gltfUriByteLength = gltfUri.length;
    const featureTableJson = {
        INSTANCES_LENGTH: featuresLength,
        POSITION: new Array(featuresLength * 3).fill(0)
    };
    const featureTableJsonString = JSON.stringify(featureTableJson);
    const featureTableJsonByteLength = featureTableJsonString.length;
    // Add default magic for this tile type
    tile = { magic: constants_1.MAGIC_ARRAY.INSTANCED_MODEL, ...tile };
    const byteOffsetStart = byteOffset;
    byteOffset = (0, encode_3d_tile_header_1.encode3DTileHeader)(tile, dataView, 0);
    if (dataView) {
        dataView.setUint32(12, featureTableJsonByteLength, true); // featureTableJsonByteLength
        dataView.setUint32(16, 0, true); // featureTableBinaryByteLength
        dataView.setUint32(20, 0, true); // batchTableJsonByteLength
        dataView.setUint32(24, 0, true); // batchTableBinaryByteLength
        dataView.setUint32(28, gltfFormat, true); // gltfFormat
    }
    byteOffset += 20;
    byteOffset += (0, loader_utils_1.copyStringToDataView)(dataView, byteOffset, featureTableJsonString, featureTableJsonByteLength);
    byteOffset += (0, loader_utils_1.copyStringToDataView)(dataView, byteOffset, gltfUri, gltfUriByteLength);
    // Go "back" and rewrite the tile's `byteLength` now that we know the value
    (0, encode_3d_tile_header_1.encode3DTileByteLength)(dataView, byteOffsetStart, byteOffset - byteOffsetStart);
    return byteOffset;
}
exports.encodeInstancedModel3DTile = encodeInstancedModel3DTile;
