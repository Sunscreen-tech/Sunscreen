"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Tile3DSubtreeLoader = void 0;
var _parse3dTileSubtree = _interopRequireDefault(require("./lib/parsers/helpers/parse-3d-tile-subtree"));
var _version = require("./lib/utils/version");
var Tile3DSubtreeLoader = {
  id: '3d-tiles-subtree',
  name: '3D Tiles Subtree',
  module: '3d-tiles',
  version: _version.VERSION,
  extensions: ['subtree'],
  mimeTypes: ['application/octet-stream'],
  tests: ['subtree'],
  parse: _parse3dTileSubtree.default,
  options: {}
};
exports.Tile3DSubtreeLoader = Tile3DSubtreeLoader;
//# sourceMappingURL=tile-3d-subtree-loader.js.map