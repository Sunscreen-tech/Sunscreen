"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArcGISImageServer = void 0;
const image_source_1 = require("../../sources/image-source");
/**
 * ArcGIS ImageServer
 * Note - exports a big API, that could be exposed here if there is a use case
 * @see https://developers.arcgis.com/rest/services-reference/enterprise/image-service.htm
 */
class ArcGISImageServer extends image_source_1.ImageSource {
    constructor(props) {
        super(props);
    }
    // ImageSource (normalized endpoints)
    async getMetadata() {
        return (await this.metadata());
        // TODO - normalize metadata
    }
    async getImage(parameters) {
        throw new Error('not implemented');
        // TODO - Map generic parameters to ArcGIS specific parameters
        // return await this.exportImage(parameters);
    }
    // ImageServer endpoints
    async metadata() {
        // We just need a JSON parsing...
        // return this.getUrl({path: '', ...options});
        throw new Error('not implemented');
    }
    /**
     * Form a URL to an ESRI ImageServer
     // https://sampleserver6.arcgisonline.com/arcgis/rest/services/NLCDLandCover2001/ImageServer/exportImage?bbox=${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]}&bboxSR=4326&size=${width},${height}&imageSR=102100&time=&format=jpgpng&pixelType=U8&noData=&noDataInterpretation=esriNoDataMatchAny&interpolation=+RSP_NearestNeighbor&compression=&compressionQuality=&bandIds=&mosaicRule=&renderingRule=&f=image`,
     */
    exportImage(options) {
        // See WMSService.getMap()
        throw new Error('not implemented');
    }
    // URL creators
    metadataURL(options) {
        return `${this.props.url}?f=pjson`;
    }
    /**
     * Form a URL to an ESRI ImageServer
     // https://sampleserver6.arcgisonline.com/arcgis/rest/services/NLCDLandCover2001/ImageServer/exportImage?
     //   bbox=${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]}&bboxSR=4326&
     //   size=${width},${height}&imageSR=102100&time=&format=jpgpng&pixelType=U8&
     //   noData=&noDataInterpretation=esriNoDataMatchAny&interpolation=+RSP_NearestNeighbor&compression=&
     //   compressionQuality=&bandIds=&mosaicRule=&renderingRule=&
     //   f=image
     */
    exportImageURL(options) {
        const bbox = `bbox=${options.bbox[0]},${options.bbox[1]},${options.bbox[2]},${options.bbox[3]}`;
        const size = `size=${options.width},${options.height}`;
        const arcgisOptions = { ...options, bbox, size };
        // @ts-expect-error
        delete arcgisOptions.width;
        // @ts-expect-error
        delete arcgisOptions.height;
        return this.getUrl('exportImage', arcgisOptions);
    }
    // INTERNAL METHODS
    /**
     * @note protected, since perhaps getWMSUrl may need to be overridden to handle certain backends?
     * @note if override is common, maybe add a callback prop?
     * */
    getUrl(path, options, extra) {
        let url = `${this.props.url}/${path}`;
        let first = true;
        for (const [key, value] of Object.entries(options)) {
            url += first ? '?' : '&';
            first = false;
            if (Array.isArray(value)) {
                url += `${key.toUpperCase()}=${value.join(',')}`;
            }
            else {
                url += `${key.toUpperCase()}=${value ? String(value) : ''}`;
            }
        }
        return url;
    }
    /** Checks for and parses a WMS XML formatted ServiceError and throws an exception */
    async checkResponse(response) {
        if (!response.ok) {
            // } || response.headers['content-type'] === WMSErrorLoader.mimeTypes[0]) {
            // const arrayBuffer = await response.arrayBuffer();
            // const error = await WMSErrorLoader.parse(arrayBuffer, this.loadOptions);
            throw new Error('error');
        }
    }
}
ArcGISImageServer.type = 'arcgis-image-server';
ArcGISImageServer.testURL = (url) => url.toLowerCase().includes('ImageServer');
exports.ArcGISImageServer = ArcGISImageServer;
