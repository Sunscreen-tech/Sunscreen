import type { TypedArray } from '@math.gl/core';
type Geometry = {
    mode: any;
    indices?: {
        size: number;
        values: TypedArray;
    };
    attributes?: {};
};
/**
 * Computes vertex normals for a geometry
 * @param param0
 * @returns
 */
export declare function computeVertexNormals(geometry: Geometry): Float32Array;
export {};
//# sourceMappingURL=compute-vertex-normals.d.ts.map