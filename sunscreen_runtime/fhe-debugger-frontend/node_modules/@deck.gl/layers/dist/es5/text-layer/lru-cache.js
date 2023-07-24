"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var LRUCache = function () {
  function LRUCache() {
    var limit = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 5;
    (0, _classCallCheck2.default)(this, LRUCache);
    (0, _defineProperty2.default)(this, "limit", void 0);
    (0, _defineProperty2.default)(this, "_cache", {});
    (0, _defineProperty2.default)(this, "_order", []);
    this.limit = limit;
  }

  (0, _createClass2.default)(LRUCache, [{
    key: "get",
    value: function get(key) {
      var value = this._cache[key];

      if (value) {
        this._deleteOrder(key);

        this._appendOrder(key);
      }

      return value;
    }
  }, {
    key: "set",
    value: function set(key, value) {
      if (!this._cache[key]) {
        if (Object.keys(this._cache).length === this.limit) {
          this.delete(this._order[0]);
        }

        this._cache[key] = value;

        this._appendOrder(key);
      } else {
        this.delete(key);
        this._cache[key] = value;

        this._appendOrder(key);
      }
    }
  }, {
    key: "delete",
    value: function _delete(key) {
      var value = this._cache[key];

      if (value) {
        delete this._cache[key];

        this._deleteOrder(key);
      }
    }
  }, {
    key: "_deleteOrder",
    value: function _deleteOrder(key) {
      var index = this._order.indexOf(key);

      if (index >= 0) {
        this._order.splice(index, 1);
      }
    }
  }, {
    key: "_appendOrder",
    value: function _appendOrder(key) {
      this._order.push(key);
    }
  }]);
  return LRUCache;
}();

exports.default = LRUCache;
//# sourceMappingURL=lru-cache.js.map