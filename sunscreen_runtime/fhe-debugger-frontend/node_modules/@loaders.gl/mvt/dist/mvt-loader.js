"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MVTLoader = exports.MVTWorkerLoader = void 0;
const parse_mvt_1 = __importDefault(require("./lib/parse-mvt"));
// __VERSION__ is injected by babel-plugin-version-inline
// @ts-ignore TS2304: Cannot find name '__VERSION__'.
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'latest';
const DEFAULT_MVT_LOADER_OPTIONS = {
    mvt: {
        shape: 'geojson',
        coordinates: 'local',
        layerProperty: 'layerName',
        layers: undefined,
        tileIndex: null
    }
};
/**
 * Worker loader for the Mapbox Vector Tile format
 */
exports.MVTWorkerLoader = {
    name: 'Mapbox Vector Tile',
    id: 'mvt',
    module: 'mvt',
    version: VERSION,
    // Note: ArcGIS uses '.pbf' extension and 'application/octet-stream'
    extensions: ['mvt', 'pbf'],
    mimeTypes: [
        'application/vnd.mapbox-vector-tile',
        'application/x-protobuf'
        // 'application/octet-stream'
    ],
    worker: true,
    category: 'geometry',
    options: DEFAULT_MVT_LOADER_OPTIONS
};
/**
 * Loader for the Mapbox Vector Tile format
 */
exports.MVTLoader = {
    ...exports.MVTWorkerLoader,
    parse: async (arrayBuffer, options) => (0, parse_mvt_1.default)(arrayBuffer, options),
    parseSync: parse_mvt_1.default,
    binary: true
};
