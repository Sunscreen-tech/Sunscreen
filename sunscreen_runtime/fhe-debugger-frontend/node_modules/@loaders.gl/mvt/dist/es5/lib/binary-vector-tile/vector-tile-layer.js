"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _vectorTileFeature = _interopRequireDefault(require("./vector-tile-feature"));
var VectorTileLayer = function () {
  function VectorTileLayer(pbf, end) {
    (0, _classCallCheck2.default)(this, VectorTileLayer);
    (0, _defineProperty2.default)(this, "version", void 0);
    (0, _defineProperty2.default)(this, "name", void 0);
    (0, _defineProperty2.default)(this, "extent", void 0);
    (0, _defineProperty2.default)(this, "length", void 0);
    (0, _defineProperty2.default)(this, "_pbf", void 0);
    (0, _defineProperty2.default)(this, "_keys", void 0);
    (0, _defineProperty2.default)(this, "_values", void 0);
    (0, _defineProperty2.default)(this, "_features", void 0);
    this.version = 1;
    this.name = '';
    this.extent = 4096;
    this.length = 0;
    this._pbf = pbf;
    this._keys = [];
    this._values = [];
    this._features = [];
    pbf.readFields(readLayer, this, end);
    this.length = this._features.length;
  }
  (0, _createClass2.default)(VectorTileLayer, [{
    key: "feature",
    value: function feature(i, geometryInfo) {
      if (i < 0 || i >= this._features.length) {
        throw new Error('feature index out of bounds');
      }
      this._pbf.pos = this._features[i];
      var end = this._pbf.readVarint() + this._pbf.pos;
      return new _vectorTileFeature.default(this._pbf, end, this.extent, this._keys, this._values, geometryInfo);
    }
  }]);
  return VectorTileLayer;
}();
exports.default = VectorTileLayer;
function readLayer(tag, layer, pbf) {
  if (layer && pbf) {
    if (tag === 15) layer.version = pbf.readVarint();else if (tag === 1) layer.name = pbf.readString();else if (tag === 5) layer.extent = pbf.readVarint();else if (tag === 2) layer._features.push(pbf.pos);else if (tag === 3) layer._keys.push(pbf.readString());else if (tag === 4) layer._values.push(readValueMessage(pbf));
  }
}
function readValueMessage(pbf) {
  var value = null;
  var end = pbf.readVarint() + pbf.pos;
  while (pbf.pos < end) {
    var tag = pbf.readVarint() >> 3;
    value = tag === 1 ? pbf.readString() : tag === 2 ? pbf.readFloat() : tag === 3 ? pbf.readDouble() : tag === 4 ? pbf.readVarint64() : tag === 5 ? pbf.readVarint() : tag === 6 ? pbf.readSVarint() : tag === 7 ? pbf.readBoolean() : null;
  }
  return value;
}
//# sourceMappingURL=vector-tile-layer.js.map