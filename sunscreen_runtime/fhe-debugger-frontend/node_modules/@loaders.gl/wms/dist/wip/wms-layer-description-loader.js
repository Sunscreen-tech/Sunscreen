"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports._typecheckWMSFeatureInfoLoader = exports.WMSLayerDescriptionLoader = void 0;
const wms_capabilities_loader_1 = require("../wms-capabilities-loader");
const parse_wms_layer_description_1 = require("../lib/parsers/wms/parse-wms-layer-description");
/**
 * Loader for the response to the WMS DescribeLayer request
 */
exports.WMSLayerDescriptionLoader = {
    ...wms_capabilities_loader_1.WMSCapabilitiesLoader,
    id: 'wms-layer-description',
    name: 'WMS DescribeLayer',
    parse: async (arrayBuffer, options) => (0, parse_wms_layer_description_1.parseWMSLayerDescription)(new TextDecoder().decode(arrayBuffer), options),
    parseTextSync: (text, options) => (0, parse_wms_layer_description_1.parseWMSLayerDescription)(text, options)
};
exports._typecheckWMSFeatureInfoLoader = exports.WMSLayerDescriptionLoader;
