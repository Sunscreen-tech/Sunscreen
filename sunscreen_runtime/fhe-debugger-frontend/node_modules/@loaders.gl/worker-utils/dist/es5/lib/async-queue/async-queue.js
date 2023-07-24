"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _Symbol$asyncIterator;
_Symbol$asyncIterator = Symbol.asyncIterator;
var AsyncQueue = function () {
  function AsyncQueue() {
    (0, _classCallCheck2.default)(this, AsyncQueue);
    (0, _defineProperty2.default)(this, "_values", void 0);
    (0, _defineProperty2.default)(this, "_settlers", void 0);
    (0, _defineProperty2.default)(this, "_closed", void 0);
    this._values = [];
    this._settlers = [];
    this._closed = false;
  }
  (0, _createClass2.default)(AsyncQueue, [{
    key: _Symbol$asyncIterator,
    value: function value() {
      return this;
    }
  }, {
    key: "push",
    value: function push(value) {
      return this.enqueue(value);
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
        var settler = this._settlers.shift();
        if (value instanceof Error) {
          settler.reject(value);
        } else {
          settler.resolve({
            value: value
          });
        }
      } else {
        this._values.push(value);
      }
    }
  }, {
    key: "close",
    value: function close() {
      while (this._settlers.length > 0) {
        var settler = this._settlers.shift();
        settler.resolve({
          done: true
        });
      }
      this._closed = true;
    }
  }, {
    key: "next",
    value: function next() {
      var _this = this;
      if (this._values.length > 0) {
        var value = this._values.shift();
        if (value instanceof Error) {
          return Promise.reject(value);
        }
        return Promise.resolve({
          done: false,
          value: value
        });
      }
      if (this._closed) {
        if (this._settlers.length > 0) {
          throw new Error('Illegal internal state');
        }
        return Promise.resolve({
          done: true,
          value: undefined
        });
      }
      return new Promise(function (resolve, reject) {
        _this._settlers.push({
          resolve: resolve,
          reject: reject
        });
      });
    }
  }]);
  return AsyncQueue;
}();
exports.default = AsyncQueue;
//# sourceMappingURL=async-queue.js.map