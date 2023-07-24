import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { convert } from './convert';
import { clip } from './clip';
import { wrap } from './wrap';
import { transformTile } from './transform';
import { createTile } from './tile';
const DEFAULT_OPTIONS = {
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
export class GeoJSONTiler {
  constructor(data, options) {
    _defineProperty(this, "options", void 0);
    _defineProperty(this, "tiles", {});
    _defineProperty(this, "tileCoords", []);
    _defineProperty(this, "stats", {});
    _defineProperty(this, "total", 0);
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    };
    options = this.options;
    const debug = options.debug;
    if (debug) console.time('preprocess data');
    if (this.options.maxZoom < 0 || this.options.maxZoom > 24) {
      throw new Error('maxZoom should be in the 0-24 range');
    }
    if (options.promoteId && this.options.generateId) {
      throw new Error('promoteId and generateId cannot be used together.');
    }
    let features = convert(data, options);
    if (debug) {
      console.timeEnd('preprocess data');
      console.log('index: maxZoom: %d, maxPoints: %d', options.indexMaxZoom, options.indexMaxPoints);
      console.time('generate tiles');
    }
    features = wrap(features, this.options);
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
  getTile(z, x, y) {
    const {
      extent,
      debug
    } = this.options;
    if (z < 0 || z > 24) {
      return null;
    }
    const z2 = 1 << z;
    x = x + z2 & z2 - 1;
    const id = toID(z, x, y);
    if (this.tiles[id]) {
      return transformTile(this.tiles[id], extent);
    }
    if (debug > 1) console.log('drilling down to z%d-%d-%d', z, x, y);
    let z0 = z;
    let x0 = x;
    let y0 = y;
    let parent;
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
    return this.tiles[id] ? transformTile(this.tiles[id], extent) : null;
  }
  splitTile(features, z, x, y, cz, cx, cy) {
    const stack = [features, z, x, y];
    const options = this.options;
    const debug = options.debug;
    while (stack.length) {
      y = stack.pop();
      x = stack.pop();
      z = stack.pop();
      features = stack.pop();
      const z2 = 1 << z;
      const id = toID(z, x, y);
      let tile = this.tiles[id];
      if (!tile) {
        if (debug > 1) {
          console.time('creation');
        }
        tile = this.tiles[id] = createTile(features, z, x, y, options);
        this.tileCoords.push({
          z,
          x,
          y
        });
        if (debug) {
          if (debug > 1) {
            console.log('tile z%d-%d-%d (features: %d, points: %d, simplified: %d)', z, x, y, tile.numFeatures, tile.numPoints, tile.numSimplified);
            console.timeEnd('creation');
          }
          const key = "z".concat(z);
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
        const zoomSteps = cz - z;
        if (x !== cx >> zoomSteps || y !== cy >> zoomSteps) continue;
      }
      tile.source = null;
      if (features.length === 0) continue;
      if (debug > 1) console.time('clipping');
      const k1 = 0.5 * options.buffer / options.extent;
      const k2 = 0.5 - k1;
      const k3 = 0.5 + k1;
      const k4 = 1 + k1;
      let tl = null;
      let bl = null;
      let tr = null;
      let br = null;
      let left = clip(features, z2, x - k1, x + k3, 0, tile.minX, tile.maxX, options);
      let right = clip(features, z2, x + k2, x + k4, 0, tile.minX, tile.maxX, options);
      features = null;
      if (left) {
        tl = clip(left, z2, y - k1, y + k3, 1, tile.minY, tile.maxY, options);
        bl = clip(left, z2, y + k2, y + k4, 1, tile.minY, tile.maxY, options);
        left = null;
      }
      if (right) {
        tr = clip(right, z2, y - k1, y + k3, 1, tile.minY, tile.maxY, options);
        br = clip(right, z2, y + k2, y + k4, 1, tile.minY, tile.maxY, options);
        right = null;
      }
      if (debug > 1) console.timeEnd('clipping');
      stack.push(tl || [], z + 1, x * 2, y * 2);
      stack.push(bl || [], z + 1, x * 2, y * 2 + 1);
      stack.push(tr || [], z + 1, x * 2 + 1, y * 2);
      stack.push(br || [], z + 1, x * 2 + 1, y * 2 + 1);
    }
  }
}
function toID(z, x, y) {
  return ((1 << z) * y + x) * 32 + z;
}
//# sourceMappingURL=geojson-tiler.js.map