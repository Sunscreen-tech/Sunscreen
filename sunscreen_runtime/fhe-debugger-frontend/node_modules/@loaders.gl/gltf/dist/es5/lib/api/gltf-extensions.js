"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EXTENSIONS = void 0;
exports.decodeExtensions = decodeExtensions;
exports.preprocessExtensions = preprocessExtensions;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var EXT_meshopt_compression = _interopRequireWildcard(require("../extensions/EXT_meshopt_compression"));
var EXT_texture_webp = _interopRequireWildcard(require("../extensions/EXT_texture_webp"));
var KHR_texture_basisu = _interopRequireWildcard(require("../extensions/KHR_texture_basisu"));
var KHR_draco_mesh_compression = _interopRequireWildcard(require("../extensions/KHR_draco_mesh_compression"));
var KHR_texture_transform = _interopRequireWildcard(require("../extensions/KHR_texture_transform"));
var KHR_lights_punctual = _interopRequireWildcard(require("../extensions/deprecated/KHR_lights_punctual"));
var KHR_materials_unlit = _interopRequireWildcard(require("../extensions/deprecated/KHR_materials_unlit"));
var KHR_techniques_webgl = _interopRequireWildcard(require("../extensions/deprecated/KHR_techniques_webgl"));
var EXT_feature_metadata = _interopRequireWildcard(require("../extensions/deprecated/EXT_feature_metadata"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
var EXTENSIONS = [EXT_meshopt_compression, EXT_texture_webp, KHR_texture_basisu, KHR_draco_mesh_compression, KHR_lights_punctual, KHR_materials_unlit, KHR_techniques_webgl, KHR_texture_transform, EXT_feature_metadata];
exports.EXTENSIONS = EXTENSIONS;
function preprocessExtensions(gltf) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var context = arguments.length > 2 ? arguments[2] : undefined;
  var extensions = EXTENSIONS.filter(function (extension) {
    return useExtension(extension.name, options);
  });
  var _iterator = _createForOfIteratorHelper(extensions),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _extension$preprocess;
      var extension = _step.value;
      (_extension$preprocess = extension.preprocess) === null || _extension$preprocess === void 0 ? void 0 : _extension$preprocess.call(extension, gltf, options, context);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
}
function decodeExtensions(_x) {
  return _decodeExtensions.apply(this, arguments);
}
function _decodeExtensions() {
  _decodeExtensions = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(gltf) {
    var options,
      context,
      extensions,
      _iterator2,
      _step2,
      _extension$decode,
      extension,
      _args = arguments;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          options = _args.length > 1 && _args[1] !== undefined ? _args[1] : {};
          context = _args.length > 2 ? _args[2] : undefined;
          extensions = EXTENSIONS.filter(function (extension) {
            return useExtension(extension.name, options);
          });
          _iterator2 = _createForOfIteratorHelper(extensions);
          _context.prev = 4;
          _iterator2.s();
        case 6:
          if ((_step2 = _iterator2.n()).done) {
            _context.next = 12;
            break;
          }
          extension = _step2.value;
          _context.next = 10;
          return (_extension$decode = extension.decode) === null || _extension$decode === void 0 ? void 0 : _extension$decode.call(extension, gltf, options, context);
        case 10:
          _context.next = 6;
          break;
        case 12:
          _context.next = 17;
          break;
        case 14:
          _context.prev = 14;
          _context.t0 = _context["catch"](4);
          _iterator2.e(_context.t0);
        case 17:
          _context.prev = 17;
          _iterator2.f();
          return _context.finish(17);
        case 20:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[4, 14, 17, 20]]);
  }));
  return _decodeExtensions.apply(this, arguments);
}
function useExtension(extensionName, options) {
  var _options$gltf;
  var excludes = (options === null || options === void 0 ? void 0 : (_options$gltf = options.gltf) === null || _options$gltf === void 0 ? void 0 : _options$gltf.excludeExtensions) || {};
  var exclude = extensionName in excludes && !excludes[extensionName];
  return !exclude;
}
//# sourceMappingURL=gltf-extensions.js.map