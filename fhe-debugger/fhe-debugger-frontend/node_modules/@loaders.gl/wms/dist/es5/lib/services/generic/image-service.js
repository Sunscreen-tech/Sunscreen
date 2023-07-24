"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ImageService = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));
var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _images = require("@loaders.gl/images");
var _imageSource = require("../../sources/image-source");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
var ImageService = function (_ImageSource) {
  (0, _inherits2.default)(ImageService, _ImageSource);
  var _super = _createSuper(ImageService);
  function ImageService(props) {
    (0, _classCallCheck2.default)(this, ImageService);
    return _super.call(this, props);
  }
  (0, _createClass2.default)(ImageService, [{
    key: "getMetadata",
    value: function () {
      var _getMetadata = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee() {
        return _regenerator.default.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              throw new Error('ImageSource.getMetadata not implemented');
            case 1:
            case "end":
              return _context.stop();
          }
        }, _callee);
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
        var granularParameters, url, response, arrayBuffer;
        return _regenerator.default.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              granularParameters = this.getGranularParameters(parameters);
              url = this.getURLFromTemplate(granularParameters);
              _context2.next = 4;
              return this.fetch(url);
            case 4:
              response = _context2.sent;
              _context2.next = 7;
              return response.arrayBuffer();
            case 7:
              arrayBuffer = _context2.sent;
              _context2.next = 10;
              return _images.ImageLoader.parse(arrayBuffer);
            case 10:
              return _context2.abrupt("return", _context2.sent);
            case 11:
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
    key: "getGranularParameters",
    value: function getGranularParameters(parameters) {
      var _parameters$bbox = (0, _slicedToArray2.default)(parameters.bbox, 4),
        east = _parameters$bbox[0],
        north = _parameters$bbox[1],
        west = _parameters$bbox[2],
        south = _parameters$bbox[3];
      return _objectSpread(_objectSpread({}, parameters), {}, {
        east: east,
        north: north,
        south: south,
        west: west
      });
    }
  }, {
    key: "getURLFromTemplate",
    value: function getURLFromTemplate(parameters) {
      var url = this.props.url;
      for (var _i = 0, _Object$entries = Object.entries(parameters); _i < _Object$entries.length; _i++) {
        var _Object$entries$_i = (0, _slicedToArray2.default)(_Object$entries[_i], 2),
          key = _Object$entries$_i[0],
          value = _Object$entries$_i[1];
        url = url.replace("${".concat(key, "}"), String(value));
        url = url.replace("{".concat(key, "}"), String(value));
      }
      return url;
    }
  }]);
  return ImageService;
}(_imageSource.ImageSource);
exports.ImageService = ImageService;
(0, _defineProperty2.default)(ImageService, "type", 'template');
(0, _defineProperty2.default)(ImageService, "testURL", function (url) {
  return url.toLowerCase().includes('{');
});
//# sourceMappingURL=image-service.js.map