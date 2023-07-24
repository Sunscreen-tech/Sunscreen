"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makePrimitiveIterator = makePrimitiveIterator;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _constants = require("../constants");
var _modes = require("../primitives/modes");
var _loaderUtils = require("@loaders.gl/loader-utils");
function makePrimitiveIterator(indices) {
  var attributes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var mode = arguments.length > 2 ? arguments[2] : undefined;
  var start = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
  var end = arguments.length > 4 ? arguments[4] : undefined;
  return _regenerator.default.mark(function _callee() {
    var info, i;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (indices) {
            indices = indices.values || indices.value || indices;
          }
          if (end === undefined) {
            end = indices ? indices.length : start;
          }
          info = {
            attributes: attributes,
            type: (0, _modes.getPrimitiveModeType)(mode),
            i1: 0,
            i2: 0,
            i3: 0
          };
          i = start;
        case 4:
          if (!(i < end)) {
            _context.next = 43;
            break;
          }
          _context.t0 = mode;
          _context.next = _context.t0 === _constants.GL.POINTS ? 8 : _context.t0 === _constants.GL.LINES ? 11 : _context.t0 === _constants.GL.LINE_STRIP ? 15 : _context.t0 === _constants.GL.LINE_LOOP ? 19 : _context.t0 === _constants.GL.TRIANGLES ? 23 : _context.t0 === _constants.GL.TRIANGLE_STRIP ? 28 : _context.t0 === _constants.GL.TRIANGLE_FAN ? 32 : 37;
          break;
        case 8:
          info.i1 = i;
          i += 1;
          return _context.abrupt("break", 38);
        case 11:
          info.i1 = i;
          info.i2 = i + 1;
          i += 2;
          return _context.abrupt("break", 38);
        case 15:
          info.i1 = i;
          info.i2 = i + 1;
          i += 1;
          return _context.abrupt("break", 38);
        case 19:
          info.i1 = i;
          info.i2 = i + 1;
          i += 1;
          return _context.abrupt("break", 38);
        case 23:
          info.i1 = i;
          info.i2 = i + 1;
          info.i3 = i + 2;
          i += 3;
          return _context.abrupt("break", 38);
        case 28:
          info.i1 = i;
          info.i2 = i + 1;
          i += 1;
          return _context.abrupt("break", 38);
        case 32:
          info.i1 = 1;
          info.i2 = i;
          info.i3 = i + 1;
          i += 1;
          return _context.abrupt("break", 38);
        case 37:
          (0, _loaderUtils.assert)(false);
        case 38:
          if (indices) {
            if ('i1' in info) {
              info.i1 = indices[info.i1];
              info.i2 = indices[info.i2];
              info.i3 = indices[info.i3];
            }
          }
          _context.next = 41;
          return info;
        case 41:
          _context.next = 4;
          break;
        case 43:
        case "end":
          return _context.stop();
      }
    }, _callee);
  })();
}
//# sourceMappingURL=primitive-iterator.js.map