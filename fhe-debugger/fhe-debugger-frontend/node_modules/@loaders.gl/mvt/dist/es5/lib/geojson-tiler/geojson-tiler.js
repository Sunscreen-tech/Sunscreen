"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GeoJSONTiler = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _convert = require("./convert");
var _clip = require("./clip");
var _wrap = require("./wrap");
var _transform = require("./transform");
var _tile = require("./tile");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var DEFAULT_OPTIONS = {
  maxZoom: 14,
  indexMaxZoom: 5,
  indexMaxPoints: 100000,
  tolerance: 3,
  extent: 4096,
  buffer: 64,
  lineMetrics: false,
  promoteId: undefined,
  generateId: false,
  debug: 0
};
var GeoJSONTiler = function () {
  function GeoJSONTiler(data, options) {
    (0, _classCallCheck2.default)(this, GeoJSONTiler);
    (0, _defineProperty2.default)(this, "options", void 0);
    (0, _defineProperty2.default)(this, "tiles", {});
    (0, _defineProperty2.default)(this, "tileCoords", []);
    (0, _defineProperty2.default)(this, "stats", {});
    (0, _defineProperty2.default)(this, "total", 0);
    this.options = _objectSpread(_objectSpread({}, DEFAULT_OPTIONS), options);
    options = this.options;
    var debug = options.debug;
    if (debug) console.time('preprocess data');
    if (this.options.maxZoom < 0 || this.options.maxZoom > 24) {
      throw new Error('maxZoom should be in the 0-24 range');
    }
    if (options.promoteId && this.options.generateId) {
      throw new Error('promoteId and generateId cannot be used together.');
    }
    var features = (0, _convert.convert)(data, options);
    if (debug) {
      console.timeEnd('preprocess data');
      console.log('index: maxZoom: %d, maxPoints: %d', options.indexMaxZoom, options.indexMaxPoints);
      console.time('generate tiles');
    }
    features = (0, _wrap.wrap)(features, this.options);
    if (features.length) {
      this.splitTile(features, 0, 0, 0);
    }
    if (debug) {
      if (features.length) {
        console.log('features: %d, points: %d', this.tiles[0].numFeatures, this.tiles[0].numPoints);
      }
      console.timeEnd('generate tiles');
      console.log('tiles generated:', this.total, JSON.stringify(this.stats));
    }
  }
  (0, _createClass2.default)(GeoJSONTiler, [{
    key: "getTile",
    value: function getTile(z, x, y) {
      var _this$options = this.options,
        extent = _this$options.extent,
        debug = _this$options.debug;
      if (z < 0 || z > 24) {
        return null;
      }
      var z2 = 1 << z;
      x = x + z2 & z2 - 1;
      var id = toID(z, x, y);
      if (this.tiles[id]) {
        return (0, _transform.transformTile)(this.tiles[id], extent);
      }
      if (debug > 1) console.log('drilling down to z%d-%d-%d', z, x, y);
      var z0 = z;
      var x0 = x;
      var y0 = y;
      var parent;
      while (!parent && z0 > 0) {
        z0--;
        x0 = x0 >> 1;
        y0 = y0 >> 1;
        parent = this.tiles[toID(z0, x0, y0)];
      }
      if (!parent || !parent.source) {
        return null;
      }
      if (debug > 1) {
        console.log('found parent tile z%d-%d-%d', z0, x0, y0);
        console.time('drilling down');
      }
      this.splitTile(parent.source, z0, x0, y0, z, x, y);
      if (debug > 1) {
        console.timeEnd('drilling down');
      }
      return this.tiles[id] ? (0, _transform.transformTile)(this.tiles[id], extent) : null;
    }
  }, {
    key: "splitTile",
    value: function splitTile(features, z, x, y, cz, cx, cy) {
      var stack = [features, z, x, y];
      var options = this.options;
      var debug = options.debug;
      while (stack.length) {
        y = stack.pop();
        x = stack.pop();
        z = stack.pop();
        features = stack.pop();
        var z2 = 1 << z;
        var id = toID(z, x, y);
        var tile = this.tiles[id];
        if (!tile) {
          if (debug > 1) {
            console.time('creation');
          }
          tile = this.tiles[id] = (0, _tile.createTile)(features, z, x, y, options);
          this.tileCoords.push({
            z: z,
            x: x,
            y: y
          });
          if (debug) {
            if (debug > 1) {
              console.log('tile z%d-%d-%d (features: %d, points: %d, simplified: %d)', z, x, y, tile.numFeatures, tile.numPoints, tile.numSimplified);
              console.timeEnd('creation');
            }
            var key = "z".concat(z);
            this.stats[key] = (this.stats[key] || 0) + 1;
            this.total++;
          }
        }
        tile.source = features;
        if (cz === undefined) {
          if (z === options.indexMaxZoom || tile.numPoints <= options.indexMaxPoints) continue;
        } else if (z === options.maxZoom || z === cz) {
          continue;
        } else if (cz !== undefined) {
          var zoomSteps = cz - z;
          if (x !== cx >> zoomSteps || y !== cy >> zoomSteps) continue;
        }
        tile.source = null;
        if (features.length === 0) continue;
        if (debug > 1) console.time('clipping');
        var k1 = 0.5 * options.buffer / options.extent;
        var k2 = 0.5 - k1;
        var k3 = 0.5 + k1;
        var k4 = 1 + k1;
        var tl = null;
        var bl = null;
        var tr = null;
        var br = null;
        var left = (0, _clip.clip)(features, z2, x - k1, x + k3, 0, tile.minX, tile.maxX, options);
        var right = (0, _clip.clip)(features, z2, x + k2, x + k4, 0, tile.minX, tile.maxX, options);
        features = null;
        if (left) {
          tl = (0, _clip.clip)(left, z2, y - k1, y + k3, 1, tile.minY, tile.maxY, options);
          bl = (0, _clip.clip)(left, z2, y + k2, y + k4, 1, tile.minY, tile.maxY, options);
          left = null;
        }
        if (right) {
          tr = (0, _clip.clip)(right, z2, y - k1, y + k3, 1, tile.minY, tile.maxY, options);
          br = (0, _clip.clip)(right, z2, y + k2, y + k4, 1, tile.minY, tile.maxY, options);
          right = null;
        }
        if (debug > 1) console.timeEnd('clipping');
        stack.push(tl || [], z + 1, x * 2, y * 2);
        stack.push(bl || [], z + 1, x * 2, y * 2 + 1);
        stack.push(tr || [], z + 1, x * 2 + 1, y * 2);
        stack.push(br || [], z + 1, x * 2 + 1, y * 2 + 1);
      }
    }
  }]);
  return GeoJSONTiler;
}();
exports.GeoJSONTiler = GeoJSONTiler;
function toID(z, x, y) {
  return ((1 << z) * y + x) * 32 + z;
}
//# sourceMappingURL=geojson-tiler.js.map