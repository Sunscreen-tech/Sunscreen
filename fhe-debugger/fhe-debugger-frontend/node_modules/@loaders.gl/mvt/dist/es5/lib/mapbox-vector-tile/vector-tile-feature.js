"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _mapboxUtilFunctions = require("../../helpers/mapbox-util-functions");
var VectorTileFeature = function () {
  function VectorTileFeature(pbf, end, extent, keys, values) {
    (0, _classCallCheck2.default)(this, VectorTileFeature);
    (0, _defineProperty2.default)(this, "properties", void 0);
    (0, _defineProperty2.default)(this, "extent", void 0);
    (0, _defineProperty2.default)(this, "type", void 0);
    (0, _defineProperty2.default)(this, "id", void 0);
    (0, _defineProperty2.default)(this, "_pbf", void 0);
    (0, _defineProperty2.default)(this, "_geometry", void 0);
    (0, _defineProperty2.default)(this, "_keys", void 0);
    (0, _defineProperty2.default)(this, "_values", void 0);
    this.properties = {};
    this.extent = extent;
    this.type = 0;
    this.id = null;
    this._pbf = pbf;
    this._geometry = -1;
    this._keys = keys;
    this._values = values;
    pbf.readFields(_mapboxUtilFunctions.readFeature, this, end);
  }
  (0, _createClass2.default)(VectorTileFeature, [{
    key: "loadGeometry",
    value: function loadGeometry() {
      var pbf = this._pbf;
      pbf.pos = this._geometry;
      var end = pbf.readVarint() + pbf.pos;
      var cmd = 1;
      var length = 0;
      var x = 0;
      var y = 0;
      var lines = [];
      var line;
      while (pbf.pos < end) {
        if (length <= 0) {
          var cmdLen = pbf.readVarint();
          cmd = cmdLen & 0x7;
          length = cmdLen >> 3;
        }
        length--;
        if (cmd === 1 || cmd === 2) {
          x += pbf.readSVarint();
          y += pbf.readSVarint();
          if (cmd === 1) {
            if (line) lines.push(line);
            line = [];
          }
          if (line) line.push([x, y]);
        } else if (cmd === 7) {
          if (line) {
            line.push(line[0].slice());
          }
        } else {
          throw new Error("unknown command ".concat(cmd));
        }
      }
      if (line) lines.push(line);
      return lines;
    }
  }, {
    key: "bbox",
    value: function bbox() {
      var pbf = this._pbf;
      pbf.pos = this._geometry;
      var end = pbf.readVarint() + pbf.pos;
      var cmd = 1;
      var length = 0;
      var x = 0;
      var y = 0;
      var x1 = Infinity;
      var x2 = -Infinity;
      var y1 = Infinity;
      var y2 = -Infinity;
      while (pbf.pos < end) {
        if (length <= 0) {
          var cmdLen = pbf.readVarint();
          cmd = cmdLen & 0x7;
          length = cmdLen >> 3;
        }
        length--;
        if (cmd === 1 || cmd === 2) {
          x += pbf.readSVarint();
          y += pbf.readSVarint();
          if (x < x1) x1 = x;
          if (x > x2) x2 = x;
          if (y < y1) y1 = y;
          if (y > y2) y2 = y;
        } else if (cmd !== 7) {
          throw new Error("unknown command ".concat(cmd));
        }
      }
      return [x1, y1, x2, y2];
    }
  }, {
    key: "_toGeoJSON",
    value: function _toGeoJSON(transform) {
      var coords = this.loadGeometry();
      var type = VectorTileFeature.types[this.type];
      var i;
      var j;
      switch (this.type) {
        case 1:
          var points = [];
          for (i = 0; i < coords.length; i++) {
            points[i] = coords[i][0];
          }
          coords = points;
          transform(coords, this);
          break;
        case 2:
          for (i = 0; i < coords.length; i++) {
            transform(coords[i], this);
          }
          break;
        case 3:
          coords = (0, _mapboxUtilFunctions.classifyRings)(coords);
          for (i = 0; i < coords.length; i++) {
            for (j = 0; j < coords[i].length; j++) {
              transform(coords[i][j], this);
            }
          }
          break;
      }
      if (coords.length === 1) {
        coords = coords[0];
      } else {
        type = "Multi".concat(type);
      }
      var result = {
        type: 'Feature',
        geometry: {
          type: type,
          coordinates: coords
        },
        properties: this.properties
      };
      if (this.id !== null) {
        result.id = this.id;
      }
      return result;
    }
  }, {
    key: "toGeoJSON",
    value: function toGeoJSON(options) {
      if (typeof options === 'function') {
        return this._toGeoJSON(options);
      }
      var x = options.x,
        y = options.y,
        z = options.z;
      var size = this.extent * Math.pow(2, z);
      var x0 = this.extent * x;
      var y0 = this.extent * y;
      function project(line) {
        for (var j = 0; j < line.length; j++) {
          var p = line[j];
          p[0] = (p[0] + x0) * 360 / size - 180;
          var y2 = 180 - (p[1] + y0) * 360 / size;
          p[1] = 360 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180)) - 90;
        }
      }
      return this._toGeoJSON(project);
    }
  }], [{
    key: "types",
    get: function get() {
      return ['Unknown', 'Point', 'LineString', 'Polygon'];
    }
  }]);
  return VectorTileFeature;
}();
exports.default = VectorTileFeature;
//# sourceMappingURL=vector-tile-feature.js.map