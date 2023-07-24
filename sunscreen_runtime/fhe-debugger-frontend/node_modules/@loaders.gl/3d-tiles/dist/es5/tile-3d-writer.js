"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Tile3DWriter = void 0;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _version = require("./lib/utils/version");
var _encode3dTile = _interopRequireDefault(require("./lib/encoders/encode-3d-tile"));
var Tile3DWriter = {
  name: '3D Tile',
  id: '3d-tiles',
  module: '3d-tiles',
  version: _version.VERSION,
  extensions: ['cmpt', 'pnts', 'b3dm', 'i3dm'],
  mimeTypes: ['application/octet-stream'],
  encodeSync: encodeSync,
  binary: true,
  options: (0, _defineProperty2.default)({}, '3d-tiles', {})
};
exports.Tile3DWriter = Tile3DWriter;
function encodeSync(tile, options) {
  return (0, _encode3dTile.default)(tile, options);
}
//# sourceMappingURL=tile-3d-writer.js.map