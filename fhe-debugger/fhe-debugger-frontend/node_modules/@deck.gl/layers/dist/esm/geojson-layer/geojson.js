import { log } from '@deck.gl/core';
export function getGeojsonFeatures(geojson) {
  if (Array.isArray(geojson)) {
    return geojson;
  }

  log.assert(geojson.type, 'GeoJSON does not have type');

  switch (geojson.type) {
    case 'Feature':
      return [geojson];

    case 'FeatureCollection':
      log.assert(Array.isArray(geojson.features), 'GeoJSON does not have features array');
      return geojson.features;

    default:
      return [{
        geometry: geojson
      }];
  }
}
export function separateGeojsonFeatures(features, wrapFeature, dataRange = {}) {
  const separated = {
    pointFeatures: [],
    lineFeatures: [],
    polygonFeatures: [],
    polygonOutlineFeatures: []
  };
  const {
    startRow = 0,
    endRow = features.length
  } = dataRange;

  for (let featureIndex = startRow; featureIndex < endRow; featureIndex++) {
    const feature = features[featureIndex];
    const {
      geometry
    } = feature;

    if (!geometry) {
      continue;
    }

    if (geometry.type === 'GeometryCollection') {
      log.assert(Array.isArray(geometry.geometries), 'GeoJSON does not have geometries array');
      const {
        geometries
      } = geometry;

      for (let i = 0; i < geometries.length; i++) {
        const subGeometry = geometries[i];
        separateGeometry(subGeometry, separated, wrapFeature, feature, featureIndex);
      }
    } else {
      separateGeometry(geometry, separated, wrapFeature, feature, featureIndex);
    }
  }

  return separated;
}

function separateGeometry(geometry, separated, wrapFeature, sourceFeature, sourceFeatureIndex) {
  const {
    type,
    coordinates
  } = geometry;
  const {
    pointFeatures,
    lineFeatures,
    polygonFeatures,
    polygonOutlineFeatures
  } = separated;

  if (!validateGeometry(type, coordinates)) {
    log.warn("".concat(type, " coordinates are malformed"))();
    return;
  }

  switch (type) {
    case 'Point':
      pointFeatures.push(wrapFeature({
        geometry
      }, sourceFeature, sourceFeatureIndex));
      break;

    case 'MultiPoint':
      coordinates.forEach(point => {
        pointFeatures.push(wrapFeature({
          geometry: {
            type: 'Point',
            coordinates: point
          }
        }, sourceFeature, sourceFeatureIndex));
      });
      break;

    case 'LineString':
      lineFeatures.push(wrapFeature({
        geometry
      }, sourceFeature, sourceFeatureIndex));
      break;

    case 'MultiLineString':
      coordinates.forEach(path => {
        lineFeatures.push(wrapFeature({
          geometry: {
            type: 'LineString',
            coordinates: path
          }
        }, sourceFeature, sourceFeatureIndex));
      });
      break;

    case 'Polygon':
      polygonFeatures.push(wrapFeature({
        geometry
      }, sourceFeature, sourceFeatureIndex));
      coordinates.forEach(path => {
        polygonOutlineFeatures.push(wrapFeature({
          geometry: {
            type: 'LineString',
            coordinates: path
          }
        }, sourceFeature, sourceFeatureIndex));
      });
      break;

    case 'MultiPolygon':
      coordinates.forEach(polygon => {
        polygonFeatures.push(wrapFeature({
          geometry: {
            type: 'Polygon',
            coordinates: polygon
          }
        }, sourceFeature, sourceFeatureIndex));
        polygon.forEach(path => {
          polygonOutlineFeatures.push(wrapFeature({
            geometry: {
              type: 'LineString',
              coordinates: path
            }
          }, sourceFeature, sourceFeatureIndex));
        });
      });
      break;

    default:
  }
}

const COORDINATE_NEST_LEVEL = {
  Point: 1,
  MultiPoint: 2,
  LineString: 2,
  MultiLineString: 3,
  Polygon: 3,
  MultiPolygon: 4
};
export function validateGeometry(type, coordinates) {
  let nestLevel = COORDINATE_NEST_LEVEL[type];
  log.assert(nestLevel, "Unknown GeoJSON type ".concat(type));

  while (coordinates && --nestLevel > 0) {
    coordinates = coordinates[0];
  }

  return coordinates && Number.isFinite(coordinates[0]);
}
//# sourceMappingURL=geojson.js.map