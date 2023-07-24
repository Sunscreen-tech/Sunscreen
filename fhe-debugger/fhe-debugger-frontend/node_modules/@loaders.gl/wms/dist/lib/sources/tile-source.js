"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.TileSource = void 0;
const data_source_1 = require("./data-source");
/**
 * MapTileSource - data sources that allow data to be queried by (geospatial) extents
 * @note
 * - If geospatial, bounding box is expected to be in web mercator coordinates
 */
class TileSource extends data_source_1.DataSource {
}
exports.TileSource = TileSource;
