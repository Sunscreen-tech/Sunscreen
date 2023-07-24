import VectorTileFeature from './vector-tile-feature';
import Protobuf from 'pbf';
import { GeojsonGeometryInfo } from '@loaders.gl/schema';
export default class VectorTileLayer {
    version: number;
    name: string;
    extent: number;
    length: number;
    _pbf: Protobuf;
    _keys: string[];
    _values: (string | number | boolean | null)[];
    _features: number[];
    constructor(pbf: Protobuf, end: number);
    /**
     * return feature `i` from this layer as a `VectorTileFeature`
     *
     * @param index
     * @param geometryInfo
     * @returns {VectorTileFeature}
     */
    feature(i: number, geometryInfo: GeojsonGeometryInfo): VectorTileFeature;
}
//# sourceMappingURL=vector-tile-layer.d.ts.map