"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = normalizeViewportProps;

var _webMercatorUtils = require("./web-mercator-utils");

var _mathUtils = require("./math-utils");

var TILE_SIZE = 512;

function normalizeViewportProps(props) {
  var width = props.width,
      height = props.height,
      _props$pitch = props.pitch,
      pitch = _props$pitch === void 0 ? 0 : _props$pitch;
  var longitude = props.longitude,
      latitude = props.latitude,
      zoom = props.zoom,
      _props$bearing = props.bearing,
      bearing = _props$bearing === void 0 ? 0 : _props$bearing;

  if (longitude < -180 || longitude > 180) {
    longitude = (0, _mathUtils.mod)(longitude + 180, 360) - 180;
  }

  if (bearing < -180 || bearing > 180) {
    bearing = (0, _mathUtils.mod)(bearing + 180, 360) - 180;
  }

  var minZoom = (0, _mathUtils.log2)(height / TILE_SIZE);

  if (zoom <= minZoom) {
    zoom = minZoom;
    latitude = 0;
  } else {
    var halfHeightPixels = height / 2 / Math.pow(2, zoom);
    var minLatitude = (0, _webMercatorUtils.worldToLngLat)([0, halfHeightPixels])[1];

    if (latitude < minLatitude) {
      latitude = minLatitude;
    } else {
      var maxLatitude = (0, _webMercatorUtils.worldToLngLat)([0, TILE_SIZE - halfHeightPixels])[1];

      if (latitude > maxLatitude) {
        latitude = maxLatitude;
      }
    }
  }

  return {
    width: width,
    height: height,
    longitude: longitude,
    latitude: latitude,
    zoom: zoom,
    pitch: pitch,
    bearing: bearing
  };
}
//# sourceMappingURL=normalize-viewport-props.js.map