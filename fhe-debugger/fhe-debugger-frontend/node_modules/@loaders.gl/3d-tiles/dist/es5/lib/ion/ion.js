"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getIonAssetMetadata = getIonAssetMetadata;
exports.getIonAssets = getIonAssets;
exports.getIonTilesetMetadata = getIonTilesetMetadata;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _core = require("@loaders.gl/core");
var _loaderUtils = require("@loaders.gl/loader-utils");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
var CESIUM_ION_URL = 'https://api.cesium.com/v1/assets';
function getIonTilesetMetadata(_x, _x2) {
  return _getIonTilesetMetadata.apply(this, arguments);
}
function _getIonTilesetMetadata() {
  _getIonTilesetMetadata = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(accessToken, assetId) {
    var assets, _iterator, _step, item, ionAssetMetadata, type, url;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (assetId) {
            _context.next = 6;
            break;
          }
          _context.next = 3;
          return getIonAssets(accessToken);
        case 3:
          assets = _context.sent;
          _iterator = _createForOfIteratorHelper(assets.items);
          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              item = _step.value;
              if (item.type === '3DTILES') {
                assetId = item.id;
              }
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
        case 6:
          _context.next = 8;
          return getIonAssetMetadata(accessToken, assetId);
        case 8:
          ionAssetMetadata = _context.sent;
          type = ionAssetMetadata.type, url = ionAssetMetadata.url;
          (0, _loaderUtils.assert)(type === '3DTILES' && url);
          ionAssetMetadata.headers = {
            Authorization: "Bearer ".concat(ionAssetMetadata.accessToken)
          };
          return _context.abrupt("return", ionAssetMetadata);
        case 13:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _getIonTilesetMetadata.apply(this, arguments);
}
function getIonAssets(_x3) {
  return _getIonAssets.apply(this, arguments);
}
function _getIonAssets() {
  _getIonAssets = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(accessToken) {
    var url, headers, response;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          (0, _loaderUtils.assert)(accessToken);
          url = CESIUM_ION_URL;
          headers = {
            Authorization: "Bearer ".concat(accessToken)
          };
          _context2.next = 5;
          return (0, _core.fetchFile)(url, {
            fetch: {
              headers: headers
            }
          });
        case 5:
          response = _context2.sent;
          if (response.ok) {
            _context2.next = 8;
            break;
          }
          throw new Error(response.statusText);
        case 8:
          _context2.next = 10;
          return response.json();
        case 10:
          return _context2.abrupt("return", _context2.sent);
        case 11:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _getIonAssets.apply(this, arguments);
}
function getIonAssetMetadata(_x4, _x5) {
  return _getIonAssetMetadata.apply(this, arguments);
}
function _getIonAssetMetadata() {
  _getIonAssetMetadata = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(accessToken, assetId) {
    var headers, url, response, metadata, tilesetInfo;
    return _regenerator.default.wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          (0, _loaderUtils.assert)(accessToken, assetId);
          headers = {
            Authorization: "Bearer ".concat(accessToken)
          };
          url = "".concat(CESIUM_ION_URL, "/").concat(assetId);
          _context3.next = 5;
          return (0, _core.fetchFile)("".concat(url), {
            fetch: {
              headers: headers
            }
          });
        case 5:
          response = _context3.sent;
          if (response.ok) {
            _context3.next = 8;
            break;
          }
          throw new Error(response.statusText);
        case 8:
          _context3.next = 10;
          return response.json();
        case 10:
          metadata = _context3.sent;
          _context3.next = 13;
          return (0, _core.fetchFile)("".concat(url, "/endpoint"), {
            fetch: {
              headers: headers
            }
          });
        case 13:
          response = _context3.sent;
          if (response.ok) {
            _context3.next = 16;
            break;
          }
          throw new Error(response.statusText);
        case 16:
          _context3.next = 18;
          return response.json();
        case 18:
          tilesetInfo = _context3.sent;
          metadata = _objectSpread(_objectSpread({}, metadata), tilesetInfo);
          return _context3.abrupt("return", metadata);
        case 21:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _getIonAssetMetadata.apply(this, arguments);
}
//# sourceMappingURL=ion.js.map