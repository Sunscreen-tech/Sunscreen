"use strict";
// This file is derived from the Cesium code base under Apache 2 license
// See LICENSE.md and https://github.com/AnalyticalGraphicsInc/cesium/blob/master/LICENSE.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeComposite3DTile = void 0;
const constants_1 = require("../constants");
const encode_3d_tile_header_1 = require("./helpers/encode-3d-tile-header");
function encodeComposite3DTile(tile, dataView, byteOffset, options, encode3DTile) {
    // Add default magic for this tile type
    tile = { magic: constants_1.MAGIC_ARRAY.COMPOSITE, tiles: [], ...tile };
    const byteOffsetStart = byteOffset;
    byteOffset += (0, encode_3d_tile_header_1.encode3DTileHeader)(tile, dataView, byteOffset);
    if (dataView) {
        dataView.setUint32(byteOffset, tile.tiles.length, true); // tilesLength
    }
    byteOffset += 4;
    for (let i = 0; i < tile.tiles.length; ++i) {
        byteOffset += encode3DTile(tile.tiles[i], dataView, byteOffset, options);
    }
    // Go "back" and rewrite the tile's `byteLength` now that we know the value
    (0, encode_3d_tile_header_1.encode3DTileByteLength)(dataView, byteOffsetStart, byteOffset - byteOffsetStart);
    return byteOffset;
}
exports.encodeComposite3DTile = encodeComposite3DTile;
