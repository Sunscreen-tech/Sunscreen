"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeLineIterator = makeLineIterator;
exports.makeNumberedLineIterator = makeNumberedLineIterator;
exports.makeTextDecoderIterator = makeTextDecoderIterator;
exports.makeTextEncoderIterator = makeTextEncoderIterator;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _awaitAsyncGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/awaitAsyncGenerator"));
var _wrapAsyncGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/wrapAsyncGenerator"));
function _asyncIterator(iterable) { var method, async, sync, retry = 2; for ("undefined" != typeof Symbol && (async = Symbol.asyncIterator, sync = Symbol.iterator); retry--;) { if (async && null != (method = iterable[async])) return method.call(iterable); if (sync && null != (method = iterable[sync])) return new AsyncFromSyncIterator(method.call(iterable)); async = "@@asyncIterator", sync = "@@iterator"; } throw new TypeError("Object is not async iterable"); }
function AsyncFromSyncIterator(s) { function AsyncFromSyncIteratorContinuation(r) { if (Object(r) !== r) return Promise.reject(new TypeError(r + " is not an object.")); var done = r.done; return Promise.resolve(r.value).then(function (value) { return { value: value, done: done }; }); } return AsyncFromSyncIterator = function AsyncFromSyncIterator(s) { this.s = s, this.n = s.next; }, AsyncFromSyncIterator.prototype = { s: null, n: null, next: function next() { return AsyncFromSyncIteratorContinuation(this.n.apply(this.s, arguments)); }, return: function _return(value) { var ret = this.s.return; return void 0 === ret ? Promise.resolve({ value: value, done: !0 }) : AsyncFromSyncIteratorContinuation(ret.apply(this.s, arguments)); }, throw: function _throw(value) { var thr = this.s.return; return void 0 === thr ? Promise.reject(value) : AsyncFromSyncIteratorContinuation(thr.apply(this.s, arguments)); } }, new AsyncFromSyncIterator(s); }
function makeTextDecoderIterator(_x) {
  return _makeTextDecoderIterator.apply(this, arguments);
}
function _makeTextDecoderIterator() {
  _makeTextDecoderIterator = (0, _wrapAsyncGenerator2.default)(function (arrayBufferIterator) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return _regenerator.default.mark(function _callee() {
      var textDecoder, _iteratorAbruptCompletion, _didIteratorError, _iteratorError, _iterator, _step, arrayBuffer;
      return _regenerator.default.wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            textDecoder = new TextDecoder(undefined, options);
            _iteratorAbruptCompletion = false;
            _didIteratorError = false;
            _context.prev = 3;
            _iterator = _asyncIterator(arrayBufferIterator);
          case 5:
            _context.next = 7;
            return (0, _awaitAsyncGenerator2.default)(_iterator.next());
          case 7:
            if (!(_iteratorAbruptCompletion = !(_step = _context.sent).done)) {
              _context.next = 14;
              break;
            }
            arrayBuffer = _step.value;
            _context.next = 11;
            return typeof arrayBuffer === 'string' ? arrayBuffer : textDecoder.decode(arrayBuffer, {
              stream: true
            });
          case 11:
            _iteratorAbruptCompletion = false;
            _context.next = 5;
            break;
          case 14:
            _context.next = 20;
            break;
          case 16:
            _context.prev = 16;
            _context.t0 = _context["catch"](3);
            _didIteratorError = true;
            _iteratorError = _context.t0;
          case 20:
            _context.prev = 20;
            _context.prev = 21;
            if (!(_iteratorAbruptCompletion && _iterator.return != null)) {
              _context.next = 25;
              break;
            }
            _context.next = 25;
            return (0, _awaitAsyncGenerator2.default)(_iterator.return());
          case 25:
            _context.prev = 25;
            if (!_didIteratorError) {
              _context.next = 28;
              break;
            }
            throw _iteratorError;
          case 28:
            return _context.finish(25);
          case 29:
            return _context.finish(20);
          case 30:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[3, 16, 20, 30], [21,, 25, 29]]);
    })();
  });
  return _makeTextDecoderIterator.apply(this, arguments);
}
function makeTextEncoderIterator(_x2) {
  return _makeTextEncoderIterator.apply(this, arguments);
}
function _makeTextEncoderIterator() {
  _makeTextEncoderIterator = (0, _wrapAsyncGenerator2.default)(_regenerator.default.mark(function _callee2(textIterator) {
    var textEncoder, _iteratorAbruptCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, text;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          textEncoder = new TextEncoder();
          _iteratorAbruptCompletion2 = false;
          _didIteratorError2 = false;
          _context2.prev = 3;
          _iterator2 = _asyncIterator(textIterator);
        case 5:
          _context2.next = 7;
          return (0, _awaitAsyncGenerator2.default)(_iterator2.next());
        case 7:
          if (!(_iteratorAbruptCompletion2 = !(_step2 = _context2.sent).done)) {
            _context2.next = 14;
            break;
          }
          text = _step2.value;
          _context2.next = 11;
          return typeof text === 'string' ? textEncoder.encode(text) : text;
        case 11:
          _iteratorAbruptCompletion2 = false;
          _context2.next = 5;
          break;
        case 14:
          _context2.next = 20;
          break;
        case 16:
          _context2.prev = 16;
          _context2.t0 = _context2["catch"](3);
          _didIteratorError2 = true;
          _iteratorError2 = _context2.t0;
        case 20:
          _context2.prev = 20;
          _context2.prev = 21;
          if (!(_iteratorAbruptCompletion2 && _iterator2.return != null)) {
            _context2.next = 25;
            break;
          }
          _context2.next = 25;
          return (0, _awaitAsyncGenerator2.default)(_iterator2.return());
        case 25:
          _context2.prev = 25;
          if (!_didIteratorError2) {
            _context2.next = 28;
            break;
          }
          throw _iteratorError2;
        case 28:
          return _context2.finish(25);
        case 29:
          return _context2.finish(20);
        case 30:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[3, 16, 20, 30], [21,, 25, 29]]);
  }));
  return _makeTextEncoderIterator.apply(this, arguments);
}
function makeLineIterator(_x3) {
  return _makeLineIterator.apply(this, arguments);
}
function _makeLineIterator() {
  _makeLineIterator = (0, _wrapAsyncGenerator2.default)(_regenerator.default.mark(function _callee3(textIterator) {
    var previous, _iteratorAbruptCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, textChunk, eolIndex, line;
    return _regenerator.default.wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          previous = '';
          _iteratorAbruptCompletion3 = false;
          _didIteratorError3 = false;
          _context3.prev = 3;
          _iterator3 = _asyncIterator(textIterator);
        case 5:
          _context3.next = 7;
          return (0, _awaitAsyncGenerator2.default)(_iterator3.next());
        case 7:
          if (!(_iteratorAbruptCompletion3 = !(_step3 = _context3.sent).done)) {
            _context3.next = 21;
            break;
          }
          textChunk = _step3.value;
          previous += textChunk;
          eolIndex = void 0;
        case 11:
          if (!((eolIndex = previous.indexOf('\n')) >= 0)) {
            _context3.next = 18;
            break;
          }
          line = previous.slice(0, eolIndex + 1);
          previous = previous.slice(eolIndex + 1);
          _context3.next = 16;
          return line;
        case 16:
          _context3.next = 11;
          break;
        case 18:
          _iteratorAbruptCompletion3 = false;
          _context3.next = 5;
          break;
        case 21:
          _context3.next = 27;
          break;
        case 23:
          _context3.prev = 23;
          _context3.t0 = _context3["catch"](3);
          _didIteratorError3 = true;
          _iteratorError3 = _context3.t0;
        case 27:
          _context3.prev = 27;
          _context3.prev = 28;
          if (!(_iteratorAbruptCompletion3 && _iterator3.return != null)) {
            _context3.next = 32;
            break;
          }
          _context3.next = 32;
          return (0, _awaitAsyncGenerator2.default)(_iterator3.return());
        case 32:
          _context3.prev = 32;
          if (!_didIteratorError3) {
            _context3.next = 35;
            break;
          }
          throw _iteratorError3;
        case 35:
          return _context3.finish(32);
        case 36:
          return _context3.finish(27);
        case 37:
          if (!(previous.length > 0)) {
            _context3.next = 40;
            break;
          }
          _context3.next = 40;
          return previous;
        case 40:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[3, 23, 27, 37], [28,, 32, 36]]);
  }));
  return _makeLineIterator.apply(this, arguments);
}
function makeNumberedLineIterator(_x4) {
  return _makeNumberedLineIterator.apply(this, arguments);
}
function _makeNumberedLineIterator() {
  _makeNumberedLineIterator = (0, _wrapAsyncGenerator2.default)(_regenerator.default.mark(function _callee4(lineIterator) {
    var counter, _iteratorAbruptCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, line;
    return _regenerator.default.wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          counter = 1;
          _iteratorAbruptCompletion4 = false;
          _didIteratorError4 = false;
          _context4.prev = 3;
          _iterator4 = _asyncIterator(lineIterator);
        case 5:
          _context4.next = 7;
          return (0, _awaitAsyncGenerator2.default)(_iterator4.next());
        case 7:
          if (!(_iteratorAbruptCompletion4 = !(_step4 = _context4.sent).done)) {
            _context4.next = 15;
            break;
          }
          line = _step4.value;
          _context4.next = 11;
          return {
            counter: counter,
            line: line
          };
        case 11:
          counter++;
        case 12:
          _iteratorAbruptCompletion4 = false;
          _context4.next = 5;
          break;
        case 15:
          _context4.next = 21;
          break;
        case 17:
          _context4.prev = 17;
          _context4.t0 = _context4["catch"](3);
          _didIteratorError4 = true;
          _iteratorError4 = _context4.t0;
        case 21:
          _context4.prev = 21;
          _context4.prev = 22;
          if (!(_iteratorAbruptCompletion4 && _iterator4.return != null)) {
            _context4.next = 26;
            break;
          }
          _context4.next = 26;
          return (0, _awaitAsyncGenerator2.default)(_iterator4.return());
        case 26:
          _context4.prev = 26;
          if (!_didIteratorError4) {
            _context4.next = 29;
            break;
          }
          throw _iteratorError4;
        case 29:
          return _context4.finish(26);
        case 30:
          return _context4.finish(21);
        case 31:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[3, 17, 21, 31], [22,, 26, 30]]);
  }));
  return _makeNumberedLineIterator.apply(this, arguments);
}
//# sourceMappingURL=text-iterators.js.map