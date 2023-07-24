import { concatenateTypedArrays } from '@loaders.gl/loader-utils';
export function addSkirt(attributes, triangles, skirtHeight, outsideIndices) {
  const outsideEdges = outsideIndices ? getOutsideEdgesFromIndices(outsideIndices, attributes.POSITION.value) : getOutsideEdgesFromTriangles(triangles);
  const newPosition = new attributes.POSITION.value.constructor(outsideEdges.length * 6);
  const newTexcoord0 = new attributes.TEXCOORD_0.value.constructor(outsideEdges.length * 4);
  const newTriangles = new triangles.constructor(outsideEdges.length * 6);
  for (let i = 0; i < outsideEdges.length; i++) {
    const edge = outsideEdges[i];
    updateAttributesForNewEdge({
      edge,
      edgeIndex: i,
      attributes,
      skirtHeight,
      newPosition,
      newTexcoord0,
      newTriangles
    });
  }
  attributes.POSITION.value = concatenateTypedArrays(attributes.POSITION.value, newPosition);
  attributes.TEXCOORD_0.value = concatenateTypedArrays(attributes.TEXCOORD_0.value, newTexcoord0);
  const resultTriangles = triangles instanceof Array ? triangles.concat(newTriangles) : concatenateTypedArrays(triangles, newTriangles);
  return {
    attributes,
    triangles: resultTriangles
  };
}
function getOutsideEdgesFromTriangles(triangles) {
  const edges = [];
  for (let i = 0; i < triangles.length; i += 3) {
    edges.push([triangles[i], triangles[i + 1]]);
    edges.push([triangles[i + 1], triangles[i + 2]]);
    edges.push([triangles[i + 2], triangles[i]]);
  }
  edges.sort((a, b) => Math.min(...a) - Math.min(...b) || Math.max(...a) - Math.max(...b));
  const outsideEdges = [];
  let index = 0;
  while (index < edges.length) {
    var _edges, _edges2;
    if (edges[index][0] === ((_edges = edges[index + 1]) === null || _edges === void 0 ? void 0 : _edges[1]) && edges[index][1] === ((_edges2 = edges[index + 1]) === null || _edges2 === void 0 ? void 0 : _edges2[0])) {
      index += 2;
    } else {
      outsideEdges.push(edges[index]);
      index++;
    }
  }
  return outsideEdges;
}
function getOutsideEdgesFromIndices(indices, position) {
  indices.westIndices.sort((a, b) => position[3 * a + 1] - position[3 * b + 1]);
  indices.eastIndices.sort((a, b) => position[3 * b + 1] - position[3 * a + 1]);
  indices.southIndices.sort((a, b) => position[3 * b] - position[3 * a]);
  indices.northIndices.sort((a, b) => position[3 * a] - position[3 * b]);
  const edges = [];
  for (const index in indices) {
    const indexGroup = indices[index];
    for (let i = 0; i < indexGroup.length - 1; i++) {
      edges.push([indexGroup[i], indexGroup[i + 1]]);
    }
  }
  return edges;
}
function updateAttributesForNewEdge(_ref) {
  let {
    edge,
    edgeIndex,
    attributes,
    skirtHeight,
    newPosition,
    newTexcoord0,
    newTriangles
  } = _ref;
  const positionsLength = attributes.POSITION.value.length;
  const vertex1Offset = edgeIndex * 2;
  const vertex2Offset = edgeIndex * 2 + 1;
  newPosition.set(attributes.POSITION.value.subarray(edge[0] * 3, edge[0] * 3 + 3), vertex1Offset * 3);
  newPosition[vertex1Offset * 3 + 2] = newPosition[vertex1Offset * 3 + 2] - skirtHeight;
  newPosition.set(attributes.POSITION.value.subarray(edge[1] * 3, edge[1] * 3 + 3), vertex2Offset * 3);
  newPosition[vertex2Offset * 3 + 2] = newPosition[vertex2Offset * 3 + 2] - skirtHeight;
  newTexcoord0.set(attributes.TEXCOORD_0.value.subarray(edge[0] * 2, edge[0] * 2 + 2), vertex1Offset * 2);
  newTexcoord0.set(attributes.TEXCOORD_0.value.subarray(edge[1] * 2, edge[1] * 2 + 2), vertex2Offset * 2);
  const triangle1Offset = edgeIndex * 2 * 3;
  newTriangles[triangle1Offset] = edge[0];
  newTriangles[triangle1Offset + 1] = positionsLength / 3 + vertex2Offset;
  newTriangles[triangle1Offset + 2] = edge[1];
  newTriangles[triangle1Offset + 3] = positionsLength / 3 + vertex2Offset;
  newTriangles[triangle1Offset + 4] = edge[0];
  newTriangles[triangle1Offset + 5] = positionsLength / 3 + vertex1Offset;
}
//# sourceMappingURL=skirt.js.map