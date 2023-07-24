import type { TextureLevel } from '@loaders.gl/schema';
/**
 * Check if data is in "PVR" format by its magic number
 * @param data - binary data of compressed texture
 * @returns true - data in "PVR" format, else - false
 */
export declare function isPVR(data: ArrayBuffer): boolean;
/**
 * Parse texture data as "PVR" format
 * @param data - binary data of compressed texture
 * @returns Array of the texture levels
 * @see http://cdn.imgtec.com/sdk-documentation/PVR+File+Format.Specification.pdf
 */
export declare function parsePVR(data: ArrayBuffer): TextureLevel[];
//# sourceMappingURL=parse-pvr.d.ts.map