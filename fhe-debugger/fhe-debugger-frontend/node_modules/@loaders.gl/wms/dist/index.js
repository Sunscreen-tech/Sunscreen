"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports._ArcGISImageServer = exports._getArcGISServices = exports.WMSService = exports.CSWService = exports.ImageService = exports.createImageSource = exports.ImageSource = exports._GMLLoader = exports._WFSCapabilitiesLoader = exports._WMSLayerDescriptionLoader = exports._WMSFeatureInfoLoader = exports.WMSCapabilitiesLoader = exports.WMSErrorLoader = exports.CSWRecordsLoader = exports.CSWDomainLoader = exports.CSWCapabilitiesLoader = void 0;
var csw_capabilities_loader_1 = require("./csw-capabilities-loader");
Object.defineProperty(exports, "CSWCapabilitiesLoader", { enumerable: true, get: function () { return csw_capabilities_loader_1.CSWCapabilitiesLoader; } });
var csw_domain_loader_1 = require("./csw-domain-loader");
Object.defineProperty(exports, "CSWDomainLoader", { enumerable: true, get: function () { return csw_domain_loader_1.CSWDomainLoader; } });
var csw_records_loader_1 = require("./csw-records-loader");
Object.defineProperty(exports, "CSWRecordsLoader", { enumerable: true, get: function () { return csw_records_loader_1.CSWRecordsLoader; } });
// WMS - Web Map Service
var wms_error_loader_1 = require("./wms-error-loader");
Object.defineProperty(exports, "WMSErrorLoader", { enumerable: true, get: function () { return wms_error_loader_1.WMSErrorLoader; } });
var wms_capabilities_loader_1 = require("./wms-capabilities-loader");
Object.defineProperty(exports, "WMSCapabilitiesLoader", { enumerable: true, get: function () { return wms_capabilities_loader_1.WMSCapabilitiesLoader; } });
var wms_feature_info_loader_1 = require("./wip/wms-feature-info-loader");
Object.defineProperty(exports, "_WMSFeatureInfoLoader", { enumerable: true, get: function () { return wms_feature_info_loader_1.WMSFeatureInfoLoader; } });
var wms_layer_description_loader_1 = require("./wip/wms-layer-description-loader");
Object.defineProperty(exports, "_WMSLayerDescriptionLoader", { enumerable: true, get: function () { return wms_layer_description_loader_1.WMSLayerDescriptionLoader; } });
var wfs_capabilities_loader_1 = require("./wip/wfs-capabilities-loader");
Object.defineProperty(exports, "_WFSCapabilitiesLoader", { enumerable: true, get: function () { return wfs_capabilities_loader_1.WFSCapabilitiesLoader; } });
var gml_loader_1 = require("./gml-loader");
Object.defineProperty(exports, "_GMLLoader", { enumerable: true, get: function () { return gml_loader_1.GMLLoader; } });
var image_source_1 = require("./lib/sources/image-source");
Object.defineProperty(exports, "ImageSource", { enumerable: true, get: function () { return image_source_1.ImageSource; } });
var create_image_source_1 = require("./lib/create-image-source");
Object.defineProperty(exports, "createImageSource", { enumerable: true, get: function () { return create_image_source_1.createImageSource; } });
var image_service_1 = require("./lib/services/generic/image-service");
Object.defineProperty(exports, "ImageService", { enumerable: true, get: function () { return image_service_1.ImageService; } });
// OGC Services
var csw_service_1 = require("./lib/services/ogc/csw-service");
Object.defineProperty(exports, "CSWService", { enumerable: true, get: function () { return csw_service_1.CSWService; } });
var wms_service_1 = require("./lib/services/ogc/wms-service");
Object.defineProperty(exports, "WMSService", { enumerable: true, get: function () { return wms_service_1.WMSService; } });
// ArcGIS Services
var arcgis_server_1 = require("./lib/services/arcgis/arcgis-server");
Object.defineProperty(exports, "_getArcGISServices", { enumerable: true, get: function () { return arcgis_server_1.getArcGISServices; } });
var arcgis_image_service_1 = require("./lib/services/arcgis/arcgis-image-service");
Object.defineProperty(exports, "_ArcGISImageServer", { enumerable: true, get: function () { return arcgis_image_service_1.ArcGISImageServer; } });
