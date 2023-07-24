"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isWebPSupported = isWebPSupported;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var WEBP_TEST_IMAGES = {
  lossy: 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
  lossless: 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==',
  alpha: 'UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==',
  animation: 'UklGRlIAAABXRUJQVlA4WAoAAAASAAAAAAAAAAAAQU5JTQYAAAD/////AABBTk1GJgAAAAAAAAAAAAAAAAAAAGQAAABWUDhMDQAAAC8AAAAQBxAREYiI/gcA'
};
var WEBP_FEATURES = ['lossy', 'lossless', 'alpha', 'animation'];
function isWebPSupported() {
  return _isWebPSupported.apply(this, arguments);
}
function _isWebPSupported() {
  _isWebPSupported = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee() {
    var features,
      promises,
      statuses,
      _args = arguments;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          features = _args.length > 0 && _args[0] !== undefined ? _args[0] : WEBP_FEATURES;
          promises = features.map(function (feature) {
            return checkWebPFeature(feature);
          });
          _context.next = 4;
          return Promise.all(promises);
        case 4:
          statuses = _context.sent;
          return _context.abrupt("return", statuses.every(function (_) {
            return _;
          }));
        case 6:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _isWebPSupported.apply(this, arguments);
}
function checkWebPFeature(_x) {
  return _checkWebPFeature.apply(this, arguments);
}
function _checkWebPFeature() {
  _checkWebPFeature = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(feature) {
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          if (!(typeof Image === 'undefined')) {
            _context2.next = 2;
            break;
          }
          return _context2.abrupt("return", false);
        case 2:
          _context2.next = 4;
          return new Promise(function (resolve, reject) {
            var img = new Image();
            img.onload = function () {
              return resolve(img.width > 0 && img.height > 0);
            };
            img.onerror = function () {
              return resolve(false);
            };
            img.src = "data:image/webp;base64,".concat(WEBP_TEST_IMAGES[feature]);
          });
        case 4:
          return _context2.abrupt("return", _context2.sent);
        case 5:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _checkWebPFeature.apply(this, arguments);
}
//# sourceMappingURL=webp.js.map