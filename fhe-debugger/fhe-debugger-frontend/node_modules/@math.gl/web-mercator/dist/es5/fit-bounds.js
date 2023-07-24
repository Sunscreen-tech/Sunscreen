"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = fitBounds;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _assert = _interopRequireDefault(require("./assert"));

var _mathUtils = require("./math-utils");

var _webMercatorUtils = require("./web-mercator-utils");

function fitBounds(options) {
  var width = options.width,
      height = options.height,
      bounds = options.bounds,
      _options$minExtent = options.minExtent,
      minExtent = _options$minExtent === void 0 ? 0 : _options$minExtent,
      _options$maxZoom = options.maxZoom,
      maxZoom = _options$maxZoom === void 0 ? 24 : _options$maxZoom,
      _options$offset = options.offset,
      offset = _options$offset === void 0 ? [0, 0] : _options$offset;

  var _bounds = (0, _slicedToArray2.default)(bounds, 2),
      _bounds$ = (0, _slicedToArray2.default)(_bounds[0], 2),
      west = _bounds$[0],
      south = _bounds$[1],
      _bounds$2 = (0, _slicedToArray2.default)(_bounds[1], 2),
      east = _bounds$2[0],
      north = _bounds$2[1];

  var padding = getPaddingObject(options.padding);
  var nw = (0, _webMercatorUtils.lngLatToWorld)([west, (0, _mathUtils.clamp)(north, -_webMercatorUtils.MAX_LATITUDE, _webMercatorUtils.MAX_LATITUDE)]);
  var se = (0, _webMercatorUtils.lngLatToWorld)([east, (0, _mathUtils.clamp)(south, -_webMercatorUtils.MAX_LATITUDE, _webMercatorUtils.MAX_LATITUDE)]);
  var size = [Math.max(Math.abs(se[0] - nw[0]), minExtent), Math.max(Math.abs(se[1] - nw[1]), minExtent)];
  var targetSize = [width - padding.left - padding.right - Math.abs(offset[0]) * 2, height - padding.top - padding.bottom - Math.abs(offset[1]) * 2];
  (0, _assert.default)(targetSize[0] > 0 && targetSize[1] > 0);
  var scaleX = targetSize[0] / size[0];
  var scaleY = targetSize[1] / size[1];
  var offsetX = (padding.right - padding.left) / 2 / scaleX;
  var offsetY = (padding.top - padding.bottom) / 2 / scaleY;
  var center = [(se[0] + nw[0]) / 2 + offsetX, (se[1] + nw[1]) / 2 + offsetY];
  var centerLngLat = (0, _webMercatorUtils.worldToLngLat)(center);
  var zoom = Math.min(maxZoom, (0, _mathUtils.log2)(Math.abs(Math.min(scaleX, scaleY))));
  (0, _assert.default)(Number.isFinite(zoom));
  return {
    longitude: centerLngLat[0],
    latitude: centerLngLat[1],
    zoom: zoom
  };
}

function getPaddingObject() {
  var padding = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

  if (typeof padding === 'number') {
    return {
      top: padding,
      bottom: padding,
      left: padding,
      right: padding
    };
  }

  (0, _assert.default)(Number.isFinite(padding.top) && Number.isFinite(padding.bottom) && Number.isFinite(padding.left) && Number.isFinite(padding.right));
  return padding;
}
//# sourceMappingURL=fit-bounds.js.map