"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ManagedArray = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _loaderUtils = require("@loaders.gl/loader-utils");
var ManagedArray = function () {
  function ManagedArray() {
    var length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    (0, _classCallCheck2.default)(this, ManagedArray);
    (0, _defineProperty2.default)(this, "_map", new Map());
    (0, _defineProperty2.default)(this, "_array", void 0);
    (0, _defineProperty2.default)(this, "_length", void 0);
    this._array = new Array(length);
    this._length = length;
  }
  (0, _createClass2.default)(ManagedArray, [{
    key: "length",
    get: function get() {
      return this._length;
    },
    set: function set(length) {
      this._length = length;
      if (length > this._array.length) {
        this._array.length = length;
      }
    }
  }, {
    key: "values",
    get: function get() {
      return this._array;
    }
  }, {
    key: "get",
    value: function get(index) {
      (0, _loaderUtils.assert)(index < this._array.length);
      return this._array[index];
    }
  }, {
    key: "set",
    value: function set(index, element) {
      (0, _loaderUtils.assert)(index >= 0);
      if (index >= this.length) {
        this.length = index + 1;
      }
      if (this._map.has(this._array[index])) {
        this._map.delete(this._array[index]);
      }
      this._array[index] = element;
      this._map.set(element, index);
    }
  }, {
    key: "delete",
    value: function _delete(element) {
      var index = this._map.get(element);
      if (index >= 0) {
        this._array.splice(index, 1);
        this._map.delete(element);
        this.length--;
      }
    }
  }, {
    key: "peek",
    value: function peek() {
      return this._array[this._length - 1];
    }
  }, {
    key: "push",
    value: function push(element) {
      if (!this._map.has(element)) {
        var index = this.length++;
        this._array[index] = element;
        this._map.set(element, index);
      }
    }
  }, {
    key: "pop",
    value: function pop() {
      var element = this._array[--this.length];
      this._map.delete(element);
      return element;
    }
  }, {
    key: "reserve",
    value: function reserve(length) {
      (0, _loaderUtils.assert)(length >= 0);
      if (length > this._array.length) {
        this._array.length = length;
      }
    }
  }, {
    key: "resize",
    value: function resize(length) {
      (0, _loaderUtils.assert)(length >= 0);
      this.length = length;
    }
  }, {
    key: "trim",
    value: function trim(length) {
      if (length === null || length === undefined) {
        length = this.length;
      }
      this._array.length = length;
    }
  }, {
    key: "reset",
    value: function reset() {
      this._array = [];
      this._map = new Map();
      this._length = 0;
    }
  }, {
    key: "find",
    value: function find(target) {
      return this._map.has(target);
    }
  }]);
  return ManagedArray;
}();
exports.ManagedArray = ManagedArray;
//# sourceMappingURL=managed-array.js.map