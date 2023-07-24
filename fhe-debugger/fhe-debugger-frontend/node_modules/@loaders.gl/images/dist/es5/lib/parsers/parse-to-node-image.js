"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parseToNodeImage;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _loaderUtils = require("@loaders.gl/loader-utils");
var _binaryImageApi = require("../category-api/binary-image-api");
function parseToNodeImage(_x, _x2) {
  return _parseToNodeImage.apply(this, arguments);
}
function _parseToNodeImage() {
  _parseToNodeImage = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(arrayBuffer, options) {
    var _ref, mimeType, _parseImageNode;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _ref = (0, _binaryImageApi.getBinaryImageMetadata)(arrayBuffer) || {}, mimeType = _ref.mimeType;
          _parseImageNode = globalThis._parseImageNode;
          (0, _loaderUtils.assert)(_parseImageNode);
          _context.next = 5;
          return _parseImageNode(arrayBuffer, mimeType);
        case 5:
          return _context.abrupt("return", _context.sent);
        case 6:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _parseToNodeImage.apply(this, arguments);
}
//# sourceMappingURL=parse-to-node-image.js.map