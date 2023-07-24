"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseInBatches = parseInBatches;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _wrapAsyncGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/wrapAsyncGenerator"));
var _awaitAsyncGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/awaitAsyncGenerator"));
var _asyncGeneratorDelegate2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncGeneratorDelegate"));
var _loaderUtils = require("@loaders.gl/loader-utils");
var _normalizeLoader = require("../loader-utils/normalize-loader");
var _optionUtils = require("../loader-utils/option-utils");
var _loaderContext = require("../loader-utils/loader-context");
var _getData = require("../loader-utils/get-data");
var _resourceUtils = require("../utils/resource-utils");
var _selectLoader = require("./select-loader");
var _parse = require("./parse");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _asyncIterator(iterable) { var method, async, sync, retry = 2; for ("undefined" != typeof Symbol && (async = Symbol.asyncIterator, sync = Symbol.iterator); retry--;) { if (async && null != (method = iterable[async])) return method.call(iterable); if (sync && null != (method = iterable[sync])) return new AsyncFromSyncIterator(method.call(iterable)); async = "@@asyncIterator", sync = "@@iterator"; } throw new TypeError("Object is not async iterable"); }
function AsyncFromSyncIterator(s) { function AsyncFromSyncIteratorContinuation(r) { if (Object(r) !== r) return Promise.reject(new TypeError(r + " is not an object.")); var done = r.done; return Promise.resolve(r.value).then(function (value) { return { value: value, done: done }; }); } return AsyncFromSyncIterator = function AsyncFromSyncIterator(s) { this.s = s, this.n = s.next; }, AsyncFromSyncIterator.prototype = { s: null, n: null, next: function next() { return AsyncFromSyncIteratorContinuation(this.n.apply(this.s, arguments)); }, return: function _return(value) { var ret = this.s.return; return void 0 === ret ? Promise.resolve({ value: value, done: !0 }) : AsyncFromSyncIteratorContinuation(ret.apply(this.s, arguments)); }, throw: function _throw(value) { var thr = this.s.return; return void 0 === thr ? Promise.reject(value) : AsyncFromSyncIteratorContinuation(thr.apply(this.s, arguments)); } }, new AsyncFromSyncIterator(s); }
function parseInBatches(_x2, _x3, _x4, _x5) {
  return _parseInBatches.apply(this, arguments);
}
function _parseInBatches() {
  _parseInBatches = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(data, loaders, options, context) {
    var loaderArray, url, loader;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          (0, _loaderUtils.assert)(!context || (0, _typeof2.default)(context) === 'object');
          loaderArray = Array.isArray(loaders) ? loaders : undefined;
          if (!Array.isArray(loaders) && !(0, _normalizeLoader.isLoaderObject)(loaders)) {
            context = undefined;
            options = loaders;
            loaders = undefined;
          }
          _context.next = 5;
          return data;
        case 5:
          data = _context.sent;
          options = options || {};
          url = (0, _resourceUtils.getResourceUrl)(data);
          _context.next = 10;
          return (0, _selectLoader.selectLoader)(data, loaders, options);
        case 10:
          loader = _context.sent;
          if (loader) {
            _context.next = 13;
            break;
          }
          return _context.abrupt("return", null);
        case 13:
          options = (0, _optionUtils.normalizeOptions)(options, loader, loaderArray, url);
          context = (0, _loaderContext.getLoaderContext)({
            url: url,
            parseInBatches: parseInBatches,
            parse: _parse.parse,
            loaders: loaderArray
          }, options, context || null);
          _context.next = 17;
          return parseWithLoaderInBatches(loader, data, options, context);
        case 17:
          return _context.abrupt("return", _context.sent);
        case 18:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _parseInBatches.apply(this, arguments);
}
function parseWithLoaderInBatches(_x6, _x7, _x8, _x9) {
  return _parseWithLoaderInBatches.apply(this, arguments);
}
function _parseWithLoaderInBatches() {
  _parseWithLoaderInBatches = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(loader, data, options, context) {
    var outputIterator, metadataBatch, makeMetadataBatchIterator, _makeMetadataBatchIterator;
    return _regenerator.default.wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _makeMetadataBatchIterator = function _makeMetadataBatchIte2() {
            _makeMetadataBatchIterator = (0, _wrapAsyncGenerator2.default)(_regenerator.default.mark(function _callee2(iterator) {
              return _regenerator.default.wrap(function _callee2$(_context2) {
                while (1) switch (_context2.prev = _context2.next) {
                  case 0:
                    _context2.next = 2;
                    return metadataBatch;
                  case 2:
                    return _context2.delegateYield((0, _asyncGeneratorDelegate2.default)(_asyncIterator(iterator), _awaitAsyncGenerator2.default), "t0", 3);
                  case 3:
                  case "end":
                    return _context2.stop();
                }
              }, _callee2);
            }));
            return _makeMetadataBatchIterator.apply(this, arguments);
          };
          makeMetadataBatchIterator = function _makeMetadataBatchIte(_x) {
            return _makeMetadataBatchIterator.apply(this, arguments);
          };
          _context3.next = 4;
          return parseToOutputIterator(loader, data, options, context);
        case 4:
          outputIterator = _context3.sent;
          if (options.metadata) {
            _context3.next = 7;
            break;
          }
          return _context3.abrupt("return", outputIterator);
        case 7:
          metadataBatch = {
            batchType: 'metadata',
            metadata: {
              _loader: loader,
              _context: context
            },
            data: [],
            bytesUsed: 0
          };
          return _context3.abrupt("return", makeMetadataBatchIterator(outputIterator));
        case 9:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _parseWithLoaderInBatches.apply(this, arguments);
}
function parseToOutputIterator(_x10, _x11, _x12, _x13) {
  return _parseToOutputIterator.apply(this, arguments);
}
function _parseToOutputIterator() {
  _parseToOutputIterator = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee5(loader, data, options, context) {
    var inputIterator, transformedIterator, parseChunkInBatches, _parseChunkInBatches;
    return _regenerator.default.wrap(function _callee5$(_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          _parseChunkInBatches = function _parseChunkInBatches3() {
            _parseChunkInBatches = (0, _wrapAsyncGenerator2.default)(_regenerator.default.mark(function _callee4() {
              var arrayBuffer, parsedData, batch;
              return _regenerator.default.wrap(function _callee4$(_context4) {
                while (1) switch (_context4.prev = _context4.next) {
                  case 0:
                    _context4.next = 2;
                    return (0, _awaitAsyncGenerator2.default)((0, _loaderUtils.concatenateArrayBuffersAsync)(transformedIterator));
                  case 2:
                    arrayBuffer = _context4.sent;
                    _context4.next = 5;
                    return (0, _awaitAsyncGenerator2.default)((0, _parse.parse)(arrayBuffer, loader, _objectSpread(_objectSpread({}, options), {}, {
                      mimeType: loader.mimeTypes[0]
                    }), context));
                  case 5:
                    parsedData = _context4.sent;
                    batch = {
                      mimeType: loader.mimeTypes[0],
                      shape: Array.isArray(parsedData) ? 'row-table' : 'unknown',
                      batchType: 'data',
                      data: parsedData,
                      length: Array.isArray(parsedData) ? parsedData.length : 1
                    };
                    _context4.next = 9;
                    return batch;
                  case 9:
                  case "end":
                    return _context4.stop();
                }
              }, _callee4);
            }));
            return _parseChunkInBatches.apply(this, arguments);
          };
          parseChunkInBatches = function _parseChunkInBatches2() {
            return _parseChunkInBatches.apply(this, arguments);
          };
          _context5.next = 4;
          return (0, _getData.getAsyncIterableFromData)(data, options);
        case 4:
          inputIterator = _context5.sent;
          _context5.next = 7;
          return applyInputTransforms(inputIterator, (options === null || options === void 0 ? void 0 : options.transforms) || []);
        case 7:
          transformedIterator = _context5.sent;
          if (!loader.parseInBatches) {
            _context5.next = 10;
            break;
          }
          return _context5.abrupt("return", loader.parseInBatches(transformedIterator, options, context));
        case 10:
          return _context5.abrupt("return", parseChunkInBatches());
        case 11:
        case "end":
          return _context5.stop();
      }
    }, _callee5);
  }));
  return _parseToOutputIterator.apply(this, arguments);
}
function applyInputTransforms(_x14) {
  return _applyInputTransforms.apply(this, arguments);
}
function _applyInputTransforms() {
  _applyInputTransforms = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee6(inputIterator) {
    var transforms,
      iteratorChain,
      _iteratorAbruptCompletion,
      _didIteratorError,
      _iteratorError,
      _iterator,
      _step,
      transformBatches,
      _args6 = arguments;
    return _regenerator.default.wrap(function _callee6$(_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          transforms = _args6.length > 1 && _args6[1] !== undefined ? _args6[1] : [];
          iteratorChain = inputIterator;
          _iteratorAbruptCompletion = false;
          _didIteratorError = false;
          _context6.prev = 4;
          _iterator = _asyncIterator(transforms);
        case 6:
          _context6.next = 8;
          return _iterator.next();
        case 8:
          if (!(_iteratorAbruptCompletion = !(_step = _context6.sent).done)) {
            _context6.next = 14;
            break;
          }
          transformBatches = _step.value;
          iteratorChain = transformBatches(iteratorChain);
        case 11:
          _iteratorAbruptCompletion = false;
          _context6.next = 6;
          break;
        case 14:
          _context6.next = 20;
          break;
        case 16:
          _context6.prev = 16;
          _context6.t0 = _context6["catch"](4);
          _didIteratorError = true;
          _iteratorError = _context6.t0;
        case 20:
          _context6.prev = 20;
          _context6.prev = 21;
          if (!(_iteratorAbruptCompletion && _iterator.return != null)) {
            _context6.next = 25;
            break;
          }
          _context6.next = 25;
          return _iterator.return();
        case 25:
          _context6.prev = 25;
          if (!_didIteratorError) {
            _context6.next = 28;
            break;
          }
          throw _iteratorError;
        case 28:
          return _context6.finish(25);
        case 29:
          return _context6.finish(20);
        case 30:
          return _context6.abrupt("return", iteratorChain);
        case 31:
        case "end":
          return _context6.stop();
      }
    }, _callee6, null, [[4, 16, 20, 30], [21,, 25, 29]]);
  }));
  return _applyInputTransforms.apply(this, arguments);
}
//# sourceMappingURL=parse-in-batches.js.map