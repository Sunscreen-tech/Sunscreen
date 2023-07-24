"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = flyToViewport;
exports.getFlyToDuration = getFlyToDuration;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _mathUtils = require("./math-utils");

var _webMercatorUtils = require("./web-mercator-utils");

var vec2 = _interopRequireWildcard(require("gl-matrix/vec2"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var EPSILON = 0.01;
var VIEWPORT_TRANSITION_PROPS = ['longitude', 'latitude', 'zoom'];
var DEFAULT_OPTS = {
  curve: 1.414,
  speed: 1.2
};

function flyToViewport(startProps, endProps, t, options) {
  var _getFlyToTransitionPa = getFlyToTransitionParams(startProps, endProps, options),
      startZoom = _getFlyToTransitionPa.startZoom,
      startCenterXY = _getFlyToTransitionPa.startCenterXY,
      uDelta = _getFlyToTransitionPa.uDelta,
      w0 = _getFlyToTransitionPa.w0,
      u1 = _getFlyToTransitionPa.u1,
      S = _getFlyToTransitionPa.S,
      rho = _getFlyToTransitionPa.rho,
      rho2 = _getFlyToTransitionPa.rho2,
      r0 = _getFlyToTransitionPa.r0;

  if (u1 < EPSILON) {
    var viewport = {};

    var _iterator = _createForOfIteratorHelper(VIEWPORT_TRANSITION_PROPS),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var key = _step.value;
        var startValue = startProps[key];
        var endValue = endProps[key];
        viewport[key] = (0, _mathUtils.lerp)(startValue, endValue, t);
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return viewport;
  }

  var s = t * S;
  var w = Math.cosh(r0) / Math.cosh(r0 + rho * s);
  var u = w0 * ((Math.cosh(r0) * Math.tanh(r0 + rho * s) - Math.sinh(r0)) / rho2) / u1;
  var scaleIncrement = 1 / w;
  var newZoom = startZoom + (0, _webMercatorUtils.scaleToZoom)(scaleIncrement);
  var newCenterWorld = vec2.scale([], uDelta, u);
  vec2.add(newCenterWorld, newCenterWorld, startCenterXY);
  var newCenter = (0, _webMercatorUtils.worldToLngLat)(newCenterWorld);
  return {
    longitude: newCenter[0],
    latitude: newCenter[1],
    zoom: newZoom
  };
}

function getFlyToDuration(startProps, endProps, options) {
  var opts = _objectSpread(_objectSpread({}, DEFAULT_OPTS), options);

  var screenSpeed = opts.screenSpeed,
      speed = opts.speed,
      maxDuration = opts.maxDuration;

  var _getFlyToTransitionPa2 = getFlyToTransitionParams(startProps, endProps, opts),
      S = _getFlyToTransitionPa2.S,
      rho = _getFlyToTransitionPa2.rho;

  var length = 1000 * S;
  var duration;

  if (Number.isFinite(screenSpeed)) {
    duration = length / (screenSpeed / rho);
  } else {
    duration = length / speed;
  }

  return Number.isFinite(maxDuration) && duration > maxDuration ? 0 : duration;
}

function getFlyToTransitionParams(startProps, endProps, opts) {
  opts = Object.assign({}, DEFAULT_OPTS, opts);
  var rho = opts.curve;
  var startZoom = startProps.zoom;
  var startCenter = [startProps.longitude, startProps.latitude];
  var startScale = (0, _webMercatorUtils.zoomToScale)(startZoom);
  var endZoom = endProps.zoom;
  var endCenter = [endProps.longitude, endProps.latitude];
  var scale = (0, _webMercatorUtils.zoomToScale)(endZoom - startZoom);
  var startCenterXY = (0, _webMercatorUtils.lngLatToWorld)(startCenter);
  var endCenterXY = (0, _webMercatorUtils.lngLatToWorld)(endCenter);
  var uDelta = vec2.sub([], endCenterXY, startCenterXY);
  var w0 = Math.max(startProps.width, startProps.height);
  var w1 = w0 / scale;
  var u1 = vec2.length(uDelta) * startScale;

  var _u1 = Math.max(u1, EPSILON);

  var rho2 = rho * rho;
  var b0 = (w1 * w1 - w0 * w0 + rho2 * rho2 * _u1 * _u1) / (2 * w0 * rho2 * _u1);
  var b1 = (w1 * w1 - w0 * w0 - rho2 * rho2 * _u1 * _u1) / (2 * w1 * rho2 * _u1);
  var r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  var r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  var S = (r1 - r0) / rho;
  return {
    startZoom: startZoom,
    startCenterXY: startCenterXY,
    uDelta: uDelta,
    w0: w0,
    u1: u1,
    S: S,
    rho: rho,
    rho2: rho2,
    r0: r0,
    r1: r1
  };
}
//# sourceMappingURL=fly-to-viewport.js.map