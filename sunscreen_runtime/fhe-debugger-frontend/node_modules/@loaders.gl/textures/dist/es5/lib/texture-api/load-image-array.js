"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getImageArrayUrls = getImageArrayUrls;
exports.loadImageTextureArray = loadImageTextureArray;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _images = require("@loaders.gl/images");
var _loadImage = require("./load-image");
var _deepLoad = require("./deep-load");
function loadImageTextureArray(_x, _x2) {
  return _loadImageTextureArray.apply(this, arguments);
}
function _loadImageTextureArray() {
  _loadImageTextureArray = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(count, getUrl) {
    var options,
      imageUrls,
      _args = arguments;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          options = _args.length > 2 && _args[2] !== undefined ? _args[2] : {};
          _context.next = 3;
          return getImageArrayUrls(count, getUrl, options);
        case 3:
          imageUrls = _context.sent;
          _context.next = 6;
          return (0, _deepLoad.deepLoad)(imageUrls, _images.ImageLoader.parse, options);
        case 6:
          return _context.abrupt("return", _context.sent);
        case 7:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _loadImageTextureArray.apply(this, arguments);
}
function getImageArrayUrls(_x3, _x4) {
  return _getImageArrayUrls.apply(this, arguments);
}
function _getImageArrayUrls() {
  _getImageArrayUrls = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(count, getUrl) {
    var options,
      promises,
      index,
      promise,
      _args2 = arguments;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          options = _args2.length > 2 && _args2[2] !== undefined ? _args2[2] : {};
          promises = [];
          for (index = 0; index < count; index++) {
            promise = (0, _loadImage.getImageUrls)(getUrl, options, {
              index: index
            });
            promises.push(promise);
          }
          _context2.next = 5;
          return Promise.all(promises);
        case 5:
          return _context2.abrupt("return", _context2.sent);
        case 6:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _getImageArrayUrls.apply(this, arguments);
}
//# sourceMappingURL=load-image-array.js.map