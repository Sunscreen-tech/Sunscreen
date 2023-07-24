"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
exports.takeAsync = takeAsync;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));
var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));
var _wrapNativeSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/wrapNativeSuper"));
var _Symbol$asyncIterator;
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
var ArrayQueue = function (_Array) {
  (0, _inherits2.default)(ArrayQueue, _Array);
  var _super = _createSuper(ArrayQueue);
  function ArrayQueue() {
    (0, _classCallCheck2.default)(this, ArrayQueue);
    return _super.apply(this, arguments);
  }
  (0, _createClass2.default)(ArrayQueue, [{
    key: "enqueue",
    value: function enqueue(value) {
      return this.push(value);
    }
  }, {
    key: "dequeue",
    value: function dequeue() {
      return this.shift();
    }
  }]);
  return ArrayQueue;
}((0, _wrapNativeSuper2.default)(Array));
_Symbol$asyncIterator = Symbol.asyncIterator;
var AsyncQueue = function () {
  function AsyncQueue() {
    (0, _classCallCheck2.default)(this, AsyncQueue);
    (0, _defineProperty2.default)(this, "_values", void 0);
    (0, _defineProperty2.default)(this, "_settlers", void 0);
    (0, _defineProperty2.default)(this, "_closed", void 0);
    this._values = new ArrayQueue();
    this._settlers = new ArrayQueue();
    this._closed = false;
  }
  (0, _createClass2.default)(AsyncQueue, [{
    key: "close",
    value: function close() {
      while (this._settlers.length > 0) {
        this._settlers.dequeue().resolve({
          done: true
        });
      }
      this._closed = true;
    }
  }, {
    key: _Symbol$asyncIterator,
    value: function value() {
      return this;
    }
  }, {
    key: "enqueue",
    value: function enqueue(value) {
      if (this._closed) {
        throw new Error('Closed');
      }
      if (this._settlers.length > 0) {
        if (this._values.length > 0) {
          throw new Error('Illegal internal state');
        }
        var settler = this._settlers.dequeue();
        if (value instanceof Error) {
          settler.reject(value);
        } else {
          settler.resolve({
            value: value
          });
        }
      } else {
        this._values.enqueue(value);
      }
    }
  }, {
    key: "next",
    value: function next() {
      var _this = this;
      if (this._values.length > 0) {
        var _value = this._values.dequeue();
        if (_value instanceof Error) {
          return Promise.reject(_value);
        }
        return Promise.resolve({
          value: _value
        });
      }
      if (this._closed) {
        if (this._settlers.length > 0) {
          throw new Error('Illegal internal state');
        }
        return Promise.resolve({
          done: true
        });
      }
      return new Promise(function (resolve, reject) {
        _this._settlers.enqueue({
          resolve: resolve,
          reject: reject
        });
      });
    }
  }]);
  return AsyncQueue;
}();
exports.default = AsyncQueue;
function takeAsync(_x) {
  return _takeAsync.apply(this, arguments);
}
function _takeAsync() {
  _takeAsync = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(asyncIterable) {
    var count,
      result,
      iterator,
      _yield$iterator$next,
      _value2,
      done,
      _args = arguments;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          count = _args.length > 1 && _args[1] !== undefined ? _args[1] : Infinity;
          result = [];
          iterator = asyncIterable[Symbol.asyncIterator]();
        case 3:
          if (!(result.length < count)) {
            _context.next = 14;
            break;
          }
          _context.next = 6;
          return iterator.next();
        case 6:
          _yield$iterator$next = _context.sent;
          _value2 = _yield$iterator$next.value;
          done = _yield$iterator$next.done;
          if (!done) {
            _context.next = 11;
            break;
          }
          return _context.abrupt("break", 14);
        case 11:
          result.push(_value2);
          _context.next = 3;
          break;
        case 14:
          return _context.abrupt("return", result);
        case 15:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _takeAsync.apply(this, arguments);
}
//# sourceMappingURL=async-queue.js.map