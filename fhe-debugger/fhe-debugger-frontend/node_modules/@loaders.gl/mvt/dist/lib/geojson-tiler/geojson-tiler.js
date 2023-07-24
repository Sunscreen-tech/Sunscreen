"use strict";
// loaders.gl, MIT license
// Forked from https://github.com/mapbox/geojson-vt under compatible ISC license
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoJSONTiler = void 0;
const convert_1 = require("./convert"); // GeoJSON conversion and preprocessing
const clip_1 = require("./clip"); // stripe clipping algorithm
const wrap_1 = require("./wrap"); // date line processing
const transform_1 = require("./transform"); // coordinate transformation
const tile_1 = require("./tile"); // final simplified tile generation
const DEFAULT_OPTIONS = {
    maxZoom: 14,
    indexMaxZoom: 5,
    indexMaxPoints: 100000,
    tolerance: 3,
    extent: 4096,
    buffer: 64,
    lineMetrics: false,
    // @ts-expect-error Ensures all these required params have defaults
    promoteId: undefined,
    generateId: false,
    debug: 0 // logging level (0, 1 or 2)
};
class GeoJSONTiler {
    constructor(data, options) {
        // tiles and tileCoords are part of the public API
        this.tiles = {};
        this.tileCoords = [];
        this.stats = {};
        this.total = 0;
        this.options = { ...DEFAULT_OPTIONS, ...options };
        options = this.options;
        const debug = options.debug;
        if (debug)
            console.time('preprocess data');
        if (this.options.maxZoom < 0 || this.options.maxZoom > 24) {
            throw new Error('maxZoom should be in the 0-24 range');
        }
        if (options.promoteId && this.options.generateId) {
            throw new Error('promoteId and generateId cannot be used together.');
        }
        // projects and adds simplification info
        let features = (0, convert_1.convert)(data, options);
        if (debug) {
            console.timeEnd('preprocess data');
            console.log('index: maxZoom: %d, maxPoints: %d', options.indexMaxZoom, options.indexMaxPoints);
            console.time('generate tiles');
        }
        // wraps features (ie extreme west and extreme east)
        features = (0, wrap_1.wrap)(features, this.options);
        // start slicing from the top tile down
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
    /**
     * Get a tile at the specified index
     * @param z
     * @param x
     * @param y
     * @returns
     */
    // eslint-disable-next-line complexity, max-statements
    getTile(z, x, y) {
        // z = +z;
        // x = +x;
        // y = +y;
        const { extent, debug } = this.options;
        if (z < 0 || z > 24) {
            return null;
        }
        const z2 = 1 << z;
        x = (x + z2) & (z2 - 1); // wrap tile x coordinate
        const id = toID(z, x, y);
        if (this.tiles[id]) {
            return (0, transform_1.transformTile)(this.tiles[id], extent);
        }
        if (debug > 1)
            console.log('drilling down to z%d-%d-%d', z, x, y);
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
        // if we found a parent tile containing the original geometry, we can drill down from it
        if (debug > 1) {
            console.log('found parent tile z%d-%d-%d', z0, x0, y0);
            console.time('drilling down');
        }
        this.splitTile(parent.source, z0, x0, y0, z, x, y);
        if (debug > 1) {
            console.timeEnd('drilling down');
        }
        return this.tiles[id] ? (0, transform_1.transformTile)(this.tiles[id], extent) : null;
    }
    /**
     * splits features from a parent tile to sub-tiles.
     * @param z, x, and y are the coordinates of the parent tile
     * @param cz, cx, and cy are the coordinates of the target tile
     *
     * If no target tile is specified, splitting stops when we reach the maximum
     * zoom or the number of points is low as specified in the options.
     */
    // eslint-disable-next-line max-params, max-statements, complexity
    splitTile(features, z, x, y, cz, cx, cy) {
        const stack = [features, z, x, y];
        const options = this.options;
        const debug = options.debug;
        // avoid recursion by using a processing queue
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
                tile = this.tiles[id] = (0, tile_1.createTile)(features, z, x, y, options);
                this.tileCoords.push({ z, x, y });
                if (debug) {
                    if (debug > 1) {
                        console.log('tile z%d-%d-%d (features: %d, points: %d, simplified: %d)', z, x, y, tile.numFeatures, tile.numPoints, tile.numSimplified);
                        console.timeEnd('creation');
                    }
                    const key = `z${z}`;
                    this.stats[key] = (this.stats[key] || 0) + 1;
                    this.total++;
                }
            }
            // save reference to original geometry in tile so that we can drill down later if we stop now
            tile.source = features;
            // if it's the first-pass tiling
            if (cz === undefined) {
                // stop tiling if we reached max zoom, or if the tile is too simple
                if (z === options.indexMaxZoom || tile.numPoints <= options.indexMaxPoints)
                    continue;
                // if a drilldown to a specific tile
            }
            else if (z === options.maxZoom || z === cz) {
                // stop tiling if we reached base zoom or our target tile zoom
                continue;
            }
            else if (cz !== undefined) {
                // stop tiling if it's not an ancestor of the target tile
                const zoomSteps = cz - z;
                // @ts-expect-error TODO fix the types of cx cy
                if (x !== cx >> zoomSteps || y !== cy >> zoomSteps)
                    continue;
            }
            // if we slice further down, no need to keep source geometry
            tile.source = null;
            if (features.length === 0)
                continue;
            if (debug > 1)
                console.time('clipping');
            // values we'll use for clipping
            const k1 = (0.5 * options.buffer) / options.extent;
            const k2 = 0.5 - k1;
            const k3 = 0.5 + k1;
            const k4 = 1 + k1;
            let tl = null;
            let bl = null;
            let tr = null;
            let br = null;
            let left = (0, clip_1.clip)(features, z2, x - k1, x + k3, 0, tile.minX, tile.maxX, options);
            let right = (0, clip_1.clip)(features, z2, x + k2, x + k4, 0, tile.minX, tile.maxX, options);
            // @ts-expect-error - unclear why this is needed?
            features = null;
            if (left) {
                tl = (0, clip_1.clip)(left, z2, y - k1, y + k3, 1, tile.minY, tile.maxY, options);
                bl = (0, clip_1.clip)(left, z2, y + k2, y + k4, 1, tile.minY, tile.maxY, options);
                left = null;
            }
            if (right) {
                tr = (0, clip_1.clip)(right, z2, y - k1, y + k3, 1, tile.minY, tile.maxY, options);
                br = (0, clip_1.clip)(right, z2, y + k2, y + k4, 1, tile.minY, tile.maxY, options);
                right = null;
            }
            if (debug > 1)
                console.timeEnd('clipping');
            stack.push(tl || [], z + 1, x * 2, y * 2);
            stack.push(bl || [], z + 1, x * 2, y * 2 + 1);
            stack.push(tr || [], z + 1, x * 2 + 1, y * 2);
            stack.push(br || [], z + 1, x * 2 + 1, y * 2 + 1);
        }
    }
}
exports.GeoJSONTiler = GeoJSONTiler;
function toID(z, x, y) {
    return ((1 << z) * y + x) * 32 + z;
}
