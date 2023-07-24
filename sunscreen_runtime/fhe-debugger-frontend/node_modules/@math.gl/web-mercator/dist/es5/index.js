"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "default", {
  enumerable: true,
  get: function get() {
    return _webMercatorViewport.default;
  }
});
Object.defineProperty(exports, "WebMercatorViewport", {
  enumerable: true,
  get: function get() {
    return _webMercatorViewport.default;
  }
});
Object.defineProperty(exports, "getBounds", {
  enumerable: true,
  get: function get() {
    return _getBounds.default;
  }
});
Object.defineProperty(exports, "fitBounds", {
  enumerable: true,
  get: function get() {
    return _fitBounds.default;
  }
});
Object.defineProperty(exports, "normalizeViewportProps", {
  enumerable: true,
  get: function get() {
    return _normalizeViewportProps.default;
  }
});
Object.defineProperty(exports, "flyToViewport", {
  enumerable: true,
  get: function get() {
    return _flyToViewport.default;
  }
});
Object.defineProperty(exports, "getFlyToDuration", {
  enumerable: true,
  get: function get() {
    return _flyToViewport.getFlyToDuration;
  }
});
Object.defineProperty(exports, "MAX_LATITUDE", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.MAX_LATITUDE;
  }
});
Object.defineProperty(exports, "lngLatToWorld", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.lngLatToWorld;
  }
});
Object.defineProperty(exports, "worldToLngLat", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.worldToLngLat;
  }
});
Object.defineProperty(exports, "worldToPixels", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.worldToPixels;
  }
});
Object.defineProperty(exports, "pixelsToWorld", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.pixelsToWorld;
  }
});
Object.defineProperty(exports, "zoomToScale", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.zoomToScale;
  }
});
Object.defineProperty(exports, "scaleToZoom", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.scaleToZoom;
  }
});
Object.defineProperty(exports, "altitudeToFovy", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.altitudeToFovy;
  }
});
Object.defineProperty(exports, "fovyToAltitude", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.fovyToAltitude;
  }
});
Object.defineProperty(exports, "getMeterZoom", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.getMeterZoom;
  }
});
Object.defineProperty(exports, "unitsPerMeter", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.unitsPerMeter;
  }
});
Object.defineProperty(exports, "getDistanceScales", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.getDistanceScales;
  }
});
Object.defineProperty(exports, "addMetersToLngLat", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.addMetersToLngLat;
  }
});
Object.defineProperty(exports, "getViewMatrix", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.getViewMatrix;
  }
});
Object.defineProperty(exports, "getProjectionMatrix", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.getProjectionMatrix;
  }
});
Object.defineProperty(exports, "getProjectionParameters", {
  enumerable: true,
  get: function get() {
    return _webMercatorUtils.getProjectionParameters;
  }
});

var _webMercatorViewport = _interopRequireDefault(require("./web-mercator-viewport"));

var _getBounds = _interopRequireDefault(require("./get-bounds"));

var _fitBounds = _interopRequireDefault(require("./fit-bounds"));

var _normalizeViewportProps = _interopRequireDefault(require("./normalize-viewport-props"));

var _flyToViewport = _interopRequireWildcard(require("./fly-to-viewport"));

var _webMercatorUtils = require("./web-mercator-utils");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
//# sourceMappingURL=index.js.map