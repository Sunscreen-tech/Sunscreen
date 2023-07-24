"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readTag = exports.readFeature = exports.signedArea = exports.classifyRings = void 0;
/**
 * Classifies an array of rings into polygons with outer rings and holes
 * @param rings
 * @returns polygons
 */
function classifyRings(rings) {
    const len = rings.length;
    if (len <= 1)
        return [rings];
    const polygons = [];
    let polygon;
    let ccw;
    for (let i = 0; i < len; i++) {
        const area = signedArea(rings[i]);
        if (area === 0)
            continue; // eslint-disable-line no-continue
        if (ccw === undefined)
            ccw = area < 0;
        if (ccw === area < 0) {
            if (polygon)
                polygons.push(polygon);
            polygon = [rings[i]];
        }
        else if (polygon)
            polygon.push(rings[i]);
    }
    if (polygon)
        polygons.push(polygon);
    return polygons;
}
exports.classifyRings = classifyRings;
/**
 *
 * @param ring
 * @returns sum
 */
function signedArea(ring) {
    let sum = 0;
    for (let i = 0, j = ring.length - 1, p1, p2; i < ring.length; j = i++) {
        p1 = ring[i];
        p2 = ring[j];
        sum += (p2[0] - p1[0]) * (p1[1] + p2[1]);
    }
    return sum;
}
exports.signedArea = signedArea;
/**
 *
 * @param tag
 * @param feature
 * @param pbf
 */
function readFeature(tag, feature, pbf) {
    if (feature && pbf) {
        if (tag === 1)
            feature.id = pbf.readVarint();
        else if (tag === 2)
            readTag(pbf, feature);
        else if (tag === 3)
            feature.type = pbf.readVarint();
        else if (tag === 4)
            feature._geometry = pbf.pos;
    }
}
exports.readFeature = readFeature;
/**
 *
 * @param pbf
 * @param feature
 */
function readTag(pbf, feature) {
    const end = pbf.readVarint() + pbf.pos;
    while (pbf.pos < end) {
        const key = feature._keys[pbf.readVarint()];
        const value = feature._values[pbf.readVarint()];
        feature.properties[key] = value;
    }
}
exports.readTag = readTag;
