"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.canProcessOnWorker = canProcessOnWorker;
exports.processOnWorker = processOnWorker;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _workerFarm = _interopRequireDefault(require("../worker-farm/worker-farm"));
var _getWorkerUrl = require("./get-worker-url");
var _getTransferList = require("../worker-utils/get-transfer-list");
function canProcessOnWorker(worker, options) {
  if (!_workerFarm.default.isSupported()) {
    return false;
  }
  return worker.worker && (options === null || options === void 0 ? void 0 : options.worker);
}
function processOnWorker(_x, _x2) {
  return _processOnWorker.apply(this, arguments);
}
function _processOnWorker() {
  _processOnWorker = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(worker, data) {
    var options,
      context,
      name,
      workerFarm,
      source,
      workerPoolProps,
      workerPool,
      jobName,
      job,
      transferableOptions,
      result,
      _args = arguments;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          options = _args.length > 2 && _args[2] !== undefined ? _args[2] : {};
          context = _args.length > 3 && _args[3] !== undefined ? _args[3] : {};
          name = (0, _getWorkerUrl.getWorkerName)(worker);
          workerFarm = _workerFarm.default.getWorkerFarm(options);
          source = options.source;
          workerPoolProps = {
            name: name,
            source: source
          };
          if (!source) {
            workerPoolProps.url = (0, _getWorkerUrl.getWorkerURL)(worker, options);
          }
          workerPool = workerFarm.getWorkerPool(workerPoolProps);
          jobName = options.jobName || worker.name;
          _context.next = 11;
          return workerPool.startJob(jobName, onMessage.bind(null, context));
        case 11:
          job = _context.sent;
          transferableOptions = (0, _getTransferList.getTransferListForWriter)(options);
          job.postMessage('process', {
            input: data,
            options: transferableOptions
          });
          _context.next = 16;
          return job.result;
        case 16:
          result = _context.sent;
          return _context.abrupt("return", result.result);
        case 18:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _processOnWorker.apply(this, arguments);
}
function onMessage(_x3, _x4, _x5, _x6) {
  return _onMessage.apply(this, arguments);
}
function _onMessage() {
  _onMessage = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(context, job, type, payload) {
    var id, input, options, result, message;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _context2.t0 = type;
          _context2.next = _context2.t0 === 'done' ? 3 : _context2.t0 === 'error' ? 5 : _context2.t0 === 'process' ? 7 : 23;
          break;
        case 3:
          job.done(payload);
          return _context2.abrupt("break", 24);
        case 5:
          job.error(new Error(payload.error));
          return _context2.abrupt("break", 24);
        case 7:
          id = payload.id, input = payload.input, options = payload.options;
          _context2.prev = 8;
          if (context.process) {
            _context2.next = 12;
            break;
          }
          job.postMessage('error', {
            id: id,
            error: 'Worker not set up to process on main thread'
          });
          return _context2.abrupt("return");
        case 12:
          _context2.next = 14;
          return context.process(input, options);
        case 14:
          result = _context2.sent;
          job.postMessage('done', {
            id: id,
            result: result
          });
          _context2.next = 22;
          break;
        case 18:
          _context2.prev = 18;
          _context2.t1 = _context2["catch"](8);
          message = _context2.t1 instanceof Error ? _context2.t1.message : 'unknown error';
          job.postMessage('error', {
            id: id,
            error: message
          });
        case 22:
          return _context2.abrupt("break", 24);
        case 23:
          console.warn("process-on-worker: unknown message ".concat(type));
        case 24:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[8, 18]]);
  }));
  return _onMessage.apply(this, arguments);
}
//# sourceMappingURL=process-on-worker.js.map