import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { classifyRings, project, readFeature } from '../../helpers/binary-util-functions';
let endPos;
let cmd;
let cmdLen;
let length;
let x;
let y;
let i;
export const TEST_EXPORTS = {
  classifyRings
};
export default class VectorTileFeature {
  constructor(pbf, end, extent, keys, values, geometryInfo) {
    _defineProperty(this, "properties", void 0);
    _defineProperty(this, "extent", void 0);
    _defineProperty(this, "type", void 0);
    _defineProperty(this, "id", void 0);
    _defineProperty(this, "_pbf", void 0);
    _defineProperty(this, "_geometry", void 0);
    _defineProperty(this, "_keys", void 0);
    _defineProperty(this, "_values", void 0);
    _defineProperty(this, "_geometryInfo", void 0);
    this.properties = {};
    this.extent = extent;
    this.type = 0;
    this.id = null;
    this._pbf = pbf;
    this._geometry = -1;
    this._keys = keys;
    this._values = values;
    this._geometryInfo = geometryInfo;
    pbf.readFields(readFeature, this, end);
  }
  loadGeometry() {
    const pbf = this._pbf;
    pbf.pos = this._geometry;
    endPos = pbf.readVarint() + pbf.pos;
    cmd = 1;
    length = 0;
    x = 0;
    y = 0;
    i = 0;
    const indices = [];
    const data = [];
    while (pbf.pos < endPos) {
      if (length <= 0) {
        cmdLen = pbf.readVarint();
        cmd = cmdLen & 0x7;
        length = cmdLen >> 3;
      }
      length--;
      if (cmd === 1 || cmd === 2) {
        x += pbf.readSVarint();
        y += pbf.readSVarint();
        if (cmd === 1) {
          indices.push(i);
        }
        data.push(x, y);
        i += 2;
      } else if (cmd === 7) {
        if (i > 0) {
          const start = indices[indices.length - 1];
          data.push(data[start], data[start + 1]);
          i += 2;
        }
      } else {
        throw new Error("unknown command ".concat(cmd));
      }
    }
    return {
      data,
      indices
    };
  }
  _toBinaryCoordinates(transform) {
    const geom = this.loadGeometry();
    let geometry;
    transform(geom.data, this);
    const coordLength = 2;
    switch (this.type) {
      case 1:
        this._geometryInfo.pointFeaturesCount++;
        this._geometryInfo.pointPositionsCount += geom.indices.length;
        geometry = {
          type: 'Point',
          ...geom
        };
        break;
      case 2:
        this._geometryInfo.lineFeaturesCount++;
        this._geometryInfo.linePathsCount += geom.indices.length;
        this._geometryInfo.linePositionsCount += geom.data.length / coordLength;
        geometry = {
          type: 'LineString',
          ...geom
        };
        break;
      case 3:
        geometry = classifyRings(geom);
        this._geometryInfo.polygonFeaturesCount++;
        this._geometryInfo.polygonObjectsCount += geometry.indices.length;
        for (const indices of geometry.indices) {
          this._geometryInfo.polygonRingsCount += indices.length;
        }
        this._geometryInfo.polygonPositionsCount += geometry.data.length / coordLength;
        break;
      default:
        throw new Error("Invalid geometry type: ".concat(this.type));
    }
    const result = {
      type: 'Feature',
      geometry,
      properties: this.properties
    };
    if (this.id !== null) {
      result.id = this.id;
    }
    return result;
  }
  toBinaryCoordinates(options) {
    if (typeof options === 'function') {
      return this._toBinaryCoordinates(options);
    }
    const {
      x,
      y,
      z
    } = options;
    const size = this.extent * Math.pow(2, z);
    const x0 = this.extent * x;
    const y0 = this.extent * y;
    return this._toBinaryCoordinates(data => project(data, x0, y0, size));
  }
}
//# sourceMappingURL=vector-tile-feature.js.map