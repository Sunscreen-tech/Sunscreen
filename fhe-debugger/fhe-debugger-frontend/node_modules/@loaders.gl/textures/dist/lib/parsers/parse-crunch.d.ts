import type { TextureLevel } from '@loaders.gl/schema';
/**
 * Parse texture data as "CRN" format.
 * Function is "async" as emscriptified decoder module is loaded asyncronously
 * @param data - binary data of compressed texture
 * @returns Promise of Array of the texture levels
 */
export declare function parseCrunch(data: any, options: any): Promise<TextureLevel[]>;
//# sourceMappingURL=parse-crunch.d.ts.map