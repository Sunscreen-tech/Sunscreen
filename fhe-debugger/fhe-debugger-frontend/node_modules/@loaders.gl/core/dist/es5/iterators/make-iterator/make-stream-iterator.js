"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeStreamIterator = makeStreamIterator;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _awaitAsyncGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/awaitAsyncGenerator"));
var _wrapAsyncGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/wrapAsyncGenerator"));
var _loaderUtils = require("@loaders.gl/loader-utils");
function _asyncIterator(iterable) { var method, async, sync, retry = 2; for ("undefined" != typeof Symbol && (async = Symbol.asyncIterator, sync = Symbol.iterator); retry--;) { if (async && null != (method = iterable[async])) return method.call(iterable); if (sync && null != (method = iterable[sync])) return new AsyncFromSyncIterator(method.call(iterable)); async = "@@asyncIterator", sync = "@@iterator"; } throw new TypeError("Object is not async iterable"); }
function AsyncFromSyncIterator(s) { function AsyncFromSyncIteratorContinuation(r) { if (Object(r) !== r) return Promise.reject(new TypeError(r + " is not an object.")); var done = r.done; return Promise.resolve(r.value).then(function (value) { return { value: value, done: done }; }); } return AsyncFromSyncIterator = function AsyncFromSyncIterator(s) { this.s = s, this.n = s.next; }, AsyncFromSyncIterator.prototype = { s: null, n: null, next: function next() { return AsyncFromSyncIteratorContinuation(this.n.apply(this.s, arguments)); }, return: function _return(value) { var ret = this.s.return; return void 0 === ret ? Promise.resolve({ value: value, done: !0 }) : AsyncFromSyncIteratorContinuation(ret.apply(this.s, arguments)); }, throw: function _throw(value) { var thr = this.s.return; return void 0 === thr ? Promise.reject(value) : AsyncFromSyncIteratorContinuation(thr.apply(this.s, arguments)); } }, new AsyncFromSyncIterator(s); }
function makeStreamIterator(stream, options) {
  return _loaderUtils.isBrowser ? makeBrowserStreamIterator(stream, options) : makeNodeStreamIterator(stream, options);
}
function makeBrowserStreamIterator(_x, _x2) {
  return _makeBrowserStreamIterator.apply(this, arguments);
}
function _makeBrowserStreamIterator() {
  _makeBrowserStreamIterator = (0, _wrapAsyncGenerator2.default)(_regenerator.default.mark(function _callee(stream, options) {
    var reader, nextBatchPromise, currentBatchPromise, _yield$_awaitAsyncGen, done, value;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          reader = stream.getReader();
          _context.prev = 1;
        case 2:
          if (!true) {
            _context.next = 16;
            break;
          }
          currentBatchPromise = nextBatchPromise || reader.read();
          if (options !== null && options !== void 0 && options._streamReadAhead) {
            nextBatchPromise = reader.read();
          }
          _context.next = 7;
          return (0, _awaitAsyncGenerator2.default)(currentBatchPromise);
        case 7:
          _yield$_awaitAsyncGen = _context.sent;
          done = _yield$_awaitAsyncGen.done;
          value = _yield$_awaitAsyncGen.value;
          if (!done) {
            _context.next = 12;
            break;
          }
          return _context.abrupt("return");
        case 12:
          _context.next = 14;
          return (0, _loaderUtils.toArrayBuffer)(value);
        case 14:
          _context.next = 2;
          break;
        case 16:
          _context.next = 21;
          break;
        case 18:
          _context.prev = 18;
          _context.t0 = _context["catch"](1);
          reader.releaseLock();
        case 21:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[1, 18]]);
  }));
  return _makeBrowserStreamIterator.apply(this, arguments);
}
function makeNodeStreamIterator(_x3, _x4) {
  return _makeNodeStreamIterator.apply(this, arguments);
}
function _makeNodeStreamIterator() {
  _makeNodeStreamIterator = (0, _wrapAsyncGenerator2.default)(_regenerator.default.mark(function _callee2(stream, options) {
    var _iteratorAbruptCompletion, _didIteratorError, _iteratorError, _iterator, _step, chunk;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _iteratorAbruptCompletion = false;
          _didIteratorError = false;
          _context2.prev = 2;
          _iterator = _asyncIterator(stream);
        case 4:
          _context2.next = 6;
          return (0, _awaitAsyncGenerator2.default)(_iterator.next());
        case 6:
          if (!(_iteratorAbruptCompletion = !(_step = _context2.sent).done)) {
            _context2.next = 13;
            break;
          }
          chunk = _step.value;
          _context2.next = 10;
          return (0, _loaderUtils.toArrayBuffer)(chunk);
        case 10:
          _iteratorAbruptCompletion = false;
          _context2.next = 4;
          break;
        case 13:
          _context2.next = 19;
          break;
        case 15:
          _context2.prev = 15;
          _context2.t0 = _context2["catch"](2);
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
          return (0, _awaitAsyncGenerator2.default)(_iterator.return());
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
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[2, 15, 19, 29], [20,, 24, 28]]);
  }));
  return _makeNodeStreamIterator.apply(this, arguments);
}
//# sourceMappingURL=make-stream-iterator.js.map