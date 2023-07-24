/** All capabilities of a WMS service - response to a WMS `GetCapabilities` data structure extracted from XML */
export type WMSCapabilities = {
    /** Version of the WMS service */
    version?: string;
    /** A short name for the service */
    name: string;
    /** A human readable name for the service */
    title?: string;
    /** A more extensive description of the service */
    abstract?: string;
    /** A set of keywords e.g. for searching services */
    keywords: string[];
    /** A field of unspecified format, if present describes any access constraints required to use the service. */
    accessConstraints?: string;
    /** A field of unspecified format, if present describes any fees associated with the use of the service */
    fees?: string;
    /** If present, the max number of layers that can be rendered by the service */
    layerLimit?: number;
    /** If present, the widest image that can be rendered by the service */
    maxWidth?: number;
    /** If present, the tallest image that can be rendered by the service */
    maxHeight?: number;
    /** Hierarchical list of layers. */
    layers: WMSLayer[];
    /** A map with information about supported WMS requests. If a record is present, the request is supported by the service */
    requests: Record<string, WMSRequest>;
    /** Information about any exceptions that the service will report (HTTP status != 2xx) */
    exceptions?: WMSExceptions;
    /** Only if `options.raw`: raw untyped JSON parsed from XML. Can include information not extracted in the typed response. */
    raw?: Record<string, unknown>;
    /** Only if `options.xml`, the unparsed XML string can be requested */
    xml?: string;
};
/**
 * Metadata about a layer
 * Layers inherit many properties from their parent layers, see description of individual props for details.
 * @see https://www.ogc.org/standard/wms/ 7.2.4.6
 */
export type WMSLayer = {
    /** The title is a human readable name. It is mandatory on each layer. Not inherited.  */
    title: string;
    /** A layer is renderable if it has a name. A named parent layer will render all its sublayers. Not inherited. */
    name?: string;
    /** A narrative description of the map layer. */
    abstract?: string;
    /** A set of keywords e.g. for searching layers */
    keywords: string[];
    /** layer limits in unspecified CRS:84-like lng/lat, for quick access w/o CRS calculations.  Defined or inherited. */
    geographicBoundingBox?: [min: [x: number, y: number], max: [x: number, y: number]];
    /** Supported CRS. Either defined or inherited. */
    crs?: string[];
    /** Bounding boxes in specific CRS:es */
    boundingBoxes?: WMSBoundingBox[];
    /** any extra dimension such as time */
    dimensions?: WMSDimension[];
    /** Whether queries can be performed on the layer */
    queryable?: boolean;
    /** `false` if layer has significant no-data areas that the client can display as transparent. */
    opaque?: boolean;
    /** WMS cascading allows server to expose layers coming from other WMS servers as if they were local layers */
    cascaded?: boolean;
    /** A list of styles. @note not yet supported by WMSCapabilitiesLoader */
    styles?: unknown[];
    /** Sublayers - these inherit crs and boundingBox) if not overridden) */
    layers?: WMSLayer[];
};
/**
 * A bounding box specifies the coordinate range for data in the layer.
 * No data is available outside the bounding box.
 */
export type WMSBoundingBox = {
    /** CRS indicates the Layer CRS that applies to this bounding box. */
    crs: string;
    /** `[[w, s], [e, n]]`, indicates the limits of the bounding box using the axis units and order of the specified CRS. */
    boundingBox: [min: [x: number, y: number], max: [x: number, y: number]];
    /** Spatial horizontal resolution of data in same units as bounding box */
    xResolution?: number;
    /** Spatial vertical resolution of data in same units as bounding box */
    yResolution?: number;
};
/**
 * An optional dimension that can be queried using the `name=...` parameter
 * Note that layers that have at least one dimension without `default` value
 * become unrenderable unless the dimension value is supplied to GetMap requests.
 */
export type WMSDimension = {
    /** name of dimension, becomes a valid parameter key for this layer */
    name: string;
    /** Textual units for this dimensional axis */
    units: string;
    /** Unit symbol for this dimensional axis */
    unitSymbol?: string;
    /** Default value if no value is supplied. If dimension lacks defaultValue, requests fail if no value is supplied */
    defaultValue?: string;
    /** Can multiple values of the dimension be requested? */
    multipleValues?: boolean;
    nearestValue?: boolean;
    /** A special value "current" is supported, typically for time dimension */
    current?: boolean;
    /** Text content indicating available values for dimension */
    extent: string;
};
/** Metadata about a supported WMS request  */
export type WMSRequest = {
    /** MIMEtypes that can be returned by this request. */
    mimeTypes: string[];
};
export type WMSExceptions = {
    /** MIME types for exception response payloads. */
    mimeTypes: string[];
};
export type ParseWMSCapabilitiesOptions = {
    /** Add inherited layer information to sub layers */
    inheritedLayerProps?: boolean;
    /** Include the "raw" JSON (parsed but untyped, unprocessed XML). May contain additional fields */
    includeRawData?: boolean;
    /** Include the original XML document text. May contain additional information. */
    includeXMLText?: boolean;
    /** @deprecated Use includeRawData` */
    raw?: boolean;
};
/**
 * Parses a typed data structure from raw XML for `GetCapabilities` response
 * @note Error handlings is fairly weak
 */
export declare function parseWMSCapabilities(xmlText: string, options?: ParseWMSCapabilitiesOptions): WMSCapabilities;
//# sourceMappingURL=parse-wms-capabilities.d.ts.map