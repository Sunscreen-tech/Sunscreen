"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tile3DWriter = void 0;
const version_1 = require("./lib/utils/version");
const encode_3d_tile_1 = __importDefault(require("./lib/encoders/encode-3d-tile"));
/**
 * Exporter for 3D Tiles
 */
exports.Tile3DWriter = {
    name: '3D Tile',
    id: '3d-tiles',
    module: '3d-tiles',
    version: version_1.VERSION,
    extensions: ['cmpt', 'pnts', 'b3dm', 'i3dm'],
    mimeTypes: ['application/octet-stream'],
    encodeSync,
    binary: true,
    options: {
        ['3d-tiles']: {}
    }
};
function encodeSync(tile, options) {
    return (0, encode_3d_tile_1.default)(tile, options);
}
