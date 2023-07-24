"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addSkirt = addSkirt;
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _loaderUtils = require("@loaders.gl/loader-utils");
function addSkirt(attributes, triangles, skirtHeight, outsideIndices) {
  var outsideEdges = outsideIndices ? getOutsideEdgesFromIndices(outsideIndices, attributes.POSITION.value) : getOutsideEdgesFromTriangles(triangles);
  var newPosition = new attributes.POSITION.value.constructor(outsideEdges.length * 6);
  var newTexcoord0 = new attributes.TEXCOORD_0.value.constructor(outsideEdges.length * 4);
  var newTriangles = new triangles.constructor(outsideEdges.length * 6);
  for (var i = 0; i < outsideEdges.length; i++) {
    var edge = outsideEdges[i];
    updateAttributesForNewEdge({
      edge: edge,
      edgeIndex: i,
      attributes: attributes,
      skirtHeight: skirtHeight,
      newPosition: newPosition,
      newTexcoord0: newTexcoord0,
      newTriangles: newTriangles
    });
  }
  attributes.POSITION.value = (0, _loaderUtils.concatenateTypedArrays)(attributes.POSITION.value, newPosition);
  attributes.TEXCOORD_0.value = (0, _loaderUtils.concatenateTypedArrays)(attributes.TEXCOORD_0.value, newTexcoord0);
  var resultTriangles = triangles instanceof Array ? triangles.concat(newTriangles) : (0, _loaderUtils.concatenateTypedArrays)(triangles, newTriangles);
  return {
    attributes: attributes,
    triangles: resultTriangles
  };
}
function getOutsideEdgesFromTriangles(triangles) {
  var edges = [];
  for (var i = 0; i < triangles.length; i += 3) {
    edges.push([triangles[i], triangles[i + 1]]);
    edges.push([triangles[i + 1], triangles[i + 2]]);
    edges.push([triangles[i + 2], triangles[i]]);
  }
  edges.sort(function (a, b) {
    return Math.min.apply(Math, (0, _toConsumableArray2.default)(a)) - Math.min.apply(Math, (0, _toConsumableArray2.default)(b)) || Math.max.apply(Math, (0, _toConsumableArray2.default)(a)) - Math.max.apply(Math, (0, _toConsumableArray2.default)(b));
  });
  var outsideEdges = [];
  var index = 0;
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
  indices.westIndices.sort(function (a, b) {
    return position[3 * a + 1] - position[3 * b + 1];
  });
  indices.eastIndices.sort(function (a, b) {
    return position[3 * b + 1] - position[3 * a + 1];
  });
  indices.southIndices.sort(function (a, b) {
    return position[3 * b] - position[3 * a];
  });
  indices.northIndices.sort(function (a, b) {
    return position[3 * a] - position[3 * b];
  });
  var edges = [];
  for (var index in indices) {
    var indexGroup = indices[index];
    for (var i = 0; i < indexGroup.length - 1; i++) {
      edges.push([indexGroup[i], indexGroup[i + 1]]);
    }
  }
  return edges;
}
function updateAttributesForNewEdge(_ref) {
  var edge = _ref.edge,
    edgeIndex = _ref.edgeIndex,
    attributes = _ref.attributes,
    skirtHeight = _ref.skirtHeight,
    newPosition = _ref.newPosition,
    newTexcoord0 = _ref.newTexcoord0,
    newTriangles = _ref.newTriangles;
  var positionsLength = attributes.POSITION.value.length;
  var vertex1Offset = edgeIndex * 2;
  var vertex2Offset = edgeIndex * 2 + 1;
  newPosition.set(attributes.POSITION.value.subarray(edge[0] * 3, edge[0] * 3 + 3), vertex1Offset * 3);
  newPosition[vertex1Offset * 3 + 2] = newPosition[vertex1Offset * 3 + 2] - skirtHeight;
  newPosition.set(attributes.POSITION.value.subarray(edge[1] * 3, edge[1] * 3 + 3), vertex2Offset * 3);
  newPosition[vertex2Offset * 3 + 2] = newPosition[vertex2Offset * 3 + 2] - skirtHeight;
  newTexcoord0.set(attributes.TEXCOORD_0.value.subarray(edge[0] * 2, edge[0] * 2 + 2), vertex1Offset * 2);
  newTexcoord0.set(attributes.TEXCOORD_0.value.subarray(edge[1] * 2, edge[1] * 2 + 2), vertex2Offset * 2);
  var triangle1Offset = edgeIndex * 2 * 3;
  newTriangles[triangle1Offset] = edge[0];
  newTriangles[triangle1Offset + 1] = positionsLength / 3 + vertex2Offset;
  newTriangles[triangle1Offset + 2] = edge[1];
  newTriangles[triangle1Offset + 3] = positionsLength / 3 + vertex2Offset;
  newTriangles[triangle1Offset + 4] = edge[0];
  newTriangles[triangle1Offset + 5] = positionsLength / 3 + vertex1Offset;
}
//# sourceMappingURL=skirt.js.map