"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeStream = makeStream;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function makeStream(source, options) {
  var iterator = source[Symbol.asyncIterator] ? source[Symbol.asyncIterator]() : source[Symbol.iterator]();
  return new ReadableStream({
    type: 'bytes',
    pull: function pull(controller) {
      return (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee() {
        var _yield$iterator$next, done, value;
        return _regenerator.default.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              _context.prev = 0;
              _context.next = 3;
              return iterator.next();
            case 3:
              _yield$iterator$next = _context.sent;
              done = _yield$iterator$next.done;
              value = _yield$iterator$next.value;
              if (done) {
                controller.close();
              } else {
                controller.enqueue(new Uint8Array(value));
              }
              _context.next = 12;
              break;
            case 9:
              _context.prev = 9;
              _context.t0 = _context["catch"](0);
              controller.error(_context.t0);
            case 12:
            case "end":
              return _context.stop();
          }
        }, _callee, null, [[0, 9]]);
      }))();
    },
    cancel: function cancel() {
      return (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2() {
        var _iterator$return;
        return _regenerator.default.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return iterator === null || iterator === void 0 ? void 0 : (_iterator$return = iterator.return) === null || _iterator$return === void 0 ? void 0 : _iterator$return.call(iterator);
            case 2:
            case "end":
              return _context2.stop();
          }
        }, _callee2);
      }))();
    }
  }, _objectSpread({
    highWaterMark: Math.pow(2, 24)
  }, options));
}
//# sourceMappingURL=make-dom-stream.js.map