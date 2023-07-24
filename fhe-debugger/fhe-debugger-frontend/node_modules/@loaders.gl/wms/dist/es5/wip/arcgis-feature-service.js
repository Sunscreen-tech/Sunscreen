"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ArcGISFeatureService = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var ArcGISFeatureService = function () {
  function ArcGISFeatureService(props) {
    (0, _classCallCheck2.default)(this, ArcGISFeatureService);
    (0, _defineProperty2.default)(this, "url", void 0);
    (0, _defineProperty2.default)(this, "loadOptions", void 0);
    (0, _defineProperty2.default)(this, "fetch", void 0);
    this.url = props.url;
    this.loadOptions = props.loadOptions || {};
    this.fetch = props.fetch || fetch;
  }
  (0, _createClass2.default)(ArcGISFeatureService, [{
    key: "metadataURL",
    value: function metadataURL(options) {
      return this.getUrl(_objectSpread({}, options));
    }
  }, {
    key: "exportImageURL",
    value: function exportImageURL(options) {
      var boundingBox = options.boundingBox;
      return this.getUrl({
        path: 'exportImage'
      });
    }
  }]);
  return ArcGISFeatureService;
}();
exports.ArcGISFeatureService = ArcGISFeatureService;
//# sourceMappingURL=arcgis-feature-service.js.map