"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.canParseWithWorker = canParseWithWorker;
exports.parseWithWorker = parseWithWorker;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _workerUtils = require("@loaders.gl/worker-utils");
function canParseWithWorker(loader, options) {
  if (!_workerUtils.WorkerFarm.isSupported()) {
    return false;
  }
  if (!_workerUtils.isBrowser && !(options !== null && options !== void 0 && options._nodeWorkers)) {
    return false;
  }
  return loader.worker && (options === null || options === void 0 ? void 0 : options.worker);
}
function parseWithWorker(_x, _x2, _x3, _x4, _x5) {
  return _parseWithWorker.apply(this, arguments);
}
function _parseWithWorker() {
  _parseWithWorker = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(loader, data, options, context, parseOnMainThread) {
    var name, url, workerFarm, workerPool, job, result;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          name = loader.id;
          url = (0, _workerUtils.getWorkerURL)(loader, options);
          workerFarm = _workerUtils.WorkerFarm.getWorkerFarm(options);
          workerPool = workerFarm.getWorkerPool({
            name: name,
            url: url
          });
          options = JSON.parse(JSON.stringify(options));
          context = JSON.parse(JSON.stringify(context || {}));
          _context.next = 8;
          return workerPool.startJob('process-on-worker', onMessage.bind(null, parseOnMainThread));
        case 8:
          job = _context.sent;
          job.postMessage('process', {
            input: data,
            options: options,
            context: context
          });
          _context.next = 12;
          return job.result;
        case 12:
          result = _context.sent;
          _context.next = 15;
          return result.result;
        case 15:
          return _context.abrupt("return", _context.sent);
        case 16:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _parseWithWorker.apply(this, arguments);
}
function onMessage(_x6, _x7, _x8, _x9) {
  return _onMessage.apply(this, arguments);
}
function _onMessage() {
  _onMessage = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(parseOnMainThread, job, type, payload) {
    var id, input, _options, result, message;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _context2.t0 = type;
          _context2.next = _context2.t0 === 'done' ? 3 : _context2.t0 === 'error' ? 5 : _context2.t0 === 'process' ? 7 : 20;
          break;
        case 3:
          job.done(payload);
          return _context2.abrupt("break", 21);
        case 5:
          job.error(new Error(payload.error));
          return _context2.abrupt("break", 21);
        case 7:
          id = payload.id, input = payload.input, _options = payload.options;
          _context2.prev = 8;
          _context2.next = 11;
          return parseOnMainThread(input, _options);
        case 11:
          result = _context2.sent;
          job.postMessage('done', {
            id: id,
            result: result
          });
          _context2.next = 19;
          break;
        case 15:
          _context2.prev = 15;
          _context2.t1 = _context2["catch"](8);
          message = _context2.t1 instanceof Error ? _context2.t1.message : 'unknown error';
          job.postMessage('error', {
            id: id,
            error: message
          });
        case 19:
          return _context2.abrupt("break", 21);
        case 20:
          console.warn("parse-with-worker unknown message ".concat(type));
        case 21:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[8, 15]]);
  }));
  return _onMessage.apply(this, arguments);
}
//# sourceMappingURL=parse-with-worker.js.map