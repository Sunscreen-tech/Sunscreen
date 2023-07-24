import { ImageSource } from './sources/image-source';
import { ImageServiceProps } from './services/generic/image-service';
import type { WMSServiceProps } from './services/ogc/wms-service';
export type ImageServiceType = 'wms' | 'arcgis-image-server' | 'template';
type ImageSourceProps = ImageServiceProps & WMSServiceProps & {
    type?: ImageServiceType | 'auto';
};
/**
 * Creates an image source
 * If type is not supplied, will try to automatically detect the the
 * @param url URL to the image source
 * @param type type of source. if not known, set to 'auto'
 * @returns an ImageSource instance
 */
export declare function createImageSource(props: ImageSourceProps): ImageSource<ImageSourceProps>;
export {};
//# sourceMappingURL=create-image-source.d.ts.map