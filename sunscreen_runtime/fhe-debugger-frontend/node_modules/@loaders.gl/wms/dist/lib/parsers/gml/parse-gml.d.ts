import type { Geometry, Position } from '@loaders.gl/schema';
export type ParseGMLOptions = {
    transformCoords?: Function;
    stride?: 2 | 3 | 4;
};
export type ParseGMLContext = {
    srsDimension?: number;
    [key: string]: any;
};
/**
 * Parses a typed data structure from raw XML for GML features
 * @note Error handlings is fairly weak
 */
export declare function parseGML(text: string, options: any): Geometry | null;
/** Parse a GeoJSON geometry from GML XML */
export declare function parseGMLToGeometry(inputXML: any, options: ParseGMLOptions, context: ParseGMLContext): Geometry | null;
export declare function parsePosList(xml: any, options: ParseGMLOptions, context: ParseGMLContext): Position[];
export declare function parsePos(xml: any, options: ParseGMLOptions, context: ParseGMLContext): Position;
export declare function parsePoint(xml: any, options: ParseGMLOptions, context: ParseGMLContext): number[];
export declare function parseLinearRingOrLineString(xml: any, options: ParseGMLOptions, context: ParseGMLContext): Position[];
export declare function parseCurveSegments(xml: any, options: ParseGMLOptions, context: ParseGMLContext): Position[];
export declare function parseRing(xml: any, options: ParseGMLOptions, context: ParseGMLContext): Position[];
export declare function parseExteriorOrInterior(xml: any, options: ParseGMLOptions, context: ParseGMLContext): Position[];
export declare function parsePolygonOrRectangle(xml: any, options: ParseGMLOptions, context: ParseGMLContext): Position[][];
export declare function parseSurface(xml: any, options: ParseGMLOptions, context: ParseGMLContext): Position[][][];
export declare function parseCompositeSurface(xml: any, options: ParseGMLOptions, context: ParseGMLContext): Position[][][];
export declare function parseMultiSurface(xml: any, options: ParseGMLOptions, context: ParseGMLContext): Position[][][];
//# sourceMappingURL=parse-gml.d.ts.map