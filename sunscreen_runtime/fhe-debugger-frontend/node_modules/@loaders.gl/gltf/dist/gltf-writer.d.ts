import type { Writer, WriterOptions } from '@loaders.gl/loader-utils';
export type GLTFWriterOptions = WriterOptions & {
    gltf?: {};
    byteOffset?: number;
};
/**
 * GLTF exporter
 */
export declare const GLTFWriter: {
    name: string;
    id: string;
    module: string;
    version: any;
    extensions: string[];
    mimeTypes: string[];
    binary: boolean;
    encodeSync: typeof encodeSync;
    options: {
        gltf: {};
    };
};
declare function encodeSync(gltf: any, options?: GLTFWriterOptions): ArrayBuffer;
export declare const _TypecheckGLBLoader: Writer;
export {};
//# sourceMappingURL=gltf-writer.d.ts.map