export type { GPUTextureFormat } from '@loaders.gl/schema';
export type { TextureLoaderOptions } from './compressed-texture-loader';
export { BasisLoader, BasisWorkerLoader } from './basis-loader';
export { CompressedTextureLoader, CompressedTextureWorkerLoader } from './compressed-texture-loader';
export { CrunchLoader } from './crunch-loader';
export { NPYLoader, NPYWorkerLoader } from './npy-loader';
export { CompressedTextureWriter } from './compressed-texture-writer';
export { KTX2BasisWriter } from './ktx2-basis-writer';
export declare const KTX2BasisWriterWorker: {
    name: string;
    id: string;
    module: string;
    version: any;
    extensions: string[];
    worker: boolean;
    options: {
        useSRGB: boolean;
        qualityLevel: number;
        encodeUASTC: boolean;
        mipmaps: boolean;
    };
};
export { loadImageTexture } from './lib/texture-api/load-image';
export { loadImageTextureArray } from './lib/texture-api/load-image-array';
export { loadImageTextureCube } from './lib/texture-api/load-image-cube';
export { GL_EXTENSIONS_CONSTANTS } from './lib/gl-extensions';
export { selectSupportedBasisFormat } from './lib/parsers/parse-basis';
export { getSupportedGPUTextureFormats } from './lib/utils/texture-formats';
export { CrunchLoader as CrunchWorkerLoader } from './crunch-loader';
//# sourceMappingURL=index.d.ts.map