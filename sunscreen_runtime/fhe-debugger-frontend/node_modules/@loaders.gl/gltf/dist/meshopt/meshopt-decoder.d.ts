export declare function isMeshoptSupported(): boolean;
export declare function meshoptDecodeVertexBuffer(target: Uint8Array, count: number, size: number, source: Uint8Array, filter?: string | number): Promise<void>;
export declare function meshoptDecodeIndexBuffer(target: Uint8Array, count: number, size: number, source: Uint8Array): Promise<void>;
export declare function meshoptDecodeIndexSequence(target: Uint8Array, count: number, size: number, source: Uint8Array): Promise<void>;
export declare function meshoptDecodeGltfBuffer(target: Uint8Array, count: number, size: number, source: Uint8Array, mode: string, filter?: string | number): Promise<void>;
//# sourceMappingURL=meshopt-decoder.d.ts.map