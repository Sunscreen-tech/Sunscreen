"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createWorker = createWorker;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _asyncQueue = _interopRequireDefault(require("../async-queue/async-queue"));
var _workerBody = _interopRequireDefault(require("../worker-farm/worker-body"));
function _asyncIterator(iterable) { var method, async, sync, retry = 2; for ("undefined" != typeof Symbol && (async = Symbol.asyncIterator, sync = Symbol.iterator); retry--;) { if (async && null != (method = iterable[async])) return method.call(iterable); if (sync && null != (method = iterable[sync])) return new AsyncFromSyncIterator(method.call(iterable)); async = "@@asyncIterator", sync = "@@iterator"; } throw new TypeError("Object is not async iterable"); }
function AsyncFromSyncIterator(s) { function AsyncFromSyncIteratorContinuation(r) { if (Object(r) !== r) return Promise.reject(new TypeError(r + " is not an object.")); var done = r.done; return Promise.resolve(r.value).then(function (value) { return { value: value, done: done }; }); } return AsyncFromSyncIterator = function AsyncFromSyncIterator(s) { this.s = s, this.n = s.next; }, AsyncFromSyncIterator.prototype = { s: null, n: null, next: function next() { return AsyncFromSyncIteratorContinuation(this.n.apply(this.s, arguments)); }, return: function _return(value) { var ret = this.s.return; return void 0 === ret ? Promise.resolve({ value: value, done: !0 }) : AsyncFromSyncIteratorContinuation(ret.apply(this.s, arguments)); }, throw: function _throw(value) { var thr = this.s.return; return void 0 === thr ? Promise.reject(value) : AsyncFromSyncIteratorContinuation(thr.apply(this.s, arguments)); } }, new AsyncFromSyncIterator(s); }
var requestId = 0;
var inputBatches;
var options;
function createWorker(process, processInBatches) {
  if (!_workerBody.default.inWorkerThread()) {
    return;
  }
  var context = {
    process: processOnMainThread
  };
  _workerBody.default.onmessage = function () {
    var _ref = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(type, payload) {
      var result, resultIterator, _iteratorAbruptCompletion, _didIteratorError, _iteratorError, _iterator, _step, batch, message;
      return _regenerator.default.wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.t0 = type;
            _context.next = _context.t0 === 'process' ? 4 : _context.t0 === 'process-in-batches' ? 11 : _context.t0 === 'input-batch' ? 46 : _context.t0 === 'input-done' ? 48 : 50;
            break;
          case 4:
            if (process) {
              _context.next = 6;
              break;
            }
            throw new Error('Worker does not support atomic processing');
          case 6:
            _context.next = 8;
            return process(payload.input, payload.options || {}, context);
          case 8:
            result = _context.sent;
            _workerBody.default.postMessage('done', {
              result: result
            });
            return _context.abrupt("break", 50);
          case 11:
            if (processInBatches) {
              _context.next = 13;
              break;
            }
            throw new Error('Worker does not support batched processing');
          case 13:
            inputBatches = new _asyncQueue.default();
            options = payload.options || {};
            resultIterator = processInBatches(inputBatches, options, context);
            _iteratorAbruptCompletion = false;
            _didIteratorError = false;
            _context.prev = 18;
            _iterator = _asyncIterator(resultIterator);
          case 20:
            _context.next = 22;
            return _iterator.next();
          case 22:
            if (!(_iteratorAbruptCompletion = !(_step = _context.sent).done)) {
              _context.next = 28;
              break;
            }
            batch = _step.value;
            _workerBody.default.postMessage('output-batch', {
              result: batch
            });
          case 25:
            _iteratorAbruptCompletion = false;
            _context.next = 20;
            break;
          case 28:
            _context.next = 34;
            break;
          case 30:
            _context.prev = 30;
            _context.t1 = _context["catch"](18);
            _didIteratorError = true;
            _iteratorError = _context.t1;
          case 34:
            _context.prev = 34;
            _context.prev = 35;
            if (!(_iteratorAbruptCompletion && _iterator.return != null)) {
              _context.next = 39;
              break;
            }
            _context.next = 39;
            return _iterator.return();
          case 39:
            _context.prev = 39;
            if (!_didIteratorError) {
              _context.next = 42;
              break;
            }
            throw _iteratorError;
          case 42:
            return _context.finish(39);
          case 43:
            return _context.finish(34);
          case 44:
            _workerBody.default.postMessage('done', {});
            return _context.abrupt("break", 50);
          case 46:
            inputBatches.push(payload.input);
            return _context.abrupt("break", 50);
          case 48:
            inputBatches.close();
            return _context.abrupt("break", 50);
          case 50:
            _context.next = 56;
            break;
          case 52:
            _context.prev = 52;
            _context.t2 = _context["catch"](0);
            message = _context.t2 instanceof Error ? _context.t2.message : '';
            _workerBody.default.postMessage('error', {
              error: message
            });
          case 56:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[0, 52], [18, 30, 34, 44], [35,, 39, 43]]);
    }));
    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }();
}
function processOnMainThread(arrayBuffer) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return new Promise(function (resolve, reject) {
    var id = requestId++;
    var onMessage = function onMessage(type, payload) {
      if (payload.id !== id) {
        return;
      }
      switch (type) {
        case 'done':
          _workerBody.default.removeEventListener(onMessage);
          resolve(payload.result);
          break;
        case 'error':
          _workerBody.default.removeEventListener(onMessage);
          reject(payload.error);
          break;
        default:
      }
    };
    _workerBody.default.addEventListener(onMessage);
    var payload = {
      id: id,
      input: arrayBuffer,
      options: options
    };
    _workerBody.default.postMessage('process', payload);
  });
}
//# sourceMappingURL=create-worker.js.map