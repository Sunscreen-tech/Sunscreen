import { ImageType } from '@loaders.gl/images';
import type { ImageSourceMetadata, GetImageParameters } from '../../sources/image-source';
import type { ImageSourceProps } from '../../sources/image-source';
import { ImageSource } from '../../sources/image-source';
export type ArcGISImageServerProps = ImageSourceProps & {
    url: string;
};
/**
 * ArcGIS ImageServer
 * Note - exports a big API, that could be exposed here if there is a use case
 * @see https://developers.arcgis.com/rest/services-reference/enterprise/image-service.htm
 */
export declare class ArcGISImageServer extends ImageSource<ArcGISImageServerProps> {
    static type: 'arcgis-image-server';
    static testURL: (url: string) => boolean;
    constructor(props: ArcGISImageServerProps);
    getMetadata(): Promise<ImageSourceMetadata>;
    getImage(parameters: GetImageParameters): Promise<ImageType>;
    metadata(): Promise<unknown>;
    /**
     * Form a URL to an ESRI ImageServer
     // https://sampleserver6.arcgisonline.com/arcgis/rest/services/NLCDLandCover2001/ImageServer/exportImage?bbox=${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]}&bboxSR=4326&size=${width},${height}&imageSR=102100&time=&format=jpgpng&pixelType=U8&noData=&noDataInterpretation=esriNoDataMatchAny&interpolation=+RSP_NearestNeighbor&compression=&compressionQuality=&bandIds=&mosaicRule=&renderingRule=&f=image`,
     */
    exportImage(options: {
        boundingBox: [number, number, number, number];
        boundingBoxSR?: string;
        width: number;
        height: number;
        imageSR?: string;
        time?: never;
        format?: 'jpgpng';
        pixelType?: 'U8';
        noData?: never;
        noDataInterpretation?: 'esriNoDataMatchAny';
        interpolation?: '+RSP_NearestNeighbor';
        compression?: never;
        compressionQuality?: never;
        bandIds?: never;
        mosaicRule?: never;
        renderingRule?: never;
        f?: 'image';
    }): Promise<ImageType>;
    metadataURL(options: {
        parameters?: Record<string, unknown>;
    }): string;
    /**
     * Form a URL to an ESRI ImageServer
     // https://sampleserver6.arcgisonline.com/arcgis/rest/services/NLCDLandCover2001/ImageServer/exportImage?
     //   bbox=${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]}&bboxSR=4326&
     //   size=${width},${height}&imageSR=102100&time=&format=jpgpng&pixelType=U8&
     //   noData=&noDataInterpretation=esriNoDataMatchAny&interpolation=+RSP_NearestNeighbor&compression=&
     //   compressionQuality=&bandIds=&mosaicRule=&renderingRule=&
     //   f=image
     */
    exportImageURL(options: {
        bbox: [number, number, number, number];
        boxSR?: string;
        width: number;
        height: number;
        imageSR?: string;
        time?: never;
        format?: 'jpgpng';
        pixelType?: 'U8';
        noData?: never;
        noDataInterpretation?: 'esriNoDataMatchAny';
        interpolation?: '+RSP_NearestNeighbor';
        compression?: never;
        compressionQuality?: never;
        bandIds?: never;
        mosaicRule?: never;
        renderingRule?: never;
        f?: 'image';
    }): string;
    /**
     * @note protected, since perhaps getWMSUrl may need to be overridden to handle certain backends?
     * @note if override is common, maybe add a callback prop?
     * */
    protected getUrl(path: string, options: Record<string, unknown>, extra?: Record<string, unknown>): string;
    /** Checks for and parses a WMS XML formatted ServiceError and throws an exception */
    protected checkResponse(response: Response): Promise<void>;
}
//# sourceMappingURL=arcgis-image-service.d.ts.map