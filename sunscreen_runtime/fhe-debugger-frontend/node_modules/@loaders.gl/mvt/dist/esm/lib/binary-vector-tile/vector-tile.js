import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import VectorTileLayer from './vector-tile-layer';
export default class VectorTile {
  constructor(pbf, end) {
    _defineProperty(this, "layers", void 0);
    this.layers = pbf.readFields(readTile, {}, end);
  }
}
function readTile(tag, layers, pbf) {
  if (tag === 3) {
    if (pbf) {
      const layer = new VectorTileLayer(pbf, pbf.readVarint() + pbf.pos);
      if (layer.length && layers) {
        layers[layer.name] = layer;
      }
    }
  }
}
//# sourceMappingURL=vector-tile.js.map