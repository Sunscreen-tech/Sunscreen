"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DataSource = void 0;
exports.getFetchFunction = getFetchFunction;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var DataSource = function () {
  function DataSource(props) {
    (0, _classCallCheck2.default)(this, DataSource);
    (0, _defineProperty2.default)(this, "fetch", void 0);
    (0, _defineProperty2.default)(this, "loadOptions", void 0);
    (0, _defineProperty2.default)(this, "_needsRefresh", true);
    (0, _defineProperty2.default)(this, "props", void 0);
    this.props = _objectSpread({}, props);
    this.loadOptions = _objectSpread({}, props.loadOptions);
    this.fetch = getFetchFunction(this.loadOptions);
  }
  (0, _createClass2.default)(DataSource, [{
    key: "setProps",
    value: function setProps(props) {
      this.props = Object.assign(this.props, props);
      this.setNeedsRefresh();
    }
  }, {
    key: "setNeedsRefresh",
    value: function setNeedsRefresh() {
      this._needsRefresh = true;
    }
  }, {
    key: "getNeedsRefresh",
    value: function getNeedsRefresh() {
      var clear = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
      var needsRefresh = this._needsRefresh;
      if (clear) {
        this._needsRefresh = false;
      }
      return needsRefresh;
    }
  }]);
  return DataSource;
}();
exports.DataSource = DataSource;
function getFetchFunction(options) {
  var fetchFunction = options === null || options === void 0 ? void 0 : options.fetch;
  if (fetchFunction && typeof fetchFunction === 'function') {
    return function (url, fetchOptions) {
      return fetchFunction(url, fetchOptions);
    };
  }
  var fetchOptions = options === null || options === void 0 ? void 0 : options.fetch;
  if (fetchOptions && typeof fetchOptions !== 'function') {
    return function (url) {
      return fetch(url, fetchOptions);
    };
  }
  return function (url) {
    return fetch(url);
  };
}
//# sourceMappingURL=data-source.js.map