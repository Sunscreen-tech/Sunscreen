import type { TextureLevel } from '@loaders.gl/schema';
export type CompressedTextureExtractOptions = {
    mipMapLevels: number;
    width: number;
    height: number;
    sizeFunction: Function;
    internalFormat: number;
};
/**
 * Extract mipmap images from compressed texture buffer
 * @param data - binary data of compressed texture or Array of level objects
 * @param options.mipMapLevels - number of mipmap level inside image
 * @param options.width - width of 0 - level
 * @param options.height - height of 0 - level
 * @param options.sizeFunction - format-related function to calculate level size in bytes
 * @param options.internalFormat - WebGL compatible format code
 * @returns Array of the texture levels
 */
export declare function extractMipmapImages(data: Uint8Array | object[], options: CompressedTextureExtractOptions): TextureLevel[];
//# sourceMappingURL=extract-mipmap-images.d.ts.map