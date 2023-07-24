"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deepLoad = deepLoad;
exports.shallowLoad = shallowLoad;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _asyncDeepMap = require("./async-deep-map");
function deepLoad(_x, _x2, _x3) {
  return _deepLoad.apply(this, arguments);
}
function _deepLoad() {
  _deepLoad = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(urlTree, load, options) {
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return (0, _asyncDeepMap.asyncDeepMap)(urlTree, function (url) {
            return shallowLoad(url, load, options);
          });
        case 2:
          return _context.abrupt("return", _context.sent);
        case 3:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _deepLoad.apply(this, arguments);
}
function shallowLoad(_x4, _x5, _x6) {
  return _shallowLoad.apply(this, arguments);
}
function _shallowLoad() {
  _shallowLoad = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(url, load, options) {
    var response, arrayBuffer;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _context2.next = 2;
          return fetch(url, options.fetch);
        case 2:
          response = _context2.sent;
          _context2.next = 5;
          return response.arrayBuffer();
        case 5:
          arrayBuffer = _context2.sent;
          _context2.next = 8;
          return load(arrayBuffer, options);
        case 8:
          return _context2.abrupt("return", _context2.sent);
        case 9:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _shallowLoad.apply(this, arguments);
}
//# sourceMappingURL=deep-load.js.map