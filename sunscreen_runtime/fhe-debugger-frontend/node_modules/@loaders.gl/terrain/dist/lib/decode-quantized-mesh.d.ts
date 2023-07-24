type Extensions = {
    vertexNormals?: any;
    waterMask?: any;
};
export declare const DECODING_STEPS: {
    header: number;
    vertices: number;
    triangleIndices: number;
    edgeIndices: number;
    extensions: number;
};
export default function decode(data: any, userOptions: any): {
    header: {};
    vertexData?: undefined;
    triangleIndices?: undefined;
    westIndices?: undefined;
    northIndices?: undefined;
    eastIndices?: undefined;
    southIndices?: undefined;
    extensions?: undefined;
} | {
    header: {};
    vertexData: Uint16Array;
    triangleIndices?: undefined;
    westIndices?: undefined;
    northIndices?: undefined;
    eastIndices?: undefined;
    southIndices?: undefined;
    extensions?: undefined;
} | {
    header: {};
    vertexData: Uint16Array;
    triangleIndices: any;
    westIndices?: undefined;
    northIndices?: undefined;
    eastIndices?: undefined;
    southIndices?: undefined;
    extensions?: undefined;
} | {
    header: {};
    vertexData: Uint16Array;
    triangleIndices: any;
    westIndices: any;
    northIndices: any;
    eastIndices: any;
    southIndices: any;
    extensions?: undefined;
} | {
    header: {};
    vertexData: Uint16Array;
    triangleIndices: any;
    westIndices: any;
    northIndices: any;
    eastIndices: any;
    southIndices: any;
    extensions: Extensions;
};
export {};
//# sourceMappingURL=decode-quantized-mesh.d.ts.map