"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createImageSource = createImageSource;
var _imageService = require("./services/generic/image-service");
var _wmsService = require("./services/ogc/wms-service");
var _arcgisImageService = require("./services/arcgis/arcgis-image-service");
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
var SERVICES = [_wmsService.WMSService, _arcgisImageService.ArcGISImageServer, _imageService.ImageService];
function createImageSource(props) {
  var _props$type = props.type,
    type = _props$type === void 0 ? 'auto' : _props$type;
  var serviceType = type === 'auto' ? guessServiceType(props.url) : type;
  switch (serviceType) {
    case 'template':
      return new _imageService.ImageService(props);
    case 'wms':
      return new _wmsService.WMSService(props);
    default:
      throw new Error('Not a valid image source type');
  }
}
function guessServiceType(url) {
  var _iterator = _createForOfIteratorHelper(SERVICES),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var Service = _step.value;
      if (Service.testURL && Service.testURL(url)) {
        return Service.type;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return 'wms';
}
//# sourceMappingURL=create-image-source.js.map