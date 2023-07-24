"use strict";
// This file is derived from the Cesium code base under Apache 2 license
// See LICENSE.md and https://github.com/AnalyticalGraphicsInc/cesium/blob/master/LICENSE.md
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const loader_utils_1 = require("@loaders.gl/loader-utils");
const encode_3d_tile_composite_1 = require("./encode-3d-tile-composite");
const encode_3d_tile_batched_model_1 = require("./encode-3d-tile-batched-model");
const encode_3d_tile_instanced_model_1 = require("./encode-3d-tile-instanced-model");
const encode_3d_tile_point_cloud_1 = require("./encode-3d-tile-point-cloud");
function encode3DTile(tile, options) {
    const byteLength = encode3DTileToDataView(tile, null, 0, options);
    const arrayBuffer = new ArrayBuffer(byteLength);
    const dataView = new DataView(arrayBuffer);
    encode3DTileToDataView(tile, dataView, 0, options);
    return arrayBuffer;
}
exports.default = encode3DTile;
function encode3DTileToDataView(tile, dataView, byteOffset, options) {
    (0, loader_utils_1.assert)(typeof tile.type === 'string');
    switch (tile.type) {
        case constants_1.TILE3D_TYPE.COMPOSITE:
            return (0, encode_3d_tile_composite_1.encodeComposite3DTile)(tile, dataView, byteOffset, options, encode3DTileToDataView);
        case constants_1.TILE3D_TYPE.POINT_CLOUD:
            return (0, encode_3d_tile_point_cloud_1.encodePointCloud3DTile)(tile, dataView, byteOffset, options);
        case constants_1.TILE3D_TYPE.BATCHED_3D_MODEL:
            return (0, encode_3d_tile_batched_model_1.encodeBatchedModel3DTile)(tile, dataView, byteOffset, options);
        case constants_1.TILE3D_TYPE.INSTANCED_3D_MODEL:
            return (0, encode_3d_tile_instanced_model_1.encodeInstancedModel3DTile)(tile, dataView, byteOffset, options);
        default:
            throw new Error('3D Tiles: unknown tile type');
    }
}
