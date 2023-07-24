"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getImageUrls = getImageUrls;
exports.getMipLevels = getMipLevels;
exports.loadImageTexture = loadImageTexture;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _loaderUtils = require("@loaders.gl/loader-utils");
var _images = require("@loaders.gl/images");
var _generateUrl = require("./generate-url");
var _deepLoad = require("./deep-load");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function loadImageTexture(_x) {
  return _loadImageTexture.apply(this, arguments);
}
function _loadImageTexture() {
  _loadImageTexture = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(getUrl) {
    var options,
      imageUrls,
      _args = arguments;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          options = _args.length > 1 && _args[1] !== undefined ? _args[1] : {};
          _context.next = 3;
          return getImageUrls(getUrl, options);
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
  return _loadImageTexture.apply(this, arguments);
}
function getImageUrls(_x2, _x3) {
  return _getImageUrls.apply(this, arguments);
}
function _getImageUrls() {
  _getImageUrls = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(getUrl, options) {
    var urlOptions,
      mipLevels,
      _args2 = arguments;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          urlOptions = _args2.length > 2 && _args2[2] !== undefined ? _args2[2] : {};
          mipLevels = options && options.image && options.image.mipLevels || 0;
          if (!(mipLevels !== 0)) {
            _context2.next = 8;
            break;
          }
          _context2.next = 5;
          return getMipmappedImageUrls(getUrl, mipLevels, options, urlOptions);
        case 5:
          _context2.t0 = _context2.sent;
          _context2.next = 9;
          break;
        case 8:
          _context2.t0 = (0, _generateUrl.generateUrl)(getUrl, options, urlOptions);
        case 9:
          return _context2.abrupt("return", _context2.t0);
        case 10:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _getImageUrls.apply(this, arguments);
}
function getMipmappedImageUrls(_x4, _x5, _x6, _x7) {
  return _getMipmappedImageUrls.apply(this, arguments);
}
function _getMipmappedImageUrls() {
  _getMipmappedImageUrls = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(getUrl, mipLevels, options, urlOptions) {
    var urls, url, image, _getImageSize, width, height, mipLevel, _url;
    return _regenerator.default.wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          urls = [];
          if (!(mipLevels === 'auto')) {
            _context3.next = 9;
            break;
          }
          url = (0, _generateUrl.generateUrl)(getUrl, options, _objectSpread(_objectSpread({}, urlOptions), {}, {
            lod: 0
          }));
          _context3.next = 5;
          return (0, _deepLoad.shallowLoad)(url, _images.ImageLoader.parse, options);
        case 5:
          image = _context3.sent;
          _getImageSize = (0, _images.getImageSize)(image), width = _getImageSize.width, height = _getImageSize.height;
          mipLevels = getMipLevels({
            width: width,
            height: height
          });
          urls.push(url);
        case 9:
          (0, _loaderUtils.assert)(mipLevels > 0);
          for (mipLevel = urls.length; mipLevel < mipLevels; ++mipLevel) {
            _url = (0, _generateUrl.generateUrl)(getUrl, options, _objectSpread(_objectSpread({}, urlOptions), {}, {
              lod: mipLevel
            }));
            urls.push(_url);
          }
          return _context3.abrupt("return", urls);
        case 12:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _getMipmappedImageUrls.apply(this, arguments);
}
function getMipLevels(size) {
  return 1 + Math.floor(Math.log2(Math.max(size.width, size.height)));
}
//# sourceMappingURL=load-image.js.map