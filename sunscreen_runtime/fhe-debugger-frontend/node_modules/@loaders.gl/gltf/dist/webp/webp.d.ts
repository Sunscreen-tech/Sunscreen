export type WebPFeature = 'lossy' | 'lossless' | 'alpha' | 'animation';
/**
 * Checks if WebP is supported
 * @param features Array, can include 'lossy', 'lossless', 'alpha' or 'animation'
 */
export declare function isWebPSupported(features?: WebPFeature[]): Promise<boolean>;
//# sourceMappingURL=webp.d.ts.map