import { getPolygonSignedArea } from '@math.gl/polygon';
export function geojsonToFlatGeojson(features) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
    coordLength: 2,
    fixRingWinding: true
  };
  return features.map(feature => flattenFeature(feature, options));
}
function flattenPoint(coordinates, data, indices, options) {
  indices.push(data.length);
  data.push(...coordinates);
  for (let i = coordinates.length; i < options.coordLength; i++) {
    data.push(0);
  }
}
function flattenLineString(coordinates, data, indices, options) {
  indices.push(data.length);
  for (const c of coordinates) {
    data.push(...c);
    for (let i = c.length; i < options.coordLength; i++) {
      data.push(0);
    }
  }
}
function flattenPolygon(coordinates, data, indices, areas, options) {
  let count = 0;
  const ringAreas = [];
  const polygons = [];
  for (const lineString of coordinates) {
    const lineString2d = lineString.map(p => p.slice(0, 2));
    let area = getPolygonSignedArea(lineString2d.flat());
    const ccw = area < 0;
    if (options.fixRingWinding && (count === 0 && !ccw || count > 0 && ccw)) {
      lineString.reverse();
      area = -area;
    }
    ringAreas.push(area);
    flattenLineString(lineString, data, polygons, options);
    count++;
  }
  if (count > 0) {
    areas.push(ringAreas);
    indices.push(polygons);
  }
}
function flattenFeature(feature, options) {
  const {
    geometry
  } = feature;
  if (geometry.type === 'GeometryCollection') {
    throw new Error('GeometryCollection type not supported');
  }
  const data = [];
  const indices = [];
  let areas;
  let type;
  switch (geometry.type) {
    case 'Point':
      type = 'Point';
      flattenPoint(geometry.coordinates, data, indices, options);
      break;
    case 'MultiPoint':
      type = 'Point';
      geometry.coordinates.map(c => flattenPoint(c, data, indices, options));
      break;
    case 'LineString':
      type = 'LineString';
      flattenLineString(geometry.coordinates, data, indices, options);
      break;
    case 'MultiLineString':
      type = 'LineString';
      geometry.coordinates.map(c => flattenLineString(c, data, indices, options));
      break;
    case 'Polygon':
      type = 'Polygon';
      areas = [];
      flattenPolygon(geometry.coordinates, data, indices, areas, options);
      break;
    case 'MultiPolygon':
      type = 'Polygon';
      areas = [];
      geometry.coordinates.map(c => flattenPolygon(c, data, indices, areas, options));
      break;
    default:
      throw new Error("Unknown type: ".concat(type));
  }
  return {
    ...feature,
    geometry: {
      type,
      indices,
      data,
      areas
    }
  };
}
//# sourceMappingURL=geojson-to-flat-geojson.js.map