import type { GetUrl, UrlOptions } from './texture-api-types';
export type ImageCubeTexture = {
    GL_TEXTURE_CUBE_MAP_POSITIVE_X: any;
    GL_TEXTURE_CUBE_MAP_NEGATIVE_X: any;
    GL_TEXTURE_CUBE_MAP_POSITIVE_Y: any;
    GL_TEXTURE_CUBE_MAP_NEGATIVE_Y: any;
    GL_TEXTURE_CUBE_MAP_POSITIVE_Z: any;
    GL_TEXTURE_CUBE_MAP_NEGATIVE_Z: any;
};
export declare function getImageCubeUrls(getUrl: GetUrl, options: UrlOptions): Promise<Record<number, string | string[]>>;
export declare function loadImageTextureCube(getUrl: GetUrl, options?: {}): Promise<ImageCubeTexture>;
//# sourceMappingURL=load-image-cube.d.ts.map