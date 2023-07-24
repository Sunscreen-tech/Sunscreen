"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ArcGISImageServer = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));
var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _imageSource = require("../../sources/image-source");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
var ArcGISImageServer = function (_ImageSource) {
  (0, _inherits2.default)(ArcGISImageServer, _ImageSource);
  var _super = _createSuper(ArcGISImageServer);
  function ArcGISImageServer(props) {
    (0, _classCallCheck2.default)(this, ArcGISImageServer);
    return _super.call(this, props);
  }
  (0, _createClass2.default)(ArcGISImageServer, [{
    key: "getMetadata",
    value: function () {
      var _getMetadata = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee() {
        return _regenerator.default.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return this.metadata();
            case 2:
              return _context.abrupt("return", _context.sent);
            case 3:
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
              throw new Error('not implemented');
            case 1:
            case "end":
              return _context2.stop();
          }
        }, _callee2);
      }));
      function getImage(_x) {
        return _getImage.apply(this, arguments);
      }
      return getImage;
    }()
  }, {
    key: "metadata",
    value: function () {
      var _metadata = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3() {
        return _regenerator.default.wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              throw new Error('not implemented');
            case 1:
            case "end":
              return _context3.stop();
          }
        }, _callee3);
      }));
      function metadata() {
        return _metadata.apply(this, arguments);
      }
      return metadata;
    }()
  }, {
    key: "exportImage",
    value: function exportImage(options) {
      throw new Error('not implemented');
    }
  }, {
    key: "metadataURL",
    value: function metadataURL(options) {
      return "".concat(this.props.url, "?f=pjson");
    }
  }, {
    key: "exportImageURL",
    value: function exportImageURL(options) {
      var bbox = "bbox=".concat(options.bbox[0], ",").concat(options.bbox[1], ",").concat(options.bbox[2], ",").concat(options.bbox[3]);
      var size = "size=".concat(options.width, ",").concat(options.height);
      var arcgisOptions = _objectSpread(_objectSpread({}, options), {}, {
        bbox: bbox,
        size: size
      });
      delete arcgisOptions.width;
      delete arcgisOptions.height;
      return this.getUrl('exportImage', arcgisOptions);
    }
  }, {
    key: "getUrl",
    value: function getUrl(path, options, extra) {
      var url = "".concat(this.props.url, "/").concat(path);
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
      return url;
    }
  }, {
    key: "checkResponse",
    value: function () {
      var _checkResponse = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee4(response) {
        return _regenerator.default.wrap(function _callee4$(_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              if (response.ok) {
                _context4.next = 2;
                break;
              }
              throw new Error('error');
            case 2:
            case "end":
              return _context4.stop();
          }
        }, _callee4);
      }));
      function checkResponse(_x2) {
        return _checkResponse.apply(this, arguments);
      }
      return checkResponse;
    }()
  }]);
  return ArcGISImageServer;
}(_imageSource.ImageSource);
exports.ArcGISImageServer = ArcGISImageServer;
(0, _defineProperty2.default)(ArcGISImageServer, "type", 'arcgis-image-server');
(0, _defineProperty2.default)(ArcGISImageServer, "testURL", function (url) {
  return url.toLowerCase().includes('ImageServer');
});
//# sourceMappingURL=arcgis-image-service.js.map