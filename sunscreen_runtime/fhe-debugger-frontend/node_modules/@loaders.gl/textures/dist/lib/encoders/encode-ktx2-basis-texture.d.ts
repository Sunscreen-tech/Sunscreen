import type { ImageDataType } from '@loaders.gl/images';
/**
 * Encodes image to Basis Universal Supercompressed GPU Texture.
 * Code example is taken from here - https://github.com/BinomialLLC/basis_universal/blob/master/webgl/ktx2_encode_test/index.html#L279
 * BasisEncoder API - https://github.com/BinomialLLC/basis_universal/blob/master/webgl/transcoder/basis_wrappers.cpp#L1712
 * @param image
 * @param options
 */
export declare function encodeKTX2BasisTexture(image: ImageDataType, options?: any): Promise<ArrayBuffer>;
//# sourceMappingURL=encode-ktx2-basis-texture.d.ts.map