import { getPolygonSignedArea } from '@math.gl/polygon';
export function classifyRings(geom) {
  const len = geom.indices.length;
  const type = 'Polygon';
  if (len <= 1) {
    return {
      type,
      data: geom.data,
      areas: [[getPolygonSignedArea(geom.data)]],
      indices: [geom.indices]
    };
  }
  const areas = [];
  const polygons = [];
  let ringAreas = [];
  let polygon = [];
  let ccw;
  let offset = 0;
  for (let endIndex, i = 0, startIndex; i < len; i++) {
    startIndex = geom.indices[i] - offset;
    endIndex = geom.indices[i + 1] - offset || geom.data.length;
    const shape = geom.data.slice(startIndex, endIndex);
    const area = getPolygonSignedArea(shape);
    if (area === 0) {
      const before = geom.data.slice(0, startIndex);
      const after = geom.data.slice(endIndex);
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
    type,
    areas,
    indices: polygons,
    data: geom.data
  };
}
export function project(data, x0, y0, size) {
  for (let j = 0, jl = data.length; j < jl; j += 2) {
    data[j] = (data[j] + x0) * 360 / size - 180;
    const y2 = 180 - (data[j + 1] + y0) * 360 / size;
    data[j + 1] = 360 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180)) - 90;
  }
}
export function readFeature(tag, feature, pbf) {
  if (feature && pbf) {
    if (tag === 1) feature.id = pbf.readVarint();else if (tag === 2) readTag(pbf, feature);else if (tag === 3) feature.type = pbf.readVarint();else if (tag === 4) feature._geometry = pbf.pos;
  }
}
export function readTag(pbf, feature) {
  const end = pbf.readVarint() + pbf.pos;
  while (pbf.pos < end) {
    const key = feature._keys[pbf.readVarint()];
    const value = feature._values[pbf.readVarint()];
    feature.properties[key] = value;
  }
}
//# sourceMappingURL=binary-util-functions.js.map