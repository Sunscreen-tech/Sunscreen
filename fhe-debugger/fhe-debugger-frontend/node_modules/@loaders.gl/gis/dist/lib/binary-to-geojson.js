"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.binaryToGeometry = exports.binaryToGeoJson = exports.binaryToGeojson = void 0;
/**
 * Convert binary geometry representation to GeoJSON
 * @param data   geometry data in binary representation
 * @param options
 * @param options.type  Input data type: Point, LineString, or Polygon
 * @param options.featureId  Global feature id. If specified, only a single feature is extracted
 * @return GeoJSON objects
 */
function binaryToGeojson(data, options) {
    const globalFeatureId = options?.globalFeatureId;
    if (globalFeatureId !== undefined) {
        return getSingleFeature(data, globalFeatureId);
    }
    return parseFeatures(data, options?.type);
}
exports.binaryToGeojson = binaryToGeojson;
/** @deprecated use `binaryToGeojson` or `binaryToGeometry` instead */
function binaryToGeoJson(data, type, format = 'feature') {
    switch (format) {
        case 'feature':
            return parseFeatures(data, type);
        case 'geometry':
            return binaryToGeometry(data);
        default:
            throw new Error(format);
    }
}
exports.binaryToGeoJson = binaryToGeoJson;
/**
 * Return a single feature from a binary geometry representation as GeoJSON
 * @param data   geometry data in binary representation
 * @return GeoJSON feature
 */
