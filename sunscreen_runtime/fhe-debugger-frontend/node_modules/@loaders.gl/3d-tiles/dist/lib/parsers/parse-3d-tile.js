"use strict";
// This file is derived from the Cesium code base under Apache 2 license
// See LICENSE.md and https://github.com/AnalyticalGraphicsInc/cesium/blob/master/LICENSE.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse3DTile = void 0;
const constants_1 = require("../constants");
const parse_utils_1 = require("./helpers/parse-utils");
const parse_3d_tile_point_cloud_1 = require("./parse-3d-tile-point-cloud");
const parse_3d_tile_batched_model_1 = require("./parse-3d-tile-batched-model");
const parse_3d_tile_instanced_model_1 = require("./parse-3d-tile-instanced-model");
const parse_3d_tile_composite_1 = require("./parse-3d-tile-composite");
const parse_3d_tile_gltf_1 = require("./parse-3d-tile-gltf");
// Extracts
async function parse3DTile(arrayBuffer, byteOffset = 0, options, context, tile = {}) {
    // @ts-expect-error
    tile.byteOffset = byteOffset;
    // @ts-expect-error
    tile.type = (0, parse_utils_1.getMagicString)(arrayBuffer, byteOffset);
    // @ts-expect-error
    switch (tile.type) {
        case constants_1.TILE3D_TYPE.COMPOSITE:
            // Note: We pass this function as argument so that embedded tiles can be parsed recursively
            return await (0, parse_3d_tile_composite_1.parseComposite3DTile)(tile, arrayBuffer, byteOffset, options, context, parse3DTile);
        case constants_1.TILE3D_TYPE.BATCHED_3D_MODEL:
            return await (0, parse_3d_tile_batched_model_1.parseBatchedModel3DTile)(tile, arrayBuffer, byteOffset, options, context);
        case constants_1.TILE3D_TYPE.GLTF:
            return await (0, parse_3d_tile_gltf_1.parseGltf3DTile)(tile, arrayBuffer, options, context);
        case constants_1.TILE3D_TYPE.INSTANCED_3D_MODEL:
            return await (0, parse_3d_tile_instanced_model_1.parseInstancedModel3DTile)(tile, arrayBuffer, byteOffset, options, context);
        case constants_1.TILE3D_TYPE.POINT_CLOUD:
            return await (0, parse_3d_tile_point_cloud_1.parsePointCloud3DTile)(tile, arrayBuffer, byteOffset, options, context);
        default:
            // @ts-expect-error
            throw new Error(`3DTileLoader: unknown type ${tile.type}`); // eslint-disable-line
    }
}
exports.parse3DTile = parse3DTile;
