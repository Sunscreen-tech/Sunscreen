"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encode = encode;
exports.encodeInBatches = encodeInBatches;
exports.encodeSync = encodeSync;
exports.encodeText = encodeText;
exports.encodeURLtoURL = encodeURLtoURL;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _loaderUtils = require("@loaders.gl/loader-utils");
var _workerUtils = require("@loaders.gl/worker-utils");
var _writeFile = require("../fetch/write-file");
var _fetchFile = require("../fetch/fetch-file");
var _loaderOptions = require("./loader-options");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _asyncIterator(iterable) { var method, async, sync, retry = 2; for ("undefined" != typeof Symbol && (async = Symbol.asyncIterator, sync = Symbol.iterator); retry--;) { if (async && null != (method = iterable[async])) return method.call(iterable); if (sync && null != (method = iterable[sync])) return new AsyncFromSyncIterator(method.call(iterable)); async = "@@asyncIterator", sync = "@@iterator"; } throw new TypeError("Object is not async iterable"); }
function AsyncFromSyncIterator(s) { function AsyncFromSyncIteratorContinuation(r) { if (Object(r) !== r) return Promise.reject(new TypeError(r + " is not an object.")); var done = r.done; return Promise.resolve(r.value).then(function (value) { return { value: value, done: done }; }); } return AsyncFromSyncIterator = function AsyncFromSyncIterator(s) { this.s = s, this.n = s.next; }, AsyncFromSyncIterator.prototype = { s: null, n: null, next: function next() { return AsyncFromSyncIteratorContinuation(this.n.apply(this.s, arguments)); }, return: function _return(value) { var ret = this.s.return; return void 0 === ret ? Promise.resolve({ value: value, done: !0 }) : AsyncFromSyncIteratorContinuation(ret.apply(this.s, arguments)); }, throw: function _throw(value) { var thr = this.s.return; return void 0 === thr ? Promise.reject(value) : AsyncFromSyncIteratorContinuation(thr.apply(this.s, arguments)); } }, new AsyncFromSyncIterator(s); }
function encode(_x, _x2, _x3) {
  return _encode.apply(this, arguments);
}
function _encode() {
  _encode = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(data, writer, options) {
    var globalOptions, batches, chunks, _iteratorAbruptCompletion, _didIteratorError, _iteratorError, _iterator, _step, batch, tmpInputFilename, tmpOutputFilename, outputFilename, response;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          globalOptions = (0, _loaderOptions.getLoaderOptions)();
          options = _objectSpread(_objectSpread({}, globalOptions), options);
          if (!(0, _loaderUtils.canEncodeWithWorker)(writer, options)) {
            _context.next = 6;
            break;
          }
          _context.next = 5;
          return (0, _workerUtils.processOnWorker)(writer, data, options);
        case 5:
          return _context.abrupt("return", _context.sent);
        case 6:
          if (!writer.encode) {
            _context.next = 10;
            break;
          }
          _context.next = 9;
          return writer.encode(data, options);
        case 9:
          return _context.abrupt("return", _context.sent);
        case 10:
          if (!writer.encodeSync) {
            _context.next = 12;
            break;
          }
          return _context.abrupt("return", writer.encodeSync(data, options));
        case 12:
          if (!writer.encodeText) {
            _context.next = 18;
            break;
          }
          _context.t0 = new TextEncoder();
          _context.next = 16;
          return writer.encodeText(data, options);
        case 16:
          _context.t1 = _context.sent;
          return _context.abrupt("return", _context.t0.encode.call(_context.t0, _context.t1));
        case 18:
          if (!writer.encodeInBatches) {
            _context.next = 50;
            break;
          }
          batches = encodeInBatches(data, writer, options);
          chunks = [];
          _iteratorAbruptCompletion = false;
          _didIteratorError = false;
          _context.prev = 23;
          _iterator = _asyncIterator(batches);
        case 25:
          _context.next = 27;
          return _iterator.next();
        case 27:
          if (!(_iteratorAbruptCompletion = !(_step = _context.sent).done)) {
            _context.next = 33;
            break;
          }
          batch = _step.value;
          chunks.push(batch);
        case 30:
          _iteratorAbruptCompletion = false;
          _context.next = 25;
          break;
        case 33:
          _context.next = 39;
          break;
        case 35:
          _context.prev = 35;
          _context.t2 = _context["catch"](23);
          _didIteratorError = true;
          _iteratorError = _context.t2;
        case 39:
          _context.prev = 39;
          _context.prev = 40;
          if (!(_iteratorAbruptCompletion && _iterator.return != null)) {
            _context.next = 44;
            break;
          }
          _context.next = 44;
          return _iterator.return();
        case 44:
          _context.prev = 44;
          if (!_didIteratorError) {
            _context.next = 47;
            break;
          }
          throw _iteratorError;
        case 47:
          return _context.finish(44);
        case 48:
          return _context.finish(39);
        case 49:
          return _context.abrupt("return", _loaderUtils.concatenateArrayBuffers.apply(void 0, chunks));
        case 50:
          if (!(!_loaderUtils.isBrowser && writer.encodeURLtoURL)) {
            _context.next = 62;
            break;
          }
          tmpInputFilename = getTemporaryFilename('input');
          _context.next = 54;
          return (0, _writeFile.writeFile)(tmpInputFilename, data);
        case 54:
          tmpOutputFilename = getTemporaryFilename('output');
          _context.next = 57;
          return encodeURLtoURL(tmpInputFilename, tmpOutputFilename, writer, options);
        case 57:
          outputFilename = _context.sent;
          _context.next = 60;
          return (0, _fetchFile.fetchFile)(outputFilename);
        case 60:
          response = _context.sent;
          return _context.abrupt("return", response.arrayBuffer());
        case 62:
          throw new Error('Writer could not encode data');
        case 63:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[23, 35, 39, 49], [40,, 44, 48]]);
  }));
  return _encode.apply(this, arguments);
}
function encodeSync(data, writer, options) {
  if (writer.encodeSync) {
    return writer.encodeSync(data, options);
  }
  throw new Error('Writer could not synchronously encode data');
}
function encodeText(_x4, _x5, _x6) {
  return _encodeText.apply(this, arguments);
}
function _encodeText() {
  _encodeText = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(data, writer, options) {
    var arrayBuffer;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          if (!(writer.text && writer.encodeText)) {
            _context2.next = 4;
            break;
          }
          _context2.next = 3;
          return writer.encodeText(data, options);
        case 3:
          return _context2.abrupt("return", _context2.sent);
        case 4:
          if (!(writer.text && (writer.encode || writer.encodeInBatches))) {
            _context2.next = 9;
            break;
          }
          _context2.next = 7;
          return encode(data, writer, options);
        case 7:
          arrayBuffer = _context2.sent;
          return _context2.abrupt("return", new TextDecoder().decode(arrayBuffer));
        case 9:
          throw new Error('Writer could not encode data as text');
        case 10:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _encodeText.apply(this, arguments);
}
function encodeInBatches(data, writer, options) {
  if (writer.encodeInBatches) {
    var dataIterator = getIterator(data);
    return writer.encodeInBatches(dataIterator, options);
  }
  throw new Error('Writer could not encode data in batches');
}
function encodeURLtoURL(_x7, _x8, _x9, _x10) {
  return _encodeURLtoURL.apply(this, arguments);
}
function _encodeURLtoURL() {
  _encodeURLtoURL = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(inputUrl, outputUrl, writer, options) {
    var outputFilename;
    return _regenerator.default.wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          inputUrl = (0, _loaderUtils.resolvePath)(inputUrl);
          outputUrl = (0, _loaderUtils.resolvePath)(outputUrl);
          if (!(_loaderUtils.isBrowser || !writer.encodeURLtoURL)) {
            _context3.next = 4;
            break;
          }
          throw new Error();
        case 4:
          _context3.next = 6;
          return writer.encodeURLtoURL(inputUrl, outputUrl, options);
        case 6:
          outputFilename = _context3.sent;
          return _context3.abrupt("return", outputFilename);
        case 8:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _encodeURLtoURL.apply(this, arguments);
}
function getIterator(data) {
  var dataIterator = [{
    table: data,
    start: 0,
    end: data.length
  }];
  return dataIterator;
}
function getTemporaryFilename(filename) {
  return "/tmp/".concat(filename);
}
//# sourceMappingURL=encode.js.map