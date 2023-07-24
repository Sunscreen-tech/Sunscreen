import type { GetUrl, UrlOptions } from './texture-api-types';
export declare function loadImageTexture(getUrl: string | GetUrl, options?: {}): Promise<any>;
export declare function getImageUrls(getUrl: string | GetUrl, options: any, urlOptions?: UrlOptions): Promise<any>;
export declare function getMipLevels(size: {
    width: number;
    height: number;
}): number;
//# sourceMappingURL=load-image.d.ts.map