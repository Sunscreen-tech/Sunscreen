import type { TextureLevel } from '@loaders.gl/schema';
export type BasisFormat = 'etc1' | 'etc2' | 'bc1' | 'bc3' | 'bc4' | 'bc5' | 'bc7-m6-opaque-only' | 'bc7-m5' | 'pvrtc1-4-rgb' | 'pvrtc1-4-rgba' | 'astc-4x4' | 'atc-rgb' | 'atc-rgba-interpolated-alpha' | 'rgba32' | 'rgb565' | 'bgr565' | 'rgba4444';
/**
 * parse data with a Binomial Basis_Universal module
 * @param data
 * @param options
 * @returns compressed texture data
 */
export default function parseBasis(data: ArrayBuffer, options: any): Promise<TextureLevel[][]>;
/**
 * Select transcode format from the list of supported formats
 * @returns key for OutputFormat map
 */
export declare function selectSupportedBasisFormat(): BasisFormat | {
    alpha: BasisFormat;
    noAlpha: BasisFormat;
};
//# sourceMappingURL=parse-basis.d.ts.map