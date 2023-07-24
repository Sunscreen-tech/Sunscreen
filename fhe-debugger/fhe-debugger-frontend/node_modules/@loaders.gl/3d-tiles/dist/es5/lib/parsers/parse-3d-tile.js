"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parse3DTile = parse3DTile;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _constants = require("../constants");
var _parseUtils = require("./helpers/parse-utils");
var _parse3dTilePointCloud = require("./parse-3d-tile-point-cloud");
var _parse3dTileBatchedModel = require("./parse-3d-tile-batched-model");
var _parse3dTileInstancedModel = require("./parse-3d-tile-instanced-model");
var _parse3dTileComposite = require("./parse-3d-tile-composite");
var _parse3dTileGltf = require("./parse-3d-tile-gltf");
function parse3DTile(_x) {
  return _parse3DTile.apply(this, arguments);
}
function _parse3DTile() {
  _parse3DTile = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(arrayBuffer) {
    var byteOffset,
      options,
      context,
      tile,
      _args = arguments;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          byteOffset = _args.length > 1 && _args[1] !== undefined ? _args[1] : 0;
          options = _args.length > 2 ? _args[2] : undefined;
          context = _args.length > 3 ? _args[3] : undefined;
          tile = _args.length > 4 && _args[4] !== undefined ? _args[4] : {};
          tile.byteOffset = byteOffset;
          tile.type = (0, _parseUtils.getMagicString)(arrayBuffer, byteOffset);
          _context.t0 = tile.type;
          _context.next = _context.t0 === _constants.TILE3D_TYPE.COMPOSITE ? 9 : _context.t0 === _constants.TILE3D_TYPE.BATCHED_3D_MODEL ? 12 : _context.t0 === _constants.TILE3D_TYPE.GLTF ? 15 : _context.t0 === _constants.TILE3D_TYPE.INSTANCED_3D_MODEL ? 18 : _context.t0 === _constants.TILE3D_TYPE.POINT_CLOUD ? 21 : 24;
          break;
        case 9:
          _context.next = 11;
          return (0, _parse3dTileComposite.parseComposite3DTile)(tile, arrayBuffer, byteOffset, options, context, parse3DTile);
        case 11:
          return _context.abrupt("return", _context.sent);
        case 12:
          _context.next = 14;
          return (0, _parse3dTileBatchedModel.parseBatchedModel3DTile)(tile, arrayBuffer, byteOffset, options, context);
        case 14:
          return _context.abrupt("return", _context.sent);
        case 15:
          _context.next = 17;
          return (0, _parse3dTileGltf.parseGltf3DTile)(tile, arrayBuffer, options, context);
        case 17:
          return _context.abrupt("return", _context.sent);
        case 18:
          _context.next = 20;
          return (0, _parse3dTileInstancedModel.parseInstancedModel3DTile)(tile, arrayBuffer, byteOffset, options, context);
        case 20:
          return _context.abrupt("return", _context.sent);
        case 21:
          _context.next = 23;
          return (0, _parse3dTilePointCloud.parsePointCloud3DTile)(tile, arrayBuffer, byteOffset, options, context);
        case 23:
          return _context.abrupt("return", _context.sent);
        case 24:
          throw new Error("3DTileLoader: unknown type ".concat(tile.type));
        case 25:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _parse3DTile.apply(this, arguments);
}
//# sourceMappingURL=parse-3d-tile.js.map