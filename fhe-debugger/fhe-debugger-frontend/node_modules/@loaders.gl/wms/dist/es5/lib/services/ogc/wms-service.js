"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WMSService = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));
var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _images = require("@loaders.gl/images");
var _loaderUtils = require("@loaders.gl/loader-utils");
var _imageSource = require("../../sources/image-source");
var _wmsCapabilitiesLoader = require("../../../wms-capabilities-loader");
var _wmsFeatureInfoLoader = require("../../../wip/wms-feature-info-loader");
var _wmsLayerDescriptionLoader = require("../../../wip/wms-layer-description-loader");
var _wmsErrorLoader = require("../../../wms-error-loader");
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
var WMSService = function (_ImageSource) {
  (0, _inherits2.default)(WMSService, _ImageSource);
  var _super = _createSuper(WMSService);
  function WMSService(props) {
    var _props$substituteCRS;
    var _this;
    (0, _classCallCheck2.default)(this, WMSService);
    _this = _super.call(this, props);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "url", void 0);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "substituteCRS84", void 0);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "flipCRS", void 0);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "wmsParameters", void 0);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "vendorParameters", void 0);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "capabilities", null);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "loaders", [_images.ImageLoader, _wmsErrorLoader.WMSErrorLoader, _wmsCapabilitiesLoader.WMSCapabilitiesLoader, _wmsFeatureInfoLoader.WMSFeatureInfoLoader, _wmsLayerDescriptionLoader.WMSLayerDescriptionLoader]);
    _this.url = props.url;
    _this.substituteCRS84 = (_props$substituteCRS = props.substituteCRS84) !== null && _props$substituteCRS !== void 0 ? _props$substituteCRS : false;
    _this.flipCRS = ['EPSG:4326'];
    _this.wmsParameters = _objectSpread({
      layers: undefined,
      query_layers: undefined,
      styles: undefined,
      version: '1.3.0',
      crs: 'EPSG:4326',
      format: 'image/png',
      info_format: 'text/plain',
      transparent: undefined,
      time: undefined,
      elevation: undefined
    }, props.wmsParameters);
    _this.vendorParameters = props.vendorParameters || {};
    return _this;
  }
  (0, _createClass2.default)(WMSService, [{
    key: "getMetadata",
    value: function () {
      var _getMetadata = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee() {
        var capabilities;
        return _regenerator.default.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return this.getCapabilities();
            case 2:
              capabilities = _context.sent;
              return _context.abrupt("return", this.normalizeMetadata(capabilities));
            case 4:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function getMetadata() {
        return _getMetadata.apply(this, arguments);
      }
      return getMetadata;
    }()
  }, {
    key: "getImage",
    value: function () {
      var _getImage = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(parameters) {
        return _regenerator.default.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return this.getMap(parameters);
            case 2:
              return _context2.abrupt("return", _context2.sent);
            case 3:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function getImage(_x) {
        return _getImage.apply(this, arguments);
      }
      return getImage;
    }()
  }, {
    key: "normalizeMetadata",
    value: function normalizeMetadata(capabilities) {
      return capabilities;
    }
  }, {
    key: "getCapabilities",
    value: function () {
      var _getCapabilities = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(wmsParameters, vendorParameters) {
        var url, response, arrayBuffer, capabilities;
        return _regenerator.default.wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              url = this.getCapabilitiesURL(wmsParameters, vendorParameters);
              _context3.next = 3;
              return this.fetch(url);
            case 3:
              response = _context3.sent;
              _context3.next = 6;
              return response.arrayBuffer();
            case 6:
              arrayBuffer = _context3.sent;
              this._checkResponse(response, arrayBuffer);
              _context3.next = 10;
              return _wmsCapabilitiesLoader.WMSCapabilitiesLoader.parse(arrayBuffer, this.loadOptions);
            case 10:
              capabilities = _context3.sent;
              this.capabilities = capabilities;
              return _context3.abrupt("return", capabilities);
            case 13:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function getCapabilities(_x2, _x3) {
        return _getCapabilities.apply(this, arguments);
      }
      return getCapabilities;
    }()
  }, {
    key: "getMap",
    value: function () {
      var _getMap = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee4(wmsParameters, vendorParameters) {
        var url, response, arrayBuffer;
        return _regenerator.default.wrap(function _callee4$(_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              url = this.getMapURL(wmsParameters, vendorParameters);
              _context4.next = 3;
              return this.fetch(url);
            case 3:
              response = _context4.sent;
              _context4.next = 6;
              return response.arrayBuffer();
            case 6:
              arrayBuffer = _context4.sent;
              this._checkResponse(response, arrayBuffer);
              _context4.prev = 8;
              _context4.next = 11;
              return _images.ImageLoader.parse(arrayBuffer, this.loadOptions);
            case 11:
              return _context4.abrupt("return", _context4.sent);
            case 14:
              _context4.prev = 14;
              _context4.t0 = _context4["catch"](8);
              throw this._parseError(arrayBuffer);
            case 17:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this, [[8, 14]]);
      }));
      function getMap(_x4, _x5) {
        return _getMap.apply(this, arguments);
      }
      return getMap;
    }()
  }, {
    key: "getFeatureInfo",
    value: function () {
      var _getFeatureInfo = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee5(wmsParameters, vendorParameters) {
        var url, response, arrayBuffer;
        return _regenerator.default.wrap(function _callee5$(_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              url = this.getFeatureInfoURL(wmsParameters, vendorParameters);
              _context5.next = 3;
              return this.fetch(url);
            case 3:
              response = _context5.sent;
              _context5.next = 6;
              return response.arrayBuffer();
            case 6:
              arrayBuffer = _context5.sent;
              this._checkResponse(response, arrayBuffer);
              _context5.next = 10;
              return _wmsFeatureInfoLoader.WMSFeatureInfoLoader.parse(arrayBuffer, this.loadOptions);
            case 10:
              return _context5.abrupt("return", _context5.sent);
            case 11:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this);
      }));
      function getFeatureInfo(_x6, _x7) {
        return _getFeatureInfo.apply(this, arguments);
      }
      return getFeatureInfo;
    }()
  }, {
    key: "getFeatureInfoText",
    value: function () {
      var _getFeatureInfoText = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee6(wmsParameters, vendorParameters) {
        var url, response, arrayBuffer;
        return _regenerator.default.wrap(function _callee6$(_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              url = this.getFeatureInfoURL(wmsParameters, vendorParameters);
              _context6.next = 3;
              return this.fetch(url);
            case 3:
              response = _context6.sent;
              _context6.next = 6;
              return response.arrayBuffer();
            case 6:
              arrayBuffer = _context6.sent;
              this._checkResponse(response, arrayBuffer);
              return _context6.abrupt("return", new TextDecoder().decode(arrayBuffer));
            case 9:
            case "end":
              return _context6.stop();
          }
        }, _callee6, this);
      }));
      function getFeatureInfoText(_x8, _x9) {
        return _getFeatureInfoText.apply(this, arguments);
      }
      return getFeatureInfoText;
    }()
  }, {
    key: "describeLayer",
    value: function () {
      var _describeLayer = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee7(wmsParameters, vendorParameters) {
        var url, response, arrayBuffer;
        return _regenerator.default.wrap(function _callee7$(_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              url = this.describeLayerURL(wmsParameters, vendorParameters);
              _context7.next = 3;
              return this.fetch(url);
            case 3:
              response = _context7.sent;
              _context7.next = 6;
              return response.arrayBuffer();
            case 6:
              arrayBuffer = _context7.sent;
              this._checkResponse(response, arrayBuffer);
              _context7.next = 10;
              return _wmsLayerDescriptionLoader.WMSLayerDescriptionLoader.parse(arrayBuffer, this.loadOptions);
            case 10:
              return _context7.abrupt("return", _context7.sent);
            case 11:
            case "end":
              return _context7.stop();
          }
        }, _callee7, this);
      }));
      function describeLayer(_x10, _x11) {
        return _describeLayer.apply(this, arguments);
      }
      return describeLayer;
    }()
  }, {
    key: "getLegendGraphic",
    value: function () {
      var _getLegendGraphic = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee8(wmsParameters, vendorParameters) {
        var url, response, arrayBuffer;
        return _regenerator.default.wrap(function _callee8$(_context8) {
          while (1) switch (_context8.prev = _context8.next) {
            case 0:
              url = this.getLegendGraphicURL(wmsParameters, vendorParameters);
              _context8.next = 3;
              return this.fetch(url);
            case 3:
              response = _context8.sent;
              _context8.next = 6;
              return response.arrayBuffer();
            case 6:
              arrayBuffer = _context8.sent;
              this._checkResponse(response, arrayBuffer);
              _context8.prev = 8;
              _context8.next = 11;
              return _images.ImageLoader.parse(arrayBuffer, this.loadOptions);
            case 11:
              return _context8.abrupt("return", _context8.sent);
            case 14:
              _context8.prev = 14;
              _context8.t0 = _context8["catch"](8);
              throw this._parseError(arrayBuffer);
            case 17:
            case "end":
              return _context8.stop();
          }
        }, _callee8, this, [[8, 14]]);
      }));
      function getLegendGraphic(_x12, _x13) {
        return _getLegendGraphic.apply(this, arguments);
      }
      return getLegendGraphic;
    }()
  }, {
    key: "getCapabilitiesURL",
    value: function getCapabilitiesURL(wmsParameters, vendorParameters) {
      var options = _objectSpread({
        version: this.wmsParameters.version
      }, wmsParameters);
      return this._getWMSUrl('GetCapabilities', options, vendorParameters);
    }
  }, {
    key: "getMapURL",
    value: function getMapURL(wmsParameters, vendorParameters) {
      wmsParameters = this._getWMS130Parameters(wmsParameters);
      var options = _objectSpread({
        version: this.wmsParameters.version,
        format: this.wmsParameters.format,
        transparent: this.wmsParameters.transparent,
        time: this.wmsParameters.time,
        elevation: this.wmsParameters.elevation,
        layers: this.wmsParameters.layers,
        styles: this.wmsParameters.styles,
        crs: this.wmsParameters.crs
      }, wmsParameters);
      return this._getWMSUrl('GetMap', options, vendorParameters);
    }
  }, {
    key: "getFeatureInfoURL",
    value: function getFeatureInfoURL(wmsParameters, vendorParameters) {
      var options = _objectSpread({
        version: this.wmsParameters.version,
        info_format: this.wmsParameters.info_format,
        layers: this.wmsParameters.layers,
        query_layers: this.wmsParameters.query_layers,
        styles: this.wmsParameters.styles,
        crs: this.wmsParameters.crs
      }, wmsParameters);
      return this._getWMSUrl('GetFeatureInfo', options, vendorParameters);
    }
  }, {
    key: "describeLayerURL",
    value: function describeLayerURL(wmsParameters, vendorParameters) {
      var options = _objectSpread({
        version: this.wmsParameters.version
      }, wmsParameters);
      return this._getWMSUrl('DescribeLayer', options, vendorParameters);
    }
  }, {
    key: "getLegendGraphicURL",
    value: function getLegendGraphicURL(wmsParameters, vendorParameters) {
      var options = _objectSpread({
        version: this.wmsParameters.version
      }, wmsParameters);
      return this._getWMSUrl('GetLegendGraphic', options, vendorParameters);
    }
  }, {
    key: "_parseWMSUrl",
    value: function _parseWMSUrl(url) {
      var _url$split = url.split('?'),
        _url$split2 = (0, _slicedToArray2.default)(_url$split, 2),
        baseUrl = _url$split2[0],
        search = _url$split2[1];
      var searchParams = search.split('&');
      var parameters = {};
      var _iterator = _createForOfIteratorHelper(searchParams),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var parameter = _step.value;
          var _parameter$split = parameter.split('='),
            _parameter$split2 = (0, _slicedToArray2.default)(_parameter$split, 2),
            _key = _parameter$split2[0],
            value = _parameter$split2[1];
          parameters[_key] = value;
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      return {
        url: baseUrl,
        parameters: parameters
      };
    }
  }, {
    key: "_getWMSUrl",
    value: function _getWMSUrl(request, wmsParameters, vendorParameters) {
      var url = this.url;
      var first = true;
      var allParameters = _objectSpread(_objectSpread(_objectSpread({
        service: 'WMS',
        version: wmsParameters.version,
        request: request
      }, wmsParameters), this.vendorParameters), vendorParameters);
      var IGNORE_EMPTY_KEYS = ['transparent', 'time', 'elevation'];
      for (var _i = 0, _Object$entries = Object.entries(allParameters); _i < _Object$entries.length; _i++) {
        var _Object$entries$_i = (0, _slicedToArray2.default)(_Object$entries[_i], 2),
          _key2 = _Object$entries$_i[0],
          value = _Object$entries$_i[1];
        if (!IGNORE_EMPTY_KEYS.includes(_key2) || value) {
          url += first ? '?' : '&';
          first = false;
          url += this._getURLParameter(_key2, value, wmsParameters);
        }
      }
      return encodeURI(url);
    }
  }, {
    key: "_getWMS130Parameters",
    value: function _getWMS130Parameters(wmsParameters) {
      var newParameters = _objectSpread({}, wmsParameters);
      if (newParameters.srs) {
        newParameters.crs = newParameters.crs || newParameters.srs;
        delete newParameters.srs;
      }
      return newParameters;
    }
  }, {
    key: "_getURLParameter",
    value: function _getURLParameter(key, value, wmsParameters) {
      switch (key) {
        case 'crs':
          if (wmsParameters.version !== '1.3.0') {
            key = 'srs';
          } else if (this.substituteCRS84 && value === 'EPSG:4326') {
            value = 'CRS:84';
          }
          break;
        case 'srs':
          if (wmsParameters.version === '1.3.0') {
            key = 'crs';
          }
          break;
        case 'bbox':
          var bbox = this._flipBoundingBox(value, wmsParameters);
          if (bbox) {
            value = bbox;
          }
          break;
        default:
      }
      key = key.toUpperCase();
      return Array.isArray(value) ? "".concat(key, "=").concat(value.join(',')) : "".concat(key, "=").concat(value ? String(value) : '');
    }
  }, {
    key: "_flipBoundingBox",
    value: function _flipBoundingBox(bboxValue, wmsParameters) {
      if (!Array.isArray(bboxValue) || bboxValue.length !== 4) {
        return null;
      }
      var flipCoordinates = wmsParameters.version === '1.3.0' && this.flipCRS.includes(wmsParameters.crs || '') && !(this.substituteCRS84 && wmsParameters.crs === 'EPSG:4326');
      var bbox = bboxValue;
      return flipCoordinates ? [bbox[1], bbox[0], bbox[3], bbox[2]] : bbox;
    }
  }, {
    key: "_fetchArrayBuffer",
    value: function () {
      var _fetchArrayBuffer2 = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee9(url) {
        var response, arrayBuffer;
        return _regenerator.default.wrap(function _callee9$(_context9) {
          while (1) switch (_context9.prev = _context9.next) {
            case 0:
              _context9.next = 2;
              return this.fetch(url);
            case 2:
              response = _context9.sent;
              _context9.next = 5;
              return response.arrayBuffer();
            case 5:
              arrayBuffer = _context9.sent;
              this._checkResponse(response, arrayBuffer);
              return _context9.abrupt("return", arrayBuffer);
            case 8:
            case "end":
              return _context9.stop();
          }
        }, _callee9, this);
      }));
      function _fetchArrayBuffer(_x14) {
        return _fetchArrayBuffer2.apply(this, arguments);
      }
      return _fetchArrayBuffer;
    }()
  }, {
    key: "_checkResponse",
    value: function _checkResponse(response, arrayBuffer) {
      var contentType = response.headers['content-type'];
      if (!response.ok || _wmsErrorLoader.WMSErrorLoader.mimeTypes.includes(contentType)) {
        var loadOptions = (0, _loaderUtils.mergeLoaderOptions)(this.loadOptions, {
          wms: {
            throwOnError: true
          }
        });
        var error = _wmsErrorLoader.WMSErrorLoader.parseSync(arrayBuffer, loadOptions);
        throw new Error(error);
      }
    }
  }, {
    key: "_parseError",
    value: function _parseError(arrayBuffer) {
      var error = _wmsErrorLoader.WMSErrorLoader.parseSync(arrayBuffer, this.loadOptions);
      return new Error(error);
    }
  }]);
  return WMSService;
}(_imageSource.ImageSource);
exports.WMSService = WMSService;
(0, _defineProperty2.default)(WMSService, "type", 'wms');
(0, _defineProperty2.default)(WMSService, "testURL", function (url) {
  return url.toLowerCase().includes('wms');
});
//# sourceMappingURL=wms-service.js.map