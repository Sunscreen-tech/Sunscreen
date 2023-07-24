"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.createImageSource = void 0;
const image_service_1 = require("./services/generic/image-service");
const wms_service_1 = require("./services/ogc/wms-service");
const arcgis_image_service_1 = require("./services/arcgis/arcgis-image-service");
const SERVICES = [wms_service_1.WMSService, arcgis_image_service_1.ArcGISImageServer, image_service_1.ImageService];
/**
 * Creates an image source
 * If type is not supplied, will try to automatically detect the the
 * @param url URL to the image source
 * @param type type of source. if not known, set to 'auto'
 * @returns an ImageSource instance
 */
function createImageSource(props) {
    const { type = 'auto' } = props;
    const serviceType = type === 'auto' ? guessServiceType(props.url) : type;
    switch (serviceType) {
        case 'template':
            return new image_service_1.ImageService(props);
        case 'wms':
            return new wms_service_1.WMSService(props);
        default:
            // currently only wms service supported
            throw new Error('Not a valid image source type');
    }
}
exports.createImageSource = createImageSource;
/** Guess service type from URL */
function guessServiceType(url) {
    for (const Service of SERVICES) {
        if (Service.testURL && Service.testURL(url)) {
            return Service.type;
        }
    }
    // If all else fails, guess that this is MS service
    return 'wms';
}
