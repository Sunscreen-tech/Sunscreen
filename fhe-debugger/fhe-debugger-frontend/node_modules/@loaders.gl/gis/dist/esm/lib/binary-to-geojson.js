export function binaryToGeojson(data, options) {
  const globalFeatureId = options === null || options === void 0 ? void 0 : options.globalFeatureId;
  if (globalFeatureId !== undefined) {
    return getSingleFeature(data, globalFeatureId);
  }
  return parseFeatures(data, options === null || options === void 0 ? void 0 : options.type);
}
export function binaryToGeoJson(data, type) {
  let format = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'feature';
  switch (format) {
    case 'feature':
      return parseFeatures(data, type);
    case 'geometry':
      return binaryToGeometry(data);
    default:
      throw new Error(format);
  }
}
function getSingleFeature(data, globalFeatureId) {
  const dataArray = normalizeInput(data);
  for (const data of dataArray) {
    let lastIndex = 0;
    let lastValue = data.featureIds.value[0];
    for (let i = 0; i < data.featureIds.value.length; i++) {
      const currValue = data.featureIds.value[i];
      if (currValue === lastValue) {
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
  throw new Error("featureId:".concat(globalFeatureId, " not found"));
}
function parseFeatures(data, type) {
  const dataArray = normalizeInput(data, type);
  return parseFeatureCollection(dataArray);
}
export function binaryToGeometry(data, startIndex, endIndex) {
  switch (data.type) {
    case 'Point':
      return pointToGeoJson(data, startIndex, endIndex);
    case 'LineString':
      return lineStringToGeoJson(data, startIndex, endIndex);
    case 'Polygon':
      return polygonToGeoJson(data, startIndex, endIndex);
    default:
      const unexpectedInput = data;
      throw new Error("Unsupported geometry type: ".concat(unexpectedInput === null || unexpectedInput === void 0 ? void 0 : unexpectedInput.type));
  }
}
function normalizeInput(data, type) {
  const isHeterogeneousType = Boolean(data.points || data.lines || data.polygons);
  if (!isHeterogeneousType) {
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
function parseFeatureCollection(dataArray) {
  const features = [];
  for (const data of dataArray) {
    if (data.featureIds.value.length === 0) {
      continue;
    }
    let lastIndex = 0;
    let lastValue = data.featureIds.value[0];
    for (let i = 0; i < data.featureIds.value.length; i++) {
      const currValue = data.featureIds.value[i];
      if (currValue === lastValue) {
        continue;
      }
      features.push(parseFeature(data, lastIndex, i));
      lastIndex = i;
      lastValue = currValue;
    }
    features.push(parseFeature(data, lastIndex, data.featureIds.value.length));
  }
  return features;
}
function parseFeature(data, startIndex, endIndex) {
  const geometry = binaryToGeometry(data, startIndex, endIndex);
  const properties = parseProperties(data, startIndex, endIndex);
  const fields = parseFields(data, startIndex, endIndex);
  return {
    type: 'Feature',
    geometry,
    properties,
    ...fields
  };
}
function parseFields(data) {
  let startIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  let endIndex = arguments.length > 2 ? arguments[2] : undefined;
  return data.fields && data.fields[data.featureIds.value[startIndex]];
}
function parseProperties(data) {
  let startIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  let endIndex = arguments.length > 2 ? arguments[2] : undefined;
  const properties = Object.assign({}, data.properties[data.featureIds.value[startIndex]]);
  for (const key in data.numericProps) {
    properties[key] = data.numericProps[key].value[startIndex];
  }
  return properties;
}
function polygonToGeoJson(data) {
  let startIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -Infinity;
  let endIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : Infinity;
  const {
    positions
  } = data;
  const polygonIndices = data.polygonIndices.value.filter(x => x >= startIndex && x <= endIndex);
  const primitivePolygonIndices = data.primitivePolygonIndices.value.filter(x => x >= startIndex && x <= endIndex);
  const multi = polygonIndices.length > 2;
  if (!multi) {
    const coordinates = [];
    for (let i = 0; i < primitivePolygonIndices.length - 1; i++) {
      const startRingIndex = primitivePolygonIndices[i];
      const endRingIndex = primitivePolygonIndices[i + 1];
      const ringCoordinates = ringToGeoJson(positions, startRingIndex, endRingIndex);
      coordinates.push(ringCoordinates);
    }
    return {
      type: 'Polygon',
      coordinates
    };
  }
  const coordinates = [];
  for (let i = 0; i < polygonIndices.length - 1; i++) {
    const startPolygonIndex = polygonIndices[i];
    const endPolygonIndex = polygonIndices[i + 1];
    const polygonCoordinates = polygonToGeoJson(data, startPolygonIndex, endPolygonIndex).coordinates;
    coordinates.push(polygonCoordinates);
  }
  return {
    type: 'MultiPolygon',
    coordinates
  };
}
function lineStringToGeoJson(data) {
  let startIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -Infinity;
  let endIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : Infinity;
  const {
    positions
  } = data;
  const pathIndices = data.pathIndices.value.filter(x => x >= startIndex && x <= endIndex);
  const multi = pathIndices.length > 2;
  if (!multi) {
    const coordinates = ringToGeoJson(positions, pathIndices[0], pathIndices[1]);
    return {
      type: 'LineString',
      coordinates
    };
  }
  const coordinates = [];
  for (let i = 0; i < pathIndices.length - 1; i++) {
    const ringCoordinates = ringToGeoJson(positions, pathIndices[i], pathIndices[i + 1]);
    coordinates.push(ringCoordinates);
  }
  return {
    type: 'MultiLineString',
    coordinates
  };
}
function pointToGeoJson(data, startIndex, endIndex) {
  const {
    positions
  } = data;
  const coordinates = ringToGeoJson(positions, startIndex, endIndex);
  const multi = coordinates.length > 1;
  if (multi) {
    return {
      type: 'MultiPoint',
      coordinates
    };
  }
  return {
    type: 'Point',
    coordinates: coordinates[0]
  };
}
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
function parseType(data) {
  if (data.pathIndices) {
    return 'LineString';
  }
  if (data.polygonIndices) {
    return 'Polygon';
  }
  return 'Point';
}
//# sourceMappingURL=binary-to-geojson.js.map