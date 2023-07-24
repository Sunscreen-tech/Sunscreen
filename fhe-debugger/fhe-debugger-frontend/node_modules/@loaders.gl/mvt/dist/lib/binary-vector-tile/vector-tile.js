"use strict";
// This code is forked from https://github.com/mapbox/vector-tile-js under BSD 3-clause license.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vector_tile_layer_1 = __importDefault(require("./vector-tile-layer"));
class VectorTile {
    constructor(pbf, end) {
        this.layers = pbf.readFields(readTile, {}, end);
    }
}
exports.default = VectorTile;
/**
 *
 * @param tag
 * @param layers
 * @param pbf
 */
function readTile(tag, layers, pbf) {
    if (tag === 3) {
        if (pbf) {
            const layer = new vector_tile_layer_1.default(pbf, pbf.readVarint() + pbf.pos);
            if (layer.length && layers) {
                layers[layer.name] = layer;
            }
        }
    }
}
