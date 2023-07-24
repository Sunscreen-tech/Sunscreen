"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSupportedImageFormats = getSupportedImageFormats;
exports.isImageFormatSupported = isImageFormatSupported;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _loaderUtils = require("@loaders.gl/loader-utils");
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
var MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/tiff', 'image/svg', 'image/svg+xml', 'image/bmp', 'image/vnd.microsoft.icon'];
var mimeTypeSupportedPromise = null;
function getSupportedImageFormats() {
  return _getSupportedImageFormats.apply(this, arguments);
}
function _getSupportedImageFormats() {
  _getSupportedImageFormats = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee() {
    var supportedMimeTypes, _iterator, _step, _mimeType, supported;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!mimeTypeSupportedPromise) {
            _context.next = 4;
            break;
          }
          _context.next = 3;
          return mimeTypeSupportedPromise;
        case 3:
          return _context.abrupt("return", _context.sent);
        case 4:
          supportedMimeTypes = new Set();
          _iterator = _createForOfIteratorHelper(MIME_TYPES);
          _context.prev = 6;
          _iterator.s();
        case 8:
          if ((_step = _iterator.n()).done) {
            _context.next = 21;
            break;
          }
          _mimeType = _step.value;
          if (!_loaderUtils.isBrowser) {
            _context.next = 16;
            break;
          }
          _context.next = 13;
          return checkBrowserImageFormatSupportAsync(_mimeType);
        case 13:
          _context.t0 = _context.sent;
          _context.next = 17;
          break;
        case 16:
          _context.t0 = checkNodeImageFormatSupport(_mimeType);
        case 17:
          supported = _context.t0;
          if (supported) {
            supportedMimeTypes.add(_mimeType);
          }
        case 19:
          _context.next = 8;
          break;
        case 21:
          _context.next = 26;
          break;
        case 23:
          _context.prev = 23;
          _context.t1 = _context["catch"](6);
          _iterator.e(_context.t1);
        case 26:
          _context.prev = 26;
          _iterator.f();
          return _context.finish(26);
        case 29:
          return _context.abrupt("return", supportedMimeTypes);
        case 30:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[6, 23, 26, 29]]);
  }));
  return _getSupportedImageFormats.apply(this, arguments);
}
var mimeTypeSupportedSync = {};
function isImageFormatSupported(mimeType) {
  if (mimeTypeSupportedSync[mimeType] === undefined) {
    var supported = _loaderUtils.isBrowser ? checkBrowserImageFormatSupport(mimeType) : checkNodeImageFormatSupport(mimeType);
    mimeTypeSupportedSync[mimeType] = supported;
  }
  return mimeTypeSupportedSync[mimeType];
}
function checkNodeImageFormatSupport(mimeType) {
  var NODE_FORMAT_SUPPORT = ['image/png', 'image/jpeg', 'image/gif'];
  var _parseImageNode = globalThis._parseImageNode,
    _globalThis$_imageFor = globalThis._imageFormatsNode,
    _imageFormatsNode = _globalThis$_imageFor === void 0 ? NODE_FORMAT_SUPPORT : _globalThis$_imageFor;
  return Boolean(_parseImageNode) && _imageFormatsNode.includes(mimeType);
}
function checkBrowserImageFormatSupport(mimeType) {
  switch (mimeType) {
    case 'image/avif':
    case 'image/webp':
      return testBrowserImageFormatSupport(mimeType);
    default:
      return true;
  }
}
var TEST_IMAGE = {
  'image/avif': 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=',
  'image/webp': 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'
};
function checkBrowserImageFormatSupportAsync(_x) {
  return _checkBrowserImageFormatSupportAsync.apply(this, arguments);
}
function _checkBrowserImageFormatSupportAsync() {
  _checkBrowserImageFormatSupportAsync = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(mimeType) {
    var dataURL;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          dataURL = TEST_IMAGE[mimeType];
          if (!dataURL) {
            _context2.next = 7;
            break;
          }
          _context2.next = 4;
          return testBrowserImageFormatSupportAsync(dataURL);
        case 4:
          _context2.t0 = _context2.sent;
          _context2.next = 8;
          break;
        case 7:
          _context2.t0 = true;
        case 8:
          return _context2.abrupt("return", _context2.t0);
        case 9:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _checkBrowserImageFormatSupportAsync.apply(this, arguments);
}
function testBrowserImageFormatSupport(mimeType) {
  try {
    var element = document.createElement('canvas');
    var dataURL = element.toDataURL(mimeType);
    return dataURL.indexOf("data:".concat(mimeType)) === 0;
  } catch (_unused) {
    return false;
  }
}
function testBrowserImageFormatSupportAsync(_x2) {
  return _testBrowserImageFormatSupportAsync.apply(this, arguments);
}
function _testBrowserImageFormatSupportAsync() {
  _testBrowserImageFormatSupportAsync = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(testImageDataURL) {
    return _regenerator.default.wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          return _context3.abrupt("return", new Promise(function (resolve) {
            var image = new Image();
            image.src = testImageDataURL;
            image.onload = function () {
              return resolve(image.height > 0);
            };
            image.onerror = function () {
              return resolve(false);
            };
          }));
        case 1:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _testBrowserImageFormatSupportAsync.apply(this, arguments);
}
//# sourceMappingURL=image-format.js.map