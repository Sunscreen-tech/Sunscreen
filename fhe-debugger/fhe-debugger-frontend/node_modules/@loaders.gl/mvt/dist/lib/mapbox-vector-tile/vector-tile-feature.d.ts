import Protobuf from 'pbf';
import { MVTMapboxCoordinates, MVTMapboxGeometry } from '../types';
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
    static get types(): string[];
    constructor(pbf: Protobuf, end: number, extent: any, keys: string[], values: (string | number | boolean | null)[]);
    loadGeometry(): MVTMapboxGeometry;
    bbox(): number[];
    _toGeoJSON(transform: any): MVTMapboxCoordinates;
    toGeoJSON(options: {
        x: number;
        y: number;
        z: number;
    } | ((data: number[], feature: {
        extent: any;
    }) => void)): MVTMapboxCoordinates;
}
//# sourceMappingURL=vector-tile-feature.d.ts.map