import { LoaderOptions } from '@loaders.gl/loader-utils';
import type { ImageType } from '@loaders.gl/images';
import type { ImageSourceMetadata, GetImageParameters } from '../../sources/image-source';
import { ImageSource } from '../../sources/image-source';
/** Template URL string should contain `${width}` etc which will be substituted. */
export type ImageServiceProps = {
    /** Base URL to the service */
    url: string;
    /** Any load options to the loaders.gl Loaders used by the WMSService methods */
    loadOptions?: LoaderOptions;
};
/**
 * Quickly connect to "ad hoc" image sources without subclassing ImageSource.
 * ImageSource allows template url strings to be used to ad hoc connect to arbitrary image data sources
 * Accepts a template url string and builds requests URLs
 */
export declare class ImageService<PropsT extends ImageServiceProps> extends ImageSource<PropsT> {
    static type: 'template';
    static testURL: (url: string) => boolean;
    constructor(props: PropsT);
    getMetadata(): Promise<ImageSourceMetadata>;
    getImage(parameters: GetImageParameters): Promise<ImageType>;
    /** Break up bounding box in east, north, south, west */
    protected getGranularParameters(parameters: GetImageParameters): Record<string, unknown>;
    /** Supports both ${} and {} notations */
    protected getURLFromTemplate(parameters: Record<string, unknown>): string;
}
//# sourceMappingURL=image-service.d.ts.map