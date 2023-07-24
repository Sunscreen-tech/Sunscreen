"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clip = clip;
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));
var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));
var _wrapNativeSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/wrapNativeSuper"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _feature = require("./feature");
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function clip(features, scale, k1, k2, axis, minAll, maxAll, options) {
  k1 /= scale;
  k2 /= scale;
  if (minAll >= k1 && maxAll < k2) {
    return features;
  } else if (maxAll < k1 || minAll >= k2) {
    return null;
  }
  var clipped = [];
  var _iterator = _createForOfIteratorHelper(features),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var feature = _step.value;
      var geometry = feature.geometry;
      var type = feature.type;
      var min = axis === 0 ? feature.minX : feature.minY;
      var max = axis === 0 ? feature.maxX : feature.maxY;
      if (min >= k1 && max < k2) {
        clipped.push(feature);
        continue;
      } else if (max < k1 || min >= k2) {
        continue;
      }
      var newGeometry = [];
      if (type === 'Point' || type === 'MultiPoint') {
        clipPoints(geometry, newGeometry, k1, k2, axis);
      } else if (type === 'LineString') {
        clipLine(geometry, newGeometry, k1, k2, axis, false, options.lineMetrics);
      } else if (type === 'MultiLineString') {
        clipLines(geometry, newGeometry, k1, k2, axis, false);
      } else if (type === 'Polygon') {
        clipLines(geometry, newGeometry, k1, k2, axis, true);
      } else if (type === 'MultiPolygon') {
        var _iterator2 = _createForOfIteratorHelper(geometry),
          _step2;
        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var polygon = _step2.value;
            var newPolygon = [];
            clipLines(polygon, newPolygon, k1, k2, axis, true);
            if (newPolygon.length) {
              newGeometry.push(newPolygon);
            }
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      }
      if (newGeometry.length) {
        if (options.lineMetrics && type === 'LineString') {
          var _iterator3 = _createForOfIteratorHelper(newGeometry),
            _step3;
          try {
            for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
              var line = _step3.value;
              clipped.push((0, _feature.createFeature)(feature.id, type, line, feature.tags));
            }
          } catch (err) {
            _iterator3.e(err);
          } finally {
            _iterator3.f();
          }
          continue;
        }
        if (type === 'LineString' || type === 'MultiLineString') {
          if (newGeometry.length === 1) {
            type = 'LineString';
            newGeometry = newGeometry[0];
          } else {
            type = 'MultiLineString';
          }
        }
        if (type === 'Point' || type === 'MultiPoint') {
          type = newGeometry.length === 3 ? 'Point' : 'MultiPoint';
        }
        clipped.push((0, _feature.createFeature)(feature.id, type, newGeometry, feature.tags));
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return clipped.length ? clipped : null;
}
function clipPoints(geom, newGeom, k1, k2, axis) {
  for (var i = 0; i < geom.length; i += 3) {
    var a = geom[i + axis];
    if (a >= k1 && a <= k2) {
      addPoint(newGeom, geom[i], geom[i + 1], geom[i + 2]);
    }
  }
}
function clipLine(geom, newGeom, k1, k2, axis, isPolygon, trackMetrics) {
  var slice = newSlice(geom);
  var intersect = axis === 0 ? intersectX : intersectY;
  var len = geom.start;
  var segLen;
  var t;
  for (var i = 0; i < geom.length - 3; i += 3) {
    var _ax = geom[i];
    var _ay = geom[i + 1];
    var _az = geom[i + 2];
    var bx = geom[i + 3];
    var by = geom[i + 4];
    var _a = axis === 0 ? _ax : _ay;
    var b = axis === 0 ? bx : by;
    var exited = false;
    if (trackMetrics) {
      segLen = Math.sqrt(Math.pow(_ax - bx, 2) + Math.pow(_ay - by, 2));
    }
    if (_a < k1) {
      if (b > k1) {
        t = intersect(slice, _ax, _ay, bx, by, k1);
        if (trackMetrics) {
          slice.start = len + segLen * t;
        }
      }
    } else if (_a > k2) {
      if (b < k2) {
        t = intersect(slice, _ax, _ay, bx, by, k2);
        if (trackMetrics) {
          slice.start = len + segLen * t;
        }
      }
    } else {
      addPoint(slice, _ax, _ay, _az);
    }
    if (b < k1 && _a >= k1) {
      t = intersect(slice, _ax, _ay, bx, by, k1);
      exited = true;
    }
    if (b > k2 && _a <= k2) {
      t = intersect(slice, _ax, _ay, bx, by, k2);
      exited = true;
    }
    if (!isPolygon && exited) {
      if (trackMetrics) {
        slice.end = len + segLen * t;
      }
      newGeom.push(slice);
      slice = newSlice(geom);
    }
    if (trackMetrics) {
      len += segLen;
    }
  }
  var last = geom.length - 3;
  var ax = geom[last];
  var ay = geom[last + 1];
  var az = geom[last + 2];
  var a = axis === 0 ? ax : ay;
  if (a >= k1 && a <= k2) addPoint(slice, ax, ay, az);
  last = slice.length - 3;
  if (isPolygon && last >= 3 && (slice[last] !== slice[0] || slice[last + 1] !== slice[1])) {
    addPoint(slice, slice[0], slice[1], slice[2]);
  }
  if (slice.length) {
    newGeom.push(slice);
  }
}
var Slice = function (_Array) {
  (0, _inherits2.default)(Slice, _Array);
  var _super = _createSuper(Slice);
  function Slice() {
    var _this;
    (0, _classCallCheck2.default)(this, Slice);
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    _this = _super.call.apply(_super, [this].concat(args));
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "size", void 0);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "start", void 0);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "end", void 0);
    return _this;
  }
  return (0, _createClass2.default)(Slice);
}((0, _wrapNativeSuper2.default)(Array));
function newSlice(line) {
  var slice = [];
  slice.size = line.size;
  slice.start = line.start;
  slice.end = line.end;
  return slice;
}
function clipLines(geom, newGeom, k1, k2, axis, isPolygon) {
  var _iterator4 = _createForOfIteratorHelper(geom),
    _step4;
  try {
    for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
      var line = _step4.value;
      clipLine(line, newGeom, k1, k2, axis, isPolygon, false);
    }
  } catch (err) {
    _iterator4.e(err);
  } finally {
    _iterator4.f();
  }
}
function addPoint(out, x, y, z) {
  out.push(x, y, z);
}
function intersectX(out, ax, ay, bx, by, x) {
  var t = (x - ax) / (bx - ax);
  addPoint(out, x, ay + (by - ay) * t, 1);
  return t;
}
function intersectY(out, ax, ay, bx, by, y) {
  var t = (y - ay) / (by - ay);
  addPoint(out, ax + (bx - ax) * t, y, 1);
  return t;
}
//# sourceMappingURL=clip.js.map