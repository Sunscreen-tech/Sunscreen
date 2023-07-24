import Protobuf from 'pbf';
import { FlatFeature, FlatIndexedGeometry, GeojsonGeometryInfo } from '@loaders.gl/schema';
import { classifyRings } from '../../helpers/binary-util-functions';
export declare const TEST_EXPORTS: {
    classifyRings: typeof classifyRings;
};
export default class VectorTileFeature {
    properties: {
        [x: string]: string | number | boolean | null;
    };
    extent: any;
    type: number;
    id: number | null;
    _pbf: Protobuf;
    _geometry: number;
    _keys: string[];
    _values: (string | number | boolean | null)[];
    _geometryInfo: GeojsonGeometryInfo;
    constructor(pbf: Protobuf, end: number, extent: any, keys: string[], values: (string | number | boolean | null)[], geometryInfo: GeojsonGeometryInfo);
    loadGeometry(): FlatIndexedGeometry;
    /**
     *
     * @param transform
     * @returns result
     */
    _toBinaryCoordinates(transform: any): {
        type: "Feature";
        geometry: import("@loaders.gl/schema").FlatGeometry;
        id?: string | number | undefined;
        properties: import("geojson").GeoJsonProperties;
        bbox?: import("geojson").BBox | undefined;
    };
    toBinaryCoordinates(options: {
        x: number;
        y: number;
        z: number;
    } | ((data: number[], feature: {
        extent: any;
    }) => void)): FlatFeature;
}
//# sourceMappingURL=vector-tile-feature.d.ts.map