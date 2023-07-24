export function transformBinaryCoords(binaryFeatures, transformCoordinate) {
  if (binaryFeatures.points) {
    transformBinaryGeometryPositions(binaryFeatures.points, transformCoordinate);
  }
  if (binaryFeatures.lines) {
    transformBinaryGeometryPositions(binaryFeatures.lines, transformCoordinate);
  }
  if (binaryFeatures.polygons) {
    transformBinaryGeometryPositions(binaryFeatures.polygons, transformCoordinate);
  }
  return binaryFeatures;
}
function transformBinaryGeometryPositions(binaryGeometry, fn) {
  const {
    positions
  } = binaryGeometry;
  for (let i = 0; i < positions.value.length; i += positions.size) {
    const coord = Array.from(positions.value.subarray(i, i + positions.size));
    const transformedCoord = fn(coord);
    positions.value.set(transformedCoord, i);
  }
}
export function transformGeoJsonCoords(features, fn) {
  for (const feature of features) {
    feature.geometry.coordinates = coordMap(feature.geometry.coordinates, fn);
  }
  return features;
}
function coordMap(array, fn) {
  if (isCoord(array)) {
    return fn(array);
  }
  return array.map(item => {
    return coordMap(item, fn);
  });
}
function isCoord(array) {
  return Number.isFinite(array[0]) && Number.isFinite(array[1]);
}
//# sourceMappingURL=transform.js.map