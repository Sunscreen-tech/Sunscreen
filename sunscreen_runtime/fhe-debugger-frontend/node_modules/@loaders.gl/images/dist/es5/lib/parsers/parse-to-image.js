"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parseToImage;
exports.loadToImage = loadToImage;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _svgUtils = require("./svg-utils");
function parseToImage(_x, _x2, _x3) {
  return _parseToImage.apply(this, arguments);
}
function _parseToImage() {
  _parseToImage = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(arrayBuffer, options, url) {
    var blobOrDataUrl, URL, objectUrl;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          blobOrDataUrl = (0, _svgUtils.getBlobOrSVGDataUrl)(arrayBuffer, url);
          URL = self.URL || self.webkitURL;
          objectUrl = typeof blobOrDataUrl !== 'string' && URL.createObjectURL(blobOrDataUrl);
          _context.prev = 3;
          _context.next = 6;
          return loadToImage(objectUrl || blobOrDataUrl, options);
        case 6:
          return _context.abrupt("return", _context.sent);
        case 7:
          _context.prev = 7;
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
          return _context.finish(7);
        case 10:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[3,, 7, 10]]);
  }));
  return _parseToImage.apply(this, arguments);
}
function loadToImage(_x4, _x5) {
  return _loadToImage.apply(this, arguments);
}
function _loadToImage() {
  _loadToImage = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(url, options) {
    var image;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          image = new Image();
          image.src = url;
          if (!(options.image && options.image.decode && image.decode)) {
            _context2.next = 6;
            break;
          }
          _context2.next = 5;
          return image.decode();
        case 5:
          return _context2.abrupt("return", image);
        case 6:
          _context2.next = 8;
          return new Promise(function (resolve, reject) {
            try {
              image.onload = function () {
                return resolve(image);
              };
              image.onerror = function (err) {
                return reject(new Error("Could not load image ".concat(url, ": ").concat(err)));
              };
            } catch (error) {
              reject(error);
            }
          });
        case 8:
          return _context2.abrupt("return", _context2.sent);
        case 9:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _loadToImage.apply(this, arguments);
}
//# sourceMappingURL=parse-to-image.js.map