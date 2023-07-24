"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _vectorTileLayer = _interopRequireDefault(require("./vector-tile-layer"));
var VectorTile = (0, _createClass2.default)(function VectorTile(pbf, end) {
  (0, _classCallCheck2.default)(this, VectorTile);
  (0, _defineProperty2.default)(this, "layers", void 0);
  this.layers = pbf.readFields(readTile, {}, end);
});
exports.default = VectorTile;
function readTile(tag, layers, pbf) {
  if (tag === 3) {
    if (pbf) {
      var layer = new _vectorTileLayer.default(pbf, pbf.readVarint() + pbf.pos);
      if (layer.length && layers) {
        layers[layer.name] = layer;
      }
    }
  }
}
//# sourceMappingURL=vector-tile.js.map