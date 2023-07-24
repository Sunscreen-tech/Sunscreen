import type { Feature } from '@loaders.gl/schema';
import type { GeoJSONTileFeature } from './tile';
export declare function convert(data: Feature, options: any): GeoJSONTileFeature[];
export type ConvertFeatureOptions = {
    maxZoom?: number;
    tolerance: number;
    extent: number;
    lineMetrics: boolean;
};
//# sourceMappingURL=convert.d.ts.map