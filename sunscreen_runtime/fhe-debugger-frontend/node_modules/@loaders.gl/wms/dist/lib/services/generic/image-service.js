"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageService = void 0;
const images_1 = require("@loaders.gl/images");
const image_source_1 = require("../../sources/image-source");
/**
 * Quickly connect to "ad hoc" image sources without subclassing ImageSource.
 * ImageSource allows template url strings to be used to ad hoc connect to arbitrary image data sources
 * Accepts a template url string and builds requests URLs
 */
class ImageService extends image_source_1.ImageSource {
    constructor(props) {
        super(props);
    }
    // IMAGE SOURCE API
    async getMetadata() {
        throw new Error('ImageSource.getMetadata not implemented');
    }
    async getImage(parameters) {
        const granularParameters = this.getGranularParameters(parameters);
        const url = this.getURLFromTemplate(granularParameters);
        const response = await this.fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await images_1.ImageLoader.parse(arrayBuffer);
    }
    // HELPERS
    /** Break up bounding box in east, north, south, west */
    getGranularParameters(parameters) {
        const [east, north, west, south] = parameters.bbox;
        return { ...parameters, east, north, south, west };
    }
    /** Supports both ${} and {} notations */
    getURLFromTemplate(parameters) {
        let url = this.props.url;
        for (const [key, value] of Object.entries(parameters)) {
            // TODO - parameter could be repeated
            // const regex = new RegExp(`\${${key}}`, 'g');
            url = url.replace(`\${${key}}`, String(value));
            url = url.replace(`{${key}}`, String(value));
        }
        return url;
    }
}
ImageService.type = 'template';
ImageService.testURL = (url) => url.toLowerCase().includes('{');
exports.ImageService = ImageService;
