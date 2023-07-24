"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CesiumIonLoader = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _tiles3dLoader = require("./tiles-3d-loader");
var _ion = require("./lib/ion/ion");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function preload(_x) {
  return _preload.apply(this, arguments);
}
function _preload() {
  _preload = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(url) {
    var options,
      _options,
      accessToken,
      assetId,
      matched,
      _args2 = arguments;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          options = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : {};
          options = options['cesium-ion'] || {};
          _options = options, accessToken = _options.accessToken;
          assetId = options.assetId;
          if (!Number.isFinite(assetId)) {
            matched = url.match(/\/([0-9]+)\/tileset.json/);
            assetId = matched && matched[1];
          }
          return _context2.abrupt("return", (0, _ion.getIonTilesetMetadata)(accessToken, assetId));
        case 6:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _preload.apply(this, arguments);
}
var CesiumIonLoader = _objectSpread(_objectSpread({}, _tiles3dLoader.Tiles3DLoader), {}, {
  id: 'cesium-ion',
  name: 'Cesium Ion',
  preload: preload,
  parse: function () {
    var _parse = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(data, options, context) {
      return _regenerator.default.wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            options = _objectSpread({}, options);
            options['3d-tiles'] = options['cesium-ion'];
            options.loader = CesiumIonLoader;
            return _context.abrupt("return", _tiles3dLoader.Tiles3DLoader.parse(data, options, context));
          case 4:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    function parse(_x2, _x3, _x4) {
      return _parse.apply(this, arguments);
    }
    return parse;
  }(),
  options: {
    'cesium-ion': _objectSpread(_objectSpread({}, _tiles3dLoader.Tiles3DLoader.options['3d-tiles']), {}, {
      accessToken: null
    })
  }
});
exports.CesiumIonLoader = CesiumIonLoader;
//# sourceMappingURL=cesium-ion-loader.js.map