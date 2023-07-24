"use strict";
// loaders.gl, MIT license
// Forked from https://github.com/mapbox/geojson-vt under compatible ISC license
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrap = void 0;
const clip_1 = require("./clip");
const feature_1 = require("./feature");
/**
 * Wrap across antemeridian, by clipping into two tiles, shifting the overflowing x coordinates
 * @param features list of features to be wrapped
 * @param options buffer and extent
 * @returns
 */
function wrap(features, options) {
    const buffer = options.buffer / options.extent;
    let merged = features;
    const left = (0, clip_1.clip)(features, 1, -1 - buffer, buffer, 0, -1, 2, options); // left world copy
    const right = (0, clip_1.clip)(features, 1, 1 - buffer, 2 + buffer, 0, -1, 2, options); // right world copy
    if (left || right) {
        merged = (0, clip_1.clip)(features, 1, -buffer, 1 + buffer, 0, -1, 2, options) || []; // center world copy
        if (left) {
            merged = shiftFeatureCoords(left, 1).concat(merged); // merge left into center
        }
        if (right) {
            merged = merged.concat(shiftFeatureCoords(right, -1)); // merge right into center
        }
    }
    return merged;
}
exports.wrap = wrap;
/**
 * Shift the x coordinates of a list of features
 * @param features list of features to shift x coordinates for
 * @param offset
 * @returns
 */
function shiftFeatureCoords(features, offset) {
    const newFeatures = [];
    for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        const type = feature.type;
        let newGeometry;
        if (type === 'Point' || type === 'MultiPoint' || type === 'LineString') {
            newGeometry = shiftCoords(feature.geometry, offset);
        }
        else if (type === 'MultiLineString' || type === 'Polygon') {
            newGeometry = [];
            for (const line of feature.geometry) {
                newGeometry.push(shiftCoords(line, offset));
            }
        }
        else if (type === 'MultiPolygon') {
            newGeometry = [];
            for (const polygon of feature.geometry) {
                const newPolygon = [];
                for (const line of polygon) {
                    // @ts-expect-error TODO
                    newPolygon.push(shiftCoords(line, offset));
                }
                newGeometry.push(newPolygon);
            }
        }
        newFeatures.push((0, feature_1.createFeature)(feature.id, type, newGeometry, feature.tags));
    }
    return newFeatures;
}
class Points extends Array {
}
/**
 * Shift the x coordinate of every point
 * @param points
 * @param offset
 * @returns
 */
function shiftCoords(points, offset) {
    const newPoints = [];
    newPoints.size = points.size;
    if (points.start !== undefined) {
        newPoints.start = points.start;
        newPoints.end = points.end;
    }
    for (let i = 0; i < points.length; i += 3) {
        newPoints.push(points[i] + offset, points[i + 1], points[i + 2]);
    }
    return newPoints;
}
