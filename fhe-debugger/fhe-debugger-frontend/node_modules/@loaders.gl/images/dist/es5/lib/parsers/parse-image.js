"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parseImage;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _loaderUtils = require("@loaders.gl/loader-utils");
var _imageType = require("../category-api/image-type");
var _parsedImageApi = require("../category-api/parsed-image-api");
var _parseToImage = _interopRequireDefault(require("./parse-to-image"));
var _parseToImageBitmap = _interopRequireDefault(require("./parse-to-image-bitmap"));
var _parseToNodeImage = _interopRequireDefault(require("./parse-to-node-image"));
function parseImage(_x, _x2, _x3) {
  return _parseImage.apply(this, arguments);
}
function _parseImage() {
  _parseImage = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(arrayBuffer, options, context) {
    var imageOptions, imageType, _ref, url, loadType, image;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          options = options || {};
          imageOptions = options.image || {};
          imageType = imageOptions.type || 'auto';
          _ref = context || {}, url = _ref.url;
          loadType = getLoadableImageType(imageType);
          _context.t0 = loadType;
          _context.next = _context.t0 === 'imagebitmap' ? 8 : _context.t0 === 'image' ? 12 : _context.t0 === 'data' ? 16 : 20;
          break;
        case 8:
          _context.next = 10;
          return (0, _parseToImageBitmap.default)(arrayBuffer, options, url);
        case 10:
          image = _context.sent;
          return _context.abrupt("break", 21);
        case 12:
          _context.next = 14;
          return (0, _parseToImage.default)(arrayBuffer, options, url);
        case 14:
          image = _context.sent;
          return _context.abrupt("break", 21);
        case 16:
          _context.next = 18;
          return (0, _parseToNodeImage.default)(arrayBuffer, options);
        case 18:
          image = _context.sent;
          return _context.abrupt("break", 21);
        case 20:
          (0, _loaderUtils.assert)(false);
        case 21:
          if (imageType === 'data') {
            image = (0, _parsedImageApi.getImageData)(image);
          }
          return _context.abrupt("return", image);
        case 23:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _parseImage.apply(this, arguments);
}
function getLoadableImageType(type) {
  switch (type) {
    case 'auto':
    case 'data':
      return (0, _imageType.getDefaultImageType)();
    default:
      (0, _imageType.isImageTypeSupported)(type);
      return type;
  }
}
//# sourceMappingURL=parse-image.js.map