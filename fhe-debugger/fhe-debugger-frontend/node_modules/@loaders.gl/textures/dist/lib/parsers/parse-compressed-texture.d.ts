import type { TextureLevel } from '@loaders.gl/schema';
/**
 * Deduces format and parses compressed texture loaded in ArrayBuffer
 * @param data - binary data of compressed texture
 * @returns Array of the texture levels
 */
export declare function parseCompressedTexture(data: ArrayBuffer): TextureLevel[];
//# sourceMappingURL=parse-compressed-texture.d.ts.map