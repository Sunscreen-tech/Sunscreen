"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CSWService = void 0;
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
var _dataSource = require("../../sources/data-source");
var _cswCapabilitiesLoader = require("../../../csw-capabilities-loader");
var _cswRecordsLoader = require("../../../csw-records-loader");
var _cswDomainLoader = require("../../../csw-domain-loader");
var _wmsErrorLoader = require("../../../wms-error-loader");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
var CSWService = function (_DataSource) {
  (0, _inherits2.default)(CSWService, _DataSource);
  var _super = _createSuper(CSWService);
  function CSWService(props) {
    var _this;
    (0, _classCallCheck2.default)(this, CSWService);
    _this = _super.call(this, props);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "capabilities", null);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "loaders", [_wmsErrorLoader.WMSErrorLoader, _cswCapabilitiesLoader.CSWCapabilitiesLoader]);
    return _this;
  }
  (0, _createClass2.default)(CSWService, [{
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
    key: "normalizeMetadata",
    value: function normalizeMetadata(capabilities) {
      return capabilities;
    }
  }, {
    key: "getServiceDirectory",
    value: function () {
      var _getServiceDirectory = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(options) {
        var services, unknownServices, records, _iterator, _step, record, _iterator2, _step2, reference, url;
        return _regenerator.default.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              services = [];
              unknownServices = [];
              _context2.next = 4;
              return this.getRecords();
            case 4:
              records = _context2.sent;
              _iterator = _createForOfIteratorHelper(records.records);
              _context2.prev = 6;
              _iterator.s();
            case 8:
              if ((_step = _iterator.n()).done) {
                _context2.next = 38;
                break;
              }
              record = _step.value;
              _iterator2 = _createForOfIteratorHelper(record.references);
              _context2.prev = 11;
              _iterator2.s();
            case 13:
              if ((_step2 = _iterator2.n()).done) {
                _context2.next = 28;
                break;
              }
              reference = _step2.value;
              url = reference.value;
              _context2.t0 = reference.scheme;
              _context2.next = _context2.t0 === 'OGC:WMS' ? 19 : _context2.t0 === 'OGC:WMTS' ? 21 : _context2.t0 === 'OGC:WFS' ? 23 : 25;
              break;
            case 19:
              services.push(_objectSpread({
                name: record.title,
                type: 'ogc-wms-service'
              }, this._parseOGCUrl(url)));
              return _context2.abrupt("break", 26);
            case 21:
              services.push(_objectSpread({
                name: record.title,
                type: 'ogc-wmts-service'
              }, this._parseOGCUrl(url)));
              return _context2.abrupt("break", 26);
            case 23:
              services.push(_objectSpread({
                name: record.title,
                type: 'ogc-wfs-service'
              }, this._parseOGCUrl(url)));
              return _context2.abrupt("break", 26);
            case 25:
              unknownServices.push({
                name: record.title,
                type: 'unknown',
                url: reference.value,
                scheme: reference.scheme
              });
            case 26:
              _context2.next = 13;
              break;
            case 28:
              _context2.next = 33;
              break;
            case 30:
              _context2.prev = 30;
              _context2.t1 = _context2["catch"](11);
              _iterator2.e(_context2.t1);
            case 33:
              _context2.prev = 33;
              _iterator2.f();
              return _context2.finish(33);
            case 36:
              _context2.next = 8;
              break;
            case 38:
              _context2.next = 43;
              break;
            case 40:
              _context2.prev = 40;
              _context2.t2 = _context2["catch"](6);
              _iterator.e(_context2.t2);
            case 43:
              _context2.prev = 43;
              _iterator.f();
              return _context2.finish(43);
            case 46:
              return _context2.abrupt("return", options !== null && options !== void 0 && options.includeUnknown ? services.concat(unknownServices) : services);
            case 47:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this, [[6, 40, 43, 46], [11, 30, 33, 36]]);
      }));
      function getServiceDirectory(_x) {
        return _getServiceDirectory.apply(this, arguments);
      }
      return getServiceDirectory;
    }()
  }, {
    key: "_parseOGCUrl",
    value: function _parseOGCUrl(url) {
      var parts = url.split('?');
      return {
        url: parts[0],
        params: parts[1] || ''
      };
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
              return _cswCapabilitiesLoader.CSWCapabilitiesLoader.parse(arrayBuffer, this.props.loadOptions);
            case 10:
              capabilities = _context3.sent;
              return _context3.abrupt("return", capabilities);
            case 12:
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
    key: "getRecords",
    value: function () {
      var _getRecords = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee4(wmsParameters, vendorParameters) {
        var url, response, arrayBuffer;
        return _regenerator.default.wrap(function _callee4$(_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              url = this.getRecordsURL(wmsParameters, vendorParameters);
              _context4.next = 3;
              return this.fetch(url);
            case 3:
              response = _context4.sent;
              _context4.next = 6;
              return response.arrayBuffer();
            case 6:
              arrayBuffer = _context4.sent;
              this._checkResponse(response, arrayBuffer);
              _context4.next = 10;
              return _cswRecordsLoader.CSWRecordsLoader.parse(arrayBuffer, this.props.loadOptions);
            case 10:
              return _context4.abrupt("return", _context4.sent);
            case 11:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this);
      }));
      function getRecords(_x4, _x5) {
        return _getRecords.apply(this, arguments);
      }
      return getRecords;
    }()
  }, {
    key: "getDomain",
    value: function () {
      var _getDomain = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee5(wmsParameters, vendorParameters) {
        var url, response, arrayBuffer;
        return _regenerator.default.wrap(function _callee5$(_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              url = this.getDomainURL(wmsParameters, vendorParameters);
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
              return _cswDomainLoader.CSWDomainLoader.parse(arrayBuffer, this.props.loadOptions);
            case 10:
              return _context5.abrupt("return", _context5.sent);
            case 11:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this);
      }));
      function getDomain(_x6, _x7) {
        return _getDomain.apply(this, arguments);
      }
      return getDomain;
    }()
  }, {
    key: "getCapabilitiesURL",
    value: function getCapabilitiesURL(wmsParameters, vendorParameters) {
      var options = _objectSpread(_objectSpread(_objectSpread({
        version: '3.0.0'
      }, wmsParameters), vendorParameters), {}, {
        service: 'CSW',
        request: 'GetCapabilities'
      });
      return this._getCSWUrl(options, vendorParameters);
    }
  }, {
    key: "getRecordsURL",
    value: function getRecordsURL(wmsParameters, vendorParameters) {
      var options = _objectSpread(_objectSpread(_objectSpread({
        version: '3.0.0',
        typenames: 'csw:Record'
      }, wmsParameters), vendorParameters), {}, {
        service: 'CSW',
        request: 'GetRecords'
      });
      return this._getCSWUrl(options, vendorParameters);
    }
  }, {
    key: "getDomainURL",
    value: function getDomainURL(wmsParameters, vendorParameters) {
      var options = _objectSpread(_objectSpread(_objectSpread({
        version: '3.0.0'
      }, wmsParameters), vendorParameters), {}, {
        service: 'CSW',
        request: 'GetDomain'
      });
      return this._getCSWUrl(options, vendorParameters);
    }
  }, {
    key: "_getCSWUrl",
    value: function _getCSWUrl(options, vendorParameters) {
      var url = this.props.url;
      var first = true;
      for (var _i = 0, _Object$entries = Object.entries(options); _i < _Object$entries.length; _i++) {
        var _Object$entries$_i = (0, _slicedToArray2.default)(_Object$entries[_i], 2),
          key = _Object$entries$_i[0],
          value = _Object$entries$_i[1];
        url += first ? '?' : '&';
        first = false;
        if (Array.isArray(value)) {
          url += "".concat(key.toUpperCase(), "=").concat(value.join(','));
        } else {
          url += "".concat(key.toUpperCase(), "=").concat(value ? String(value) : '');
        }
      }
      return encodeURI(url);
    }
  }, {
    key: "_checkResponse",
    value: function _checkResponse(response, arrayBuffer) {
      var contentType = response.headers['content-type'];
      if (!response.ok || _wmsErrorLoader.WMSErrorLoader.mimeTypes.includes(contentType)) {
        var error = _wmsErrorLoader.WMSErrorLoader.parseSync(arrayBuffer, this.props.loadOptions);
        throw new Error(error);
      }
    }
  }, {
    key: "_parseError",
    value: function _parseError(arrayBuffer) {
      var error = _wmsErrorLoader.WMSErrorLoader.parseSync(arrayBuffer, this.props.loadOptions);
      return new Error(error);
    }
  }]);
  return CSWService;
}(_dataSource.DataSource);
exports.CSWService = CSWService;
(0, _defineProperty2.default)(CSWService, "type", 'csw');
(0, _defineProperty2.default)(CSWService, "testURL", function (url) {
  return url.toLowerCase().includes('csw');
});
//# sourceMappingURL=csw-service.js.map