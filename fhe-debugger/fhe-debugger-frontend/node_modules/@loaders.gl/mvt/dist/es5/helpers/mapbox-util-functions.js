"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.classifyRings = classifyRings;
exports.readFeature = readFeature;
exports.readTag = readTag;
exports.signedArea = signedArea;
function classifyRings(rings) {
  var len = rings.length;
  if (len <= 1) return [rings];
  var polygons = [];
  var polygon;
  var ccw;
  for (var i = 0; i < len; i++) {
    var area = signedArea(rings[i]);
    if (area === 0) continue;
    if (ccw === undefined) ccw = area < 0;
    if (ccw === area < 0) {
      if (polygon) polygons.push(polygon);
      polygon = [rings[i]];
    } else if (polygon) polygon.push(rings[i]);
  }
  if (polygon) polygons.push(polygon);
  return polygons;
}
function signedArea(ring) {
  var sum = 0;
  for (var i = 0, j = ring.length - 1, p1, p2; i < ring.length; j = i++) {
    p1 = ring[i];
    p2 = ring[j];
    sum += (p2[0] - p1[0]) * (p1[1] + p2[1]);
  }
  return sum;
}
function readFeature(tag, feature, pbf) {
  if (feature && pbf) {
    if (tag === 1) feature.id = pbf.readVarint();else if (tag === 2) readTag(pbf, feature);else if (tag === 3) feature.type = pbf.readVarint();else if (tag === 4) feature._geometry = pbf.pos;
  }
}
function readTag(pbf, feature) {
  var end = pbf.readVarint() + pbf.pos;
  while (pbf.pos < end) {
    var key = feature._keys[pbf.readVarint()];
    var value = feature._values[pbf.readVarint()];
    feature.properties[key] = value;
  }
}
//# sourceMappingURL=mapbox-util-functions.js.map