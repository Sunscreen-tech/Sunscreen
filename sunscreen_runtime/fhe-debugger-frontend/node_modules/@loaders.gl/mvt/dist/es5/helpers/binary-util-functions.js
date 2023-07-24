"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.classifyRings = classifyRings;
exports.project = project;
exports.readFeature = readFeature;
exports.readTag = readTag;
var _polygon = require("@math.gl/polygon");
function classifyRings(geom) {
  var len = geom.indices.length;
  var type = 'Polygon';
  if (len <= 1) {
    return {
      type: type,
      data: geom.data,
      areas: [[(0, _polygon.getPolygonSignedArea)(geom.data)]],
      indices: [geom.indices]
    };
  }
  var areas = [];
  var polygons = [];
  var ringAreas = [];
  var polygon = [];
  var ccw;
  var offset = 0;
  for (var endIndex, i = 0, startIndex; i < len; i++) {
    startIndex = geom.indices[i] - offset;
    endIndex = geom.indices[i + 1] - offset || geom.data.length;
    var shape = geom.data.slice(startIndex, endIndex);
    var area = (0, _polygon.getPolygonSignedArea)(shape);
    if (area === 0) {
      var before = geom.data.slice(0, startIndex);
      var after = geom.data.slice(endIndex);
      geom.data = before.concat(after);
      offset += endIndex - startIndex;
      continue;
    }
    if (ccw === undefined) ccw = area < 0;
    if (ccw === area < 0) {
      if (polygon.length) {
        areas.push(ringAreas);
        polygons.push(polygon);
      }
      polygon = [startIndex];
      ringAreas = [area];
    } else {
      ringAreas.push(area);
      polygon.push(startIndex);
    }
  }
  if (ringAreas) areas.push(ringAreas);
  if (polygon.length) polygons.push(polygon);
  return {
    type: type,
    areas: areas,
    indices: polygons,
    data: geom.data
  };
}
function project(data, x0, y0, size) {
  for (var j = 0, jl = data.length; j < jl; j += 2) {
    data[j] = (data[j] + x0) * 360 / size - 180;
    var y2 = 180 - (data[j + 1] + y0) * 360 / size;
    data[j + 1] = 360 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180)) - 90;
  }
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
//# sourceMappingURL=binary-util-functions.js.map