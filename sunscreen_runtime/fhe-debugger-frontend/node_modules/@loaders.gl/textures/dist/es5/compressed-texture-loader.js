"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._TypecheckCompressedTextureWorkerLoader = exports._TypecheckCompressedTextureLoader = exports.CompressedTextureWorkerLoader = exports.CompressedTextureLoader = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _version = require("./lib/utils/version");
var _parseCompressedTexture = require("./lib/parsers/parse-compressed-texture");
var _parseBasis = _interopRequireDefault(require("./lib/parsers/parse-basis"));
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var DEFAULT_TEXTURE_LOADER_OPTIONS = {
  'compressed-texture': {
    libraryPath: 'libs/',
    useBasis: false
  }
};
var CompressedTextureWorkerLoader = {
  name: 'Texture Containers',
  id: 'compressed-texture',
  module: 'textures',
  version: _version.VERSION,
  worker: true,
  extensions: ['ktx', 'ktx2', 'dds', 'pvr'],
  mimeTypes: ['image/ktx2', 'image/ktx', 'image/vnd-ms.dds', 'image/x-dds', 'application/octet-stream'],
  binary: true,
  options: DEFAULT_TEXTURE_LOADER_OPTIONS
};
exports.CompressedTextureWorkerLoader = CompressedTextureWorkerLoader;
var CompressedTextureLoader = _objectSpread(_objectSpread({}, CompressedTextureWorkerLoader), {}, {
  parse: function () {
    var _parse = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(arrayBuffer, options) {
      return _regenerator.default.wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            if (!options['compressed-texture'].useBasis) {
              _context.next = 5;
              break;
            }
            options.basis = _objectSpread(_objectSpread({
              format: {
                alpha: 'BC3',
                noAlpha: 'BC1'
              }
            }, options.basis), {}, {
              containerFormat: 'ktx2',
              module: 'encoder'
            });
            _context.next = 4;
            return (0, _parseBasis.default)(arrayBuffer, options);
          case 4:
            return _context.abrupt("return", _context.sent[0]);
          case 5:
            return _context.abrupt("return", (0, _parseCompressedTexture.parseCompressedTexture)(arrayBuffer));
          case 6:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    function parse(_x, _x2) {
      return _parse.apply(this, arguments);
    }
    return parse;
  }()
});
exports.CompressedTextureLoader = CompressedTextureLoader;
var _TypecheckCompressedTextureWorkerLoader = CompressedTextureWorkerLoader;
exports._TypecheckCompressedTextureWorkerLoader = _TypecheckCompressedTextureWorkerLoader;
var _TypecheckCompressedTextureLoader = CompressedTextureLoader;
exports._TypecheckCompressedTextureLoader = _TypecheckCompressedTextureLoader;
//# sourceMappingURL=compressed-texture-loader.js.map