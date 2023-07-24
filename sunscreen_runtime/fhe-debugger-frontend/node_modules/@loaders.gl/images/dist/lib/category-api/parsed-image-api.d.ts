import type { ImageType, ImageTypeEnum, ImageDataType } from '../../types';
export declare function isImage(image: ImageType): boolean;
export declare function deleteImage(image: ImageType): void;
export declare function getImageType(image: ImageType): ImageTypeEnum;
export declare function getImageSize(image: ImageType): {
    width: number;
    height: number;
};
export declare function getImageData(image: ImageType): ImageDataType | ImageData;
//# sourceMappingURL=parsed-image-api.d.ts.map