function getSingleFeature(data, globalFeatureId) {
    const dataArray = normalizeInput(data);
    for (const data of dataArray) {
        let lastIndex = 0;
        let lastValue = data.featureIds.value[0];
        // Scan through data until we find matching feature
        for (let i = 0; i < data.featureIds.value.length; i++) {
            const currValue = data.featureIds.value[i];
            if (currValue === lastValue) {
                // eslint-disable-next-line no-continue
                continue;
            }
            if (globalFeatureId === data.globalFeatureIds.value[lastIndex]) {
                return parseFeature(data, lastIndex, i);
            }
            lastIndex = i;
            lastValue = currValue;
        }
        if (globalFeatureId === data.globalFeatureIds.value[lastIndex]) {
            return parseFeature(data, lastIndex, data.featureIds.value.length);
        }
    }
    throw new Error(`featureId:${globalFeatureId} not found`);
}
function parseFeatures(data, type) {
    const dataArray = normalizeInput(data, type);
    return parseFeatureCollection(dataArray);
}
/** Parse input binary data and return a valid GeoJSON geometry object */
function binaryToGeometry(data, startIndex, endIndex) {
    switch (data.type) {
        case 'Point':
            return pointToGeoJson(data, startIndex, endIndex);
        case 'LineString':
            return lineStringToGeoJson(data, startIndex, endIndex);
        case 'Polygon':
            return polygonToGeoJson(data, startIndex, endIndex);
        default:
            const unexpectedInput = data;
            throw new Error(`Unsupported geometry type: ${unexpectedInput?.type}`);
    }
}
exports.binaryToGeometry = binaryToGeometry;
// Normalize features
// Return an array of data objects, each of which have a type key
function normalizeInput(data, type) {
    const isHeterogeneousType = Boolean(data.points || data.lines || data.polygons);
    if (!isHeterogeneousType) {
        // @ts-expect-error This is a legacy check which allowed `data` to be an instance of the values
        // here. Aka the new data.points, data.lines, or data.polygons.
        data.type = type || parseType(data);
        return [data];
    }
    const features = [];
    if (data.points) {
        data.points.type = 'Point';
        features.push(data.points);
    }
    if (data.lines) {
        data.lines.type = 'LineString';
        features.push(data.lines);
    }
    if (data.polygons) {
        data.polygons.type = 'Polygon';
        features.push(data.polygons);
    }
    return features;
}
/** Parse input binary data and return an array of GeoJSON Features */
function parseFeatureCollection(dataArray) {
    const features = [];
    for (const data of dataArray) {
        if (data.featureIds.value.length === 0) {
            // eslint-disable-next-line no-continue
            continue;
        }
        let lastIndex = 0;
        let lastValue = data.featureIds.value[0];
        // Need to deduce start, end indices of each feature
        for (let i = 0; i < data.featureIds.value.length; i++) {
            const currValue = data.featureIds.value[i];
            if (currValue === lastValue) {
                // eslint-disable-next-line no-continue
                continue;
            }
            features.push(parseFeature(data, lastIndex, i));
            lastIndex = i;
            lastValue = currValue;
        }
        // Last feature
        features.push(parseFeature(data, lastIndex, data.featureIds.value.length));
    }
    return features;
}
/** Parse input binary data and return a single GeoJSON Feature */
function parseFeature(data, startIndex, endIndex) {
    const geometry = binaryToGeometry(data, startIndex, endIndex);
    const properties = parseProperties(data, startIndex, endIndex);
    const fields = parseFields(data, startIndex, endIndex);
    return { type: 'Feature', geometry, properties, ...fields };
}
/** Parse input binary data and return an object of fields */
function parseFields(data, startIndex = 0, endIndex) {
    return data.fields && data.fields[data.featureIds.value[startIndex]];
}
/** Parse input binary data and return an object of properties */
function parseProperties(data, startIndex = 0, endIndex) {
    const properties = Object.assign({}, data.properties[data.featureIds.value[startIndex]]);
    for (const key in data.numericProps) {
        properties[key] = data.numericProps[key].value[startIndex];
    }
    return properties;
}
/** Parse binary data of type Polygon */
function polygonToGeoJson(data, startIndex = -Infinity, endIndex = Infinity) {
    const { positions } = data;
    const polygonIndices = data.polygonIndices.value.filter((x) => x >= startIndex && x <= endIndex);
    const primitivePolygonIndices = data.primitivePolygonIndices.value.filter((x) => x >= startIndex && x <= endIndex);
    const multi = polygonIndices.length > 2;
    // Polygon
    if (!multi) {
        const coordinates = [];
        for (let i = 0; i < primitivePolygonIndices.length - 1; i++) {
            const startRingIndex = primitivePolygonIndices[i];
            const endRingIndex = primitivePolygonIndices[i + 1];
            const ringCoordinates = ringToGeoJson(positions, startRingIndex, endRingIndex);
            coordinates.push(ringCoordinates);
        }
        return { type: 'Polygon', coordinates };
    }
    // MultiPolygon
    const coordinates = [];
    for (let i = 0; i < polygonIndices.length - 1; i++) {
        const startPolygonIndex = polygonIndices[i];
        const endPolygonIndex = polygonIndices[i + 1];
        const polygonCoordinates = polygonToGeoJson(data, startPolygonIndex, endPolygonIndex).coordinates;
        coordinates.push(polygonCoordinates);
    }
    return { type: 'MultiPolygon', coordinates };
}
/** Parse binary data of type LineString */
function lineStringToGeoJson(data, startIndex = -Infinity, endIndex = Infinity) {
    const { positions } = data;
    const pathIndices = data.pathIndices.value.filter((x) => x >= startIndex && x <= endIndex);
    const multi = pathIndices.length > 2;
    if (!multi) {
        const coordinates = ringToGeoJson(positions, pathIndices[0], pathIndices[1]);
        return { type: 'LineString', coordinates };
    }
    const coordinates = [];
    for (let i = 0; i < pathIndices.length - 1; i++) {
        const ringCoordinates = ringToGeoJson(positions, pathIndices[i], pathIndices[i + 1]);
        coordinates.push(ringCoordinates);
    }
    return { type: 'MultiLineString', coordinates };
}
/** Parse binary data of type Point */
function pointToGeoJson(data, startIndex, endIndex) {
    const { positions } = data;
    const coordinates = ringToGeoJson(positions, startIndex, endIndex);
    const multi = coordinates.length > 1;
    if (multi) {
        return { type: 'MultiPoint', coordinates };
    }
    return { type: 'Point', coordinates: coordinates[0] };
}
/**
 * Parse a linear ring of positions to a GeoJSON linear ring
 *
 * @param positions Positions TypedArray
 * @param startIndex Start index to include in ring
 * @param endIndex End index to include in ring
 * @returns GeoJSON ring
 */
function ringToGeoJson(positions, startIndex, endIndex) {
    startIndex = startIndex || 0;
    endIndex = endIndex || positions.value.length / positions.size;
    const ringCoordinates = [];
    for (let j = startIndex; j < endIndex; j++) {
        const coord = Array();
        for (let k = j * positions.size; k < (j + 1) * positions.size; k++) {
            coord.push(Number(positions.value[k]));
        }
        ringCoordinates.push(coord);
    }
    return ringCoordinates;
}
// Deduce geometry type of data object
function parseType(data) {
    if (data.pathIndices) {
        return 'LineString';
    }
    if (data.polygonIndices) {
        return 'Polygon';
    }
    return 'Point';
}
