import { earcut } from '@math.gl/polygon';
export function flatGeojsonToBinary(features, geometryInfo, options) {
  const propArrayTypes = extractNumericPropTypes(features);
  const numericPropKeys = Object.keys(propArrayTypes).filter(k => propArrayTypes[k] !== Array);
  return fillArrays(features, {
    propArrayTypes,
    ...geometryInfo
  }, {
    numericPropKeys: options && options.numericPropKeys || numericPropKeys,
    PositionDataType: options ? options.PositionDataType : Float32Array
  });
}
export const TEST_EXPORTS = {
  extractNumericPropTypes
};
function extractNumericPropTypes(features) {
  const propArrayTypes = {};
  for (const feature of features) {
    if (feature.properties) {
      for (const key in feature.properties) {
        const val = feature.properties[key];
        propArrayTypes[key] = deduceArrayType(val, propArrayTypes[key]);
      }
    }
  }
  return propArrayTypes;
}
function fillArrays(features, geometryInfo, options) {
  const {
    pointPositionsCount,
    pointFeaturesCount,
    linePositionsCount,
    linePathsCount,
    lineFeaturesCount,
    polygonPositionsCount,
    polygonObjectsCount,
    polygonRingsCount,
    polygonFeaturesCount,
    propArrayTypes,
    coordLength
  } = geometryInfo;
  const {
    numericPropKeys = [],
    PositionDataType = Float32Array
  } = options;
  const hasGlobalId = features[0] && 'id' in features[0];
  const GlobalFeatureIdsDataType = features.length > 65535 ? Uint32Array : Uint16Array;
  const points = {
    type: 'Point',
    positions: new PositionDataType(pointPositionsCount * coordLength),
    globalFeatureIds: new GlobalFeatureIdsDataType(pointPositionsCount),
    featureIds: pointFeaturesCount > 65535 ? new Uint32Array(pointPositionsCount) : new Uint16Array(pointPositionsCount),
    numericProps: {},
    properties: [],
    fields: []
  };
  const lines = {
    type: 'LineString',
    pathIndices: linePositionsCount > 65535 ? new Uint32Array(linePathsCount + 1) : new Uint16Array(linePathsCount + 1),
    positions: new PositionDataType(linePositionsCount * coordLength),
    globalFeatureIds: new GlobalFeatureIdsDataType(linePositionsCount),
    featureIds: lineFeaturesCount > 65535 ? new Uint32Array(linePositionsCount) : new Uint16Array(linePositionsCount),
    numericProps: {},
    properties: [],
    fields: []
  };
  const polygons = {
    type: 'Polygon',
    polygonIndices: polygonPositionsCount > 65535 ? new Uint32Array(polygonObjectsCount + 1) : new Uint16Array(polygonObjectsCount + 1),
    primitivePolygonIndices: polygonPositionsCount > 65535 ? new Uint32Array(polygonRingsCount + 1) : new Uint16Array(polygonRingsCount + 1),
    positions: new PositionDataType(polygonPositionsCount * coordLength),
    triangles: [],
    globalFeatureIds: new GlobalFeatureIdsDataType(polygonPositionsCount),
    featureIds: polygonFeaturesCount > 65535 ? new Uint32Array(polygonPositionsCount) : new Uint16Array(polygonPositionsCount),
    numericProps: {},
    properties: [],
    fields: []
  };
  for (const object of [points, lines, polygons]) {
    for (const propName of numericPropKeys) {
      const T = propArrayTypes[propName];
      object.numericProps[propName] = new T(object.positions.length / coordLength);
    }
  }
  lines.pathIndices[linePathsCount] = linePositionsCount;
  polygons.polygonIndices[polygonObjectsCount] = polygonPositionsCount;
  polygons.primitivePolygonIndices[polygonRingsCount] = polygonPositionsCount;
  const indexMap = {
    pointPosition: 0,
    pointFeature: 0,
    linePosition: 0,
    linePath: 0,
    lineFeature: 0,
    polygonPosition: 0,
    polygonObject: 0,
    polygonRing: 0,
    polygonFeature: 0,
    feature: 0
  };
  for (const feature of features) {
    const geometry = feature.geometry;
    const properties = feature.properties || {};
    switch (geometry.type) {
      case 'Point':
        handlePoint(geometry, points, indexMap, coordLength, properties);
        points.properties.push(keepStringProperties(properties, numericPropKeys));
        if (hasGlobalId) {
          points.fields.push({
            id: feature.id
          });
        }
        indexMap.pointFeature++;
        break;
      case 'LineString':
        handleLineString(geometry, lines, indexMap, coordLength, properties);
        lines.properties.push(keepStringProperties(properties, numericPropKeys));
        if (hasGlobalId) {
          lines.fields.push({
            id: feature.id
          });
        }
        indexMap.lineFeature++;
        break;
      case 'Polygon':
        handlePolygon(geometry, polygons, indexMap, coordLength, properties);
        polygons.properties.push(keepStringProperties(properties, numericPropKeys));
        if (hasGlobalId) {
          polygons.fields.push({
            id: feature.id
          });
        }
        indexMap.polygonFeature++;
        break;
      default:
        throw new Error('Invalid geometry type');
    }
    indexMap.feature++;
  }
  return makeAccessorObjects(points, lines, polygons, coordLength);
}
function handlePoint(geometry, points, indexMap, coordLength, properties) {
  points.positions.set(geometry.data, indexMap.pointPosition * coordLength);
  const nPositions = geometry.data.length / coordLength;
  fillNumericProperties(points, properties, indexMap.pointPosition, nPositions);
  points.globalFeatureIds.fill(indexMap.feature, indexMap.pointPosition, indexMap.pointPosition + nPositions);
  points.featureIds.fill(indexMap.pointFeature, indexMap.pointPosition, indexMap.pointPosition + nPositions);
  indexMap.pointPosition += nPositions;
}
function handleLineString(geometry, lines, indexMap, coordLength, properties) {
  lines.positions.set(geometry.data, indexMap.linePosition * coordLength);
  const nPositions = geometry.data.length / coordLength;
  fillNumericProperties(lines, properties, indexMap.linePosition, nPositions);
  lines.globalFeatureIds.fill(indexMap.feature, indexMap.linePosition, indexMap.linePosition + nPositions);
  lines.featureIds.fill(indexMap.lineFeature, indexMap.linePosition, indexMap.linePosition + nPositions);
  for (let i = 0, il = geometry.indices.length; i < il; ++i) {
    const start = geometry.indices[i];
    const end = i === il - 1 ? geometry.data.length : geometry.indices[i + 1];
    lines.pathIndices[indexMap.linePath++] = indexMap.linePosition;
    indexMap.linePosition += (end - start) / coordLength;
  }
}
function handlePolygon(geometry, polygons, indexMap, coordLength, properties) {
  polygons.positions.set(geometry.data, indexMap.polygonPosition * coordLength);
  const nPositions = geometry.data.length / coordLength;
  fillNumericProperties(polygons, properties, indexMap.polygonPosition, nPositions);
  polygons.globalFeatureIds.fill(indexMap.feature, indexMap.polygonPosition, indexMap.polygonPosition + nPositions);
  polygons.featureIds.fill(indexMap.polygonFeature, indexMap.polygonPosition, indexMap.polygonPosition + nPositions);
  for (let l = 0, ll = geometry.indices.length; l < ll; ++l) {
    const startPosition = indexMap.polygonPosition;
    polygons.polygonIndices[indexMap.polygonObject++] = startPosition;
    const areas = geometry.areas[l];
    const indices = geometry.indices[l];
    const nextIndices = geometry.indices[l + 1];
    for (let i = 0, il = indices.length; i < il; ++i) {
      const start = indices[i];
      const end = i === il - 1 ? nextIndices === undefined ? geometry.data.length : nextIndices[0] : indices[i + 1];
      polygons.primitivePolygonIndices[indexMap.polygonRing++] = indexMap.polygonPosition;
      indexMap.polygonPosition += (end - start) / coordLength;
    }
    const endPosition = indexMap.polygonPosition;
    triangulatePolygon(polygons, areas, indices, {
      startPosition,
      endPosition,
      coordLength
    });
  }
}
function triangulatePolygon(polygons, areas, indices, _ref) {
  let {
    startPosition,
    endPosition,
    coordLength
  } = _ref;
  const start = startPosition * coordLength;
  const end = endPosition * coordLength;
  const polygonPositions = polygons.positions.subarray(start, end);
  const offset = indices[0];
  const holes = indices.slice(1).map(n => (n - offset) / coordLength);
  const triangles = earcut(polygonPositions, holes, coordLength, areas);
  for (let t = 0, tl = triangles.length; t < tl; ++t) {
    polygons.triangles.push(startPosition + triangles[t]);
  }
}
function wrapProps(obj, size) {
  const returnObj = {};
  for (const key in obj) {
    returnObj[key] = {
      value: obj[key],
      size
    };
  }
  return returnObj;
}
function makeAccessorObjects(points, lines, polygons, coordLength) {
  return {
    points: {
      ...points,
      positions: {
        value: points.positions,
        size: coordLength
      },
      globalFeatureIds: {
        value: points.globalFeatureIds,
        size: 1
      },
      featureIds: {
        value: points.featureIds,
        size: 1
      },
      numericProps: wrapProps(points.numericProps, 1)
    },
    lines: {
      ...lines,
      positions: {
        value: lines.positions,
        size: coordLength
      },
      pathIndices: {
        value: lines.pathIndices,
        size: 1
      },
      globalFeatureIds: {
        value: lines.globalFeatureIds,
        size: 1
      },
      featureIds: {
        value: lines.featureIds,
        size: 1
      },
      numericProps: wrapProps(lines.numericProps, 1)
    },
    polygons: {
      ...polygons,
      positions: {
        value: polygons.positions,
        size: coordLength
      },
      polygonIndices: {
        value: polygons.polygonIndices,
        size: 1
      },
      primitivePolygonIndices: {
        value: polygons.primitivePolygonIndices,
        size: 1
      },
      triangles: {
        value: new Uint32Array(polygons.triangles),
        size: 1
      },
      globalFeatureIds: {
        value: polygons.globalFeatureIds,
        size: 1
      },
      featureIds: {
        value: polygons.featureIds,
        size: 1
      },
      numericProps: wrapProps(polygons.numericProps, 1)
    }
  };
}
function fillNumericProperties(object, properties, index, length) {
  for (const numericPropName in object.numericProps) {
    if (numericPropName in properties) {
      const value = properties[numericPropName];
      object.numericProps[numericPropName].fill(value, index, index + length);
    }
  }
}
function keepStringProperties(properties, numericKeys) {
  const props = {};
  for (const key in properties) {
    if (!numericKeys.includes(key)) {
      props[key] = properties[key];
    }
  }
  return props;
}
function deduceArrayType(x, constructor) {
  if (constructor === Array || !Number.isFinite(x)) {
    return Array;
  }
  return constructor === Float64Array || Math.fround(x) !== x ? Float64Array : Float32Array;
}
//# sourceMappingURL=flat-geojson-to-binary.js.map