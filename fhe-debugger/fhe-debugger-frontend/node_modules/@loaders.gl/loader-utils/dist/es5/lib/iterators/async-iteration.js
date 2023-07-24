"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.concatenateArrayBuffersAsync = concatenateArrayBuffersAsync;
exports.concatenateStringsAsync = concatenateStringsAsync;
exports.forEach = forEach;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _arrayBufferUtils = require("../binary-utils/array-buffer-utils");
function _asyncIterator(iterable) { var method, async, sync, retry = 2; for ("undefined" != typeof Symbol && (async = Symbol.asyncIterator, sync = Symbol.iterator); retry--;) { if (async && null != (method = iterable[async])) return method.call(iterable); if (sync && null != (method = iterable[sync])) return new AsyncFromSyncIterator(method.call(iterable)); async = "@@asyncIterator", sync = "@@iterator"; } throw new TypeError("Object is not async iterable"); }
function AsyncFromSyncIterator(s) { function AsyncFromSyncIteratorContinuation(r) { if (Object(r) !== r) return Promise.reject(new TypeError(r + " is not an object.")); var done = r.done; return Promise.resolve(r.value).then(function (value) { return { value: value, done: done }; }); } return AsyncFromSyncIterator = function AsyncFromSyncIterator(s) { this.s = s, this.n = s.next; }, AsyncFromSyncIterator.prototype = { s: null, n: null, next: function next() { return AsyncFromSyncIteratorContinuation(this.n.apply(this.s, arguments)); }, return: function _return(value) { var ret = this.s.return; return void 0 === ret ? Promise.resolve({ value: value, done: !0 }) : AsyncFromSyncIteratorContinuation(ret.apply(this.s, arguments)); }, throw: function _throw(value) { var thr = this.s.return; return void 0 === thr ? Promise.reject(value) : AsyncFromSyncIteratorContinuation(thr.apply(this.s, arguments)); } }, new AsyncFromSyncIterator(s); }
function forEach(_x, _x2) {
  return _forEach.apply(this, arguments);
}
function _forEach() {
  _forEach = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(iterator, visitor) {
    var _yield$iterator$next, done, value, cancel;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!true) {
            _context.next = 14;
            break;
          }
          _context.next = 3;
          return iterator.next();
        case 3:
          _yield$iterator$next = _context.sent;
          done = _yield$iterator$next.done;
          value = _yield$iterator$next.value;
          if (!done) {
            _context.next = 9;
            break;
          }
          iterator.return();
          return _context.abrupt("return");
        case 9:
          cancel = visitor(value);
          if (!cancel) {
            _context.next = 12;
            break;
          }
          return _context.abrupt("return");
        case 12:
          _context.next = 0;
          break;
        case 14:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _forEach.apply(this, arguments);
}
function concatenateArrayBuffersAsync(_x3) {
  return _concatenateArrayBuffersAsync.apply(this, arguments);
}
function _concatenateArrayBuffersAsync() {
  _concatenateArrayBuffersAsync = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(asyncIterator) {
    var arrayBuffers, _iteratorAbruptCompletion, _didIteratorError, _iteratorError, _iterator, _step, chunk;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          arrayBuffers = [];
          _iteratorAbruptCompletion = false;
          _didIteratorError = false;
          _context2.prev = 3;
          _iterator = _asyncIterator(asyncIterator);
        case 5:
          _context2.next = 7;
          return _iterator.next();
        case 7:
          if (!(_iteratorAbruptCompletion = !(_step = _context2.sent).done)) {
            _context2.next = 13;
            break;
          }
          chunk = _step.value;
          arrayBuffers.push(chunk);
        case 10:
          _iteratorAbruptCompletion = false;
          _context2.next = 5;
          break;
        case 13:
          _context2.next = 19;
          break;
        case 15:
          _context2.prev = 15;
          _context2.t0 = _context2["catch"](3);
          _didIteratorError = true;
          _iteratorError = _context2.t0;
        case 19:
          _context2.prev = 19;
          _context2.prev = 20;
          if (!(_iteratorAbruptCompletion && _iterator.return != null)) {
            _context2.next = 24;
            break;
          }
          _context2.next = 24;
          return _iterator.return();
        case 24:
          _context2.prev = 24;
          if (!_didIteratorError) {
            _context2.next = 27;
            break;
          }
          throw _iteratorError;
        case 27:
          return _context2.finish(24);
        case 28:
          return _context2.finish(19);
        case 29:
          return _context2.abrupt("return", _arrayBufferUtils.concatenateArrayBuffers.apply(void 0, arrayBuffers));
        case 30:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[3, 15, 19, 29], [20,, 24, 28]]);
  }));
  return _concatenateArrayBuffersAsync.apply(this, arguments);
}
function concatenateStringsAsync(_x4) {
  return _concatenateStringsAsync.apply(this, arguments);
}
function _concatenateStringsAsync() {
  _concatenateStringsAsync = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(asyncIterator) {
    var strings, _iteratorAbruptCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, chunk;
    return _regenerator.default.wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          strings = [];
          _iteratorAbruptCompletion2 = false;
          _didIteratorError2 = false;
          _context3.prev = 3;
          _iterator2 = _asyncIterator(asyncIterator);
        case 5:
          _context3.next = 7;
          return _iterator2.next();
        case 7:
          if (!(_iteratorAbruptCompletion2 = !(_step2 = _context3.sent).done)) {
            _context3.next = 13;
            break;
          }
          chunk = _step2.value;
          strings.push(chunk);
        case 10:
          _iteratorAbruptCompletion2 = false;
          _context3.next = 5;
          break;
        case 13:
          _context3.next = 19;
          break;
        case 15:
          _context3.prev = 15;
          _context3.t0 = _context3["catch"](3);
          _didIteratorError2 = true;
          _iteratorError2 = _context3.t0;
        case 19:
          _context3.prev = 19;
          _context3.prev = 20;
          if (!(_iteratorAbruptCompletion2 && _iterator2.return != null)) {
            _context3.next = 24;
            break;
          }
          _context3.next = 24;
          return _iterator2.return();
        case 24:
          _context3.prev = 24;
          if (!_didIteratorError2) {
            _context3.next = 27;
            break;
          }
          throw _iteratorError2;
        case 27:
          return _context3.finish(24);
        case 28:
          return _context3.finish(19);
        case 29:
          return _context3.abrupt("return", strings.join(''));
        case 30:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[3, 15, 19, 29], [20,, 24, 28]]);
  }));
  return _concatenateStringsAsync.apply(this, arguments);
}
//# sourceMappingURL=async-iteration.js.map