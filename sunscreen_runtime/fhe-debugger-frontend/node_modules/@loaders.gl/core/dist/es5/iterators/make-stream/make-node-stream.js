"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeStream = makeStream;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));
var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var Stream = _interopRequireWildcard(require("stream"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
var _Readable = (0, _createClass2.default)(function _Readable() {
  (0, _classCallCheck2.default)(this, _Readable);
});
var Readable = Stream.Readable || _Readable;
function makeStream(source, options) {
  var iterator = source[Symbol.asyncIterator] ? source[Symbol.asyncIterator]() : source[Symbol.iterator]();
  return new AsyncIterableReadable(iterator, options);
}
var AsyncIterableReadable = function (_Readable2) {
  (0, _inherits2.default)(AsyncIterableReadable, _Readable2);
  var _super = _createSuper(AsyncIterableReadable);
  function AsyncIterableReadable(it, options) {
    var _this;
    (0, _classCallCheck2.default)(this, AsyncIterableReadable);
    _this = _super.call(this, options);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "_pulling", void 0);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "_bytesMode", void 0);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "_iterator", void 0);
    _this._iterator = it;
    _this._pulling = false;
    _this._bytesMode = !options || !options.objectMode;
    return _this;
  }
  (0, _createClass2.default)(AsyncIterableReadable, [{
    key: "_read",
    value: function () {
      var _read2 = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(size) {
        return _regenerator.default.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              if (this._pulling) {
                _context.next = 5;
                break;
              }
              this._pulling = true;
              _context.next = 4;
              return this._pull(size, this._iterator);
            case 4:
              this._pulling = _context.sent;
            case 5:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function _read(_x) {
        return _read2.apply(this, arguments);
      }
      return _read;
    }()
  }, {
    key: "_destroy",
    value: function () {
      var _destroy2 = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(error, cb) {
        var _this$_iterator, _this$_iterator$throw, _this$_iterator2, _this$_iterator2$retu;
        return _regenerator.default.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              if (this._iterator) {
                _context2.next = 2;
                break;
              }
              return _context2.abrupt("return");
            case 2:
              if (!error) {
                _context2.next = 7;
                break;
              }
              _context2.next = 5;
              return (_this$_iterator = this._iterator) === null || _this$_iterator === void 0 ? void 0 : (_this$_iterator$throw = _this$_iterator.throw) === null || _this$_iterator$throw === void 0 ? void 0 : _this$_iterator$throw.call(_this$_iterator, error);
            case 5:
              _context2.next = 9;
              break;
            case 7:
              _context2.next = 9;
              return (_this$_iterator2 = this._iterator) === null || _this$_iterator2 === void 0 ? void 0 : (_this$_iterator2$retu = _this$_iterator2.return) === null || _this$_iterator2$retu === void 0 ? void 0 : _this$_iterator2$retu.call(_this$_iterator2, error);
            case 9:
              cb === null || cb === void 0 ? void 0 : cb(null);
            case 10:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function _destroy(_x2, _x3) {
        return _destroy2.apply(this, arguments);
      }
      return _destroy;
    }()
  }, {
    key: "_pull",
    value: function () {
      var _pull2 = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(size, it) {
        var _r;
        var bm, r, _it$return;
        return _regenerator.default.wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              bm = this._bytesMode;
              r = null;
            case 2:
              _context3.t0 = this.readable;
              if (!_context3.t0) {
                _context3.next = 7;
                break;
              }
              _context3.next = 6;
              return it.next();
            case 6:
              _context3.t0 = !(r = _context3.sent).done;
            case 7:
              if (!_context3.t0) {
                _context3.next = 13;
                break;
              }
              if (size !== null) {
                size -= bm && ArrayBuffer.isView(r.value) ? r.value.byteLength : 1;
              }
              if (!(!this.push(new Uint8Array(r.value)) || size <= 0)) {
                _context3.next = 11;
                break;
              }
              return _context3.abrupt("break", 13);
            case 11:
              _context3.next = 2;
              break;
            case 13:
              if (((_r = r) !== null && _r !== void 0 && _r.done || !this.readable) && (this.push(null) || true)) {
                it === null || it === void 0 ? void 0 : (_it$return = it.return) === null || _it$return === void 0 ? void 0 : _it$return.call(it);
              }
              return _context3.abrupt("return", !this.readable);
            case 15:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function _pull(_x4, _x5) {
        return _pull2.apply(this, arguments);
      }
      return _pull;
    }()
  }]);
  return AsyncIterableReadable;
}(Readable);
//# sourceMappingURL=make-node-stream.js.map