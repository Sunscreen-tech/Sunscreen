"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parseToImageBitmap;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _svgUtils = require("./svg-utils");
var _parseToImage = _interopRequireDefault(require("./parse-to-image"));
var EMPTY_OBJECT = {};
var imagebitmapOptionsSupported = true;
function parseToImageBitmap(_x, _x2, _x3) {
  return _parseToImageBitmap.apply(this, arguments);
}
function _parseToImageBitmap() {
  _parseToImageBitmap = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(arrayBuffer, options, url) {
    var blob, image, imagebitmapOptions;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!(0, _svgUtils.isSVG)(url)) {
            _context.next = 7;
            break;
          }
          _context.next = 3;
          return (0, _parseToImage.default)(arrayBuffer, options, url);
        case 3:
          image = _context.sent;
          blob = image;
          _context.next = 8;
          break;
        case 7:
          blob = (0, _svgUtils.getBlob)(arrayBuffer, url);
        case 8:
          imagebitmapOptions = options && options.imagebitmap;
          _context.next = 11;
          return safeCreateImageBitmap(blob, imagebitmapOptions);
        case 11:
          return _context.abrupt("return", _context.sent);
        case 12:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _parseToImageBitmap.apply(this, arguments);
}
function safeCreateImageBitmap(_x4) {
  return _safeCreateImageBitmap.apply(this, arguments);
}
function _safeCreateImageBitmap() {
  _safeCreateImageBitmap = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(blob) {
    var imagebitmapOptions,
      _args2 = arguments;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          imagebitmapOptions = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : null;
          if (isEmptyObject(imagebitmapOptions) || !imagebitmapOptionsSupported) {
            imagebitmapOptions = null;
          }
          if (!imagebitmapOptions) {
            _context2.next = 13;
            break;
          }
          _context2.prev = 3;
          _context2.next = 6;
          return createImageBitmap(blob, imagebitmapOptions);
        case 6:
          return _context2.abrupt("return", _context2.sent);
        case 9:
          _context2.prev = 9;
          _context2.t0 = _context2["catch"](3);
          console.warn(_context2.t0);
          imagebitmapOptionsSupported = false;
        case 13:
          _context2.next = 15;
          return createImageBitmap(blob);
        case 15:
          return _context2.abrupt("return", _context2.sent);
        case 16:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[3, 9]]);
  }));
  return _safeCreateImageBitmap.apply(this, arguments);
}
function isEmptyObject(object) {
  for (var key in object || EMPTY_OBJECT) {
    return false;
  }
  return true;
}
//# sourceMappingURL=parse-to-image-bitmap.js.map