"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LocalStorage = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

function getStorage(type) {
  try {
    var storage = window[type];
    var x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return storage;
  } catch (e) {
    return null;
  }
}

var LocalStorage = function () {
  function LocalStorage(id, defaultConfig) {
    var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'sessionStorage';
    (0, _classCallCheck2.default)(this, LocalStorage);
    (0, _defineProperty2.default)(this, "storage", void 0);
    (0, _defineProperty2.default)(this, "id", void 0);
    (0, _defineProperty2.default)(this, "config", void 0);
    this.storage = getStorage(type);
    this.id = id;
    this.config = defaultConfig;

    this._loadConfiguration();
  }

  (0, _createClass2.default)(LocalStorage, [{
    key: "getConfiguration",
    value: function getConfiguration() {
      return this.config;
    }
  }, {
    key: "setConfiguration",
    value: function setConfiguration(configuration) {
      Object.assign(this.config, configuration);

      if (this.storage) {
        var serialized = JSON.stringify(this.config);
        this.storage.setItem(this.id, serialized);
      }
    }
  }, {
    key: "_loadConfiguration",
    value: function _loadConfiguration() {
      var configuration = {};

      if (this.storage) {
        var serializedConfiguration = this.storage.getItem(this.id);
        configuration = serializedConfiguration ? JSON.parse(serializedConfiguration) : {};
      }

      Object.assign(this.config, configuration);
      return this;
    }
  }]);
  return LocalStorage;
}();

exports.LocalStorage = LocalStorage;
//# sourceMappingURL=local-storage.js.map