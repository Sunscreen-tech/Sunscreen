import VectorTileLayer from './vector-tile-layer';
import Protobuf from 'pbf';
export default class VectorTile {
    layers: {
        [x: string]: VectorTileLayer;
    };
    constructor(pbf: Protobuf, end?: number);
}
//# sourceMappingURL=vector-tile.d.ts.map