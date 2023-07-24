"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.timedBatchIterator = timedBatchIterator;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _awaitAsyncGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/awaitAsyncGenerator"));
var _wrapAsyncGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/wrapAsyncGenerator"));
function _asyncIterator(iterable) { var method, async, sync, retry = 2; for ("undefined" != typeof Symbol && (async = Symbol.asyncIterator, sync = Symbol.iterator); retry--;) { if (async && null != (method = iterable[async])) return method.call(iterable); if (sync && null != (method = iterable[sync])) return new AsyncFromSyncIterator(method.call(iterable)); async = "@@asyncIterator", sync = "@@iterator"; } throw new TypeError("Object is not async iterable"); }
function AsyncFromSyncIterator(s) { function AsyncFromSyncIteratorContinuation(r) { if (Object(r) !== r) return Promise.reject(new TypeError(r + " is not an object.")); var done = r.done; return Promise.resolve(r.value).then(function (value) { return { value: value, done: done }; }); } return AsyncFromSyncIterator = function AsyncFromSyncIterator(s) { this.s = s, this.n = s.next; }, AsyncFromSyncIterator.prototype = { s: null, n: null, next: function next() { return AsyncFromSyncIteratorContinuation(this.n.apply(this.s, arguments)); }, return: function _return(value) { var ret = this.s.return; return void 0 === ret ? Promise.resolve({ value: value, done: !0 }) : AsyncFromSyncIteratorContinuation(ret.apply(this.s, arguments)); }, throw: function _throw(value) { var thr = this.s.return; return void 0 === thr ? Promise.reject(value) : AsyncFromSyncIteratorContinuation(thr.apply(this.s, arguments)); } }, new AsyncFromSyncIterator(s); }
function timedBatchIterator(_x, _x2) {
  return _timedBatchIterator.apply(this, arguments);
}
function _timedBatchIterator() {
  _timedBatchIterator = (0, _wrapAsyncGenerator2.default)(_regenerator.default.mark(function _callee(batchIterator, timeout) {
    var start, batches, _iteratorAbruptCompletion, _didIteratorError, _iteratorError, _iterator, _step, batch;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          start = Date.now();
          batches = [];
          _iteratorAbruptCompletion = false;
          _didIteratorError = false;
          _context.prev = 4;
          _iterator = _asyncIterator(batchIterator);
        case 6:
          _context.next = 8;
          return (0, _awaitAsyncGenerator2.default)(_iterator.next());
        case 8:
          if (!(_iteratorAbruptCompletion = !(_step = _context.sent).done)) {
            _context.next = 19;
            break;
          }
          batch = _step.value;
          batches.push(batch);
          if (!(Date.now() - start > timeout)) {
            _context.next = 16;
            break;
          }
          _context.next = 14;
          return batches;
        case 14:
          start = Date.now();
          batches = [];
        case 16:
          _iteratorAbruptCompletion = false;
          _context.next = 6;
          break;
        case 19:
          _context.next = 25;
          break;
        case 21:
          _context.prev = 21;
          _context.t0 = _context["catch"](4);
          _didIteratorError = true;
          _iteratorError = _context.t0;
        case 25:
          _context.prev = 25;
          _context.prev = 26;
          if (!(_iteratorAbruptCompletion && _iterator.return != null)) {
            _context.next = 30;
            break;
          }
          _context.next = 30;
          return (0, _awaitAsyncGenerator2.default)(_iterator.return());
        case 30:
          _context.prev = 30;
          if (!_didIteratorError) {
            _context.next = 33;
            break;
          }
          throw _iteratorError;
        case 33:
          return _context.finish(30);
        case 34:
          return _context.finish(25);
        case 35:
          if (!batches) {
            _context.next = 38;
            break;
          }
          _context.next = 38;
          return batches;
        case 38:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[4, 21, 25, 35], [26,, 30, 34]]);
  }));
  return _timedBatchIterator.apply(this, arguments);
}
//# sourceMappingURL=timed-batch-iterator.js.map