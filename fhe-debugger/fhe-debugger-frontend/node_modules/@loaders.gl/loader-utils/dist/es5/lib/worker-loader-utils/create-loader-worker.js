"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createLoaderWorker = createLoaderWorker;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _workerUtils = require("@loaders.gl/worker-utils");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var requestId = 0;
function createLoaderWorker(loader) {
  if (!_workerUtils.WorkerBody.inWorkerThread()) {
    return;
  }
  _workerUtils.WorkerBody.onmessage = function () {
    var _ref = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(type, payload) {
      var input, _payload$options, options, _payload$context, context, result, message;
      return _regenerator.default.wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.t0 = type;
            _context.next = _context.t0 === 'process' ? 3 : 16;
            break;
          case 3:
            _context.prev = 3;
            input = payload.input, _payload$options = payload.options, options = _payload$options === void 0 ? {} : _payload$options, _payload$context = payload.context, context = _payload$context === void 0 ? {} : _payload$context;
            _context.next = 7;
            return parseData({
              loader: loader,
              arrayBuffer: input,
              options: options,
              context: _objectSpread(_objectSpread({}, context), {}, {
                parse: parseOnMainThread
              })
            });
          case 7:
            result = _context.sent;
            _workerUtils.WorkerBody.postMessage('done', {
              result: result
            });
            _context.next = 15;
            break;
          case 11:
            _context.prev = 11;
            _context.t1 = _context["catch"](3);
            message = _context.t1 instanceof Error ? _context.t1.message : '';
            _workerUtils.WorkerBody.postMessage('error', {
              error: message
            });
          case 15:
            return _context.abrupt("break", 16);
          case 16:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[3, 11]]);
    }));
    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }();
}
function parseOnMainThread(arrayBuffer, options) {
  return new Promise(function (resolve, reject) {
    var id = requestId++;
    var onMessage = function onMessage(type, payload) {
      if (payload.id !== id) {
        return;
      }
      switch (type) {
        case 'done':
          _workerUtils.WorkerBody.removeEventListener(onMessage);
          resolve(payload.result);
          break;
        case 'error':
          _workerUtils.WorkerBody.removeEventListener(onMessage);
          reject(payload.error);
          break;
        default:
      }
    };
    _workerUtils.WorkerBody.addEventListener(onMessage);
    var payload = {
      id: id,
      input: arrayBuffer,
      options: options
    };
    _workerUtils.WorkerBody.postMessage('process', payload);
  });
}
function parseData(_x3) {
  return _parseData.apply(this, arguments);
}
function _parseData() {
  _parseData = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(_ref2) {
    var loader, arrayBuffer, options, context, data, parser, textDecoder;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          loader = _ref2.loader, arrayBuffer = _ref2.arrayBuffer, options = _ref2.options, context = _ref2.context;
          if (!(loader.parseSync || loader.parse)) {
            _context2.next = 6;
            break;
          }
          data = arrayBuffer;
          parser = loader.parseSync || loader.parse;
          _context2.next = 13;
          break;
        case 6:
          if (!loader.parseTextSync) {
            _context2.next = 12;
            break;
          }
          textDecoder = new TextDecoder();
          data = textDecoder.decode(arrayBuffer);
          parser = loader.parseTextSync;
          _context2.next = 13;
          break;
        case 12:
          throw new Error("Could not load data with ".concat(loader.name, " loader"));
        case 13:
          options = _objectSpread(_objectSpread({}, options), {}, {
            modules: loader && loader.options && loader.options.modules || {},
            worker: false
          });
          _context2.next = 16;
          return parser(data, _objectSpread({}, options), context, loader);
        case 16:
          return _context2.abrupt("return", _context2.sent);
        case 17:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _parseData.apply(this, arguments);
}
//# sourceMappingURL=create-loader-worker.js.map