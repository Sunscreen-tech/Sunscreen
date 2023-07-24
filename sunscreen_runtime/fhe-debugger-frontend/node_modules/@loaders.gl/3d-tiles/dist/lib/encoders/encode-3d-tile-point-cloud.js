"use strict";
// This file is derived from the Cesium code base under Apache 2 license
// See LICENSE.md and https://github.com/AnalyticalGraphicsInc/cesium/blob/master/LICENSE.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodePointCloud3DTile = void 0;
const constants_1 = require("../constants");
const encode_3d_tile_header_1 = require("./helpers/encode-3d-tile-header");
const loader_utils_1 = require("@loaders.gl/loader-utils");
const DEFAULT_FEATURE_TABLE_JSON = {
    POINTS_LENGTH: 1,
    POSITIONS: {
        byteOffset: 0
    }
};
function encodePointCloud3DTile(tile, dataView, byteOffset, options) {
    const { featureTableJson = DEFAULT_FEATURE_TABLE_JSON } = tile;
    let featureTableJsonString = JSON.stringify(featureTableJson);
    featureTableJsonString = (0, loader_utils_1.padStringToByteAlignment)(featureTableJsonString, 4);
    const { featureTableJsonByteLength = featureTableJsonString.length } = tile;
    const featureTableBinary = new ArrayBuffer(12); // Enough space to hold 3 floats
    const featureTableBinaryByteLength = featureTableBinary.byteLength;
    // Add default magic for this tile type
    tile = { magic: constants_1.MAGIC_ARRAY.POINT_CLOUD, ...tile };
    const byteOffsetStart = byteOffset;
    byteOffset += (0, encode_3d_tile_header_1.encode3DTileHeader)(tile, dataView, 0);
    if (dataView) {
        dataView.setUint32(byteOffset + 0, featureTableJsonByteLength, true); // featureTableJsonByteLength
        dataView.setUint32(byteOffset + 4, featureTableBinaryByteLength, true); // featureTableBinaryByteLength
        dataView.setUint32(byteOffset + 8, 0, true); // batchTableJsonByteLength
        dataView.setUint32(byteOffset + 12, 0, true); // batchTableBinaryByteLength
    }
    byteOffset += 16;
    byteOffset += (0, loader_utils_1.copyStringToDataView)(dataView, byteOffset, featureTableJsonString, featureTableJsonByteLength);
    byteOffset += (0, loader_utils_1.copyBinaryToDataView)(dataView, byteOffset, featureTableBinary, featureTableBinaryByteLength);
    // Go "back" and rewrite the tile's `byteLength` now that we know the value
    (0, encode_3d_tile_header_1.encode3DTileByteLength)(dataView, byteOffsetStart, byteOffset - byteOffsetStart);
    return byteOffset;
}
exports.encodePointCloud3DTile = encodePointCloud3DTile;
