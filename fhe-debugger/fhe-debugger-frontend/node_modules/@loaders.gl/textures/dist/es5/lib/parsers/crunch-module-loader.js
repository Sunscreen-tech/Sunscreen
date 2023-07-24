"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loadCrunchModule = loadCrunchModule;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _workerUtils = require("@loaders.gl/worker-utils");
function loadCrunchModule(_x) {
  return _loadCrunchModule.apply(this, arguments);
}
function _loadCrunchModule() {
  _loadCrunchModule = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(options) {
    var modules;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          modules = options.modules || {};
          if (!modules.crunch) {
            _context.next = 3;
            break;
          }
          return _context.abrupt("return", modules.crunch);
        case 3:
          return _context.abrupt("return", loadCrunch(options));
        case 4:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _loadCrunchModule.apply(this, arguments);
}
var crunchModule;
function loadCrunch(_x2) {
  return _loadCrunch.apply(this, arguments);
}
function _loadCrunch() {
  _loadCrunch = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(options) {
    var loadCrunchDecoder;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          if (!crunchModule) {
            _context2.next = 2;
            break;
          }
          return _context2.abrupt("return", crunchModule);
        case 2:
          _context2.next = 4;
          return (0, _workerUtils.loadLibrary)('crunch.js', 'textures', options);
        case 4:
          loadCrunchDecoder = _context2.sent;
          loadCrunchDecoder = loadCrunchDecoder || globalThis.LoadCrunchDecoder;
          crunchModule = loadCrunchDecoder();
          return _context2.abrupt("return", crunchModule);
        case 8:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _loadCrunch.apply(this, arguments);
}
//# sourceMappingURL=crunch-module-loader.js.map