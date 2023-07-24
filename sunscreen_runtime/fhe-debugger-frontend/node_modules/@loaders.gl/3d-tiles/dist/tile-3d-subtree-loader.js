"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tile3DSubtreeLoader = void 0;
const parse_3d_tile_subtree_1 = __importDefault(require("./lib/parsers/helpers/parse-3d-tile-subtree"));
const version_1 = require("./lib/utils/version");
/**
 * Loader for 3D Tiles Subtree
 *
 */
exports.Tile3DSubtreeLoader = {
    id: '3d-tiles-subtree',
    name: '3D Tiles Subtree',
    module: '3d-tiles',
    version: version_1.VERSION,
    extensions: ['subtree'],
    mimeTypes: ['application/octet-stream'],
    tests: ['subtree'],
    parse: parse_3d_tile_subtree_1.default,
    options: {}
};
