"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createMesh;

var _core = require("@math.gl/core");

var DEFAULT_INDICES = new Uint16Array([0, 2, 1, 0, 3, 2]);
var DEFAULT_TEX_COORDS = new Float32Array([0, 1, 0, 0, 1, 0, 1, 1]);

function createMesh(bounds, resolution) {
  if (!resolution) {
    return createQuad(bounds);
  }

  var maxXSpan = Math.max(Math.abs(bounds[0][0] - bounds[3][0]), Math.abs(bounds[1][0] - bounds[2][0]));
  var maxYSpan = Math.max(Math.abs(bounds[1][1] - bounds[0][1]), Math.abs(bounds[2][1] - bounds[3][1]));
  var uCount = Math.ceil(maxXSpan / resolution) + 1;
  var vCount = Math.ceil(maxYSpan / resolution) + 1;
  var vertexCount = (uCount - 1) * (vCount - 1) * 6;
  var indices = new Uint32Array(vertexCount);
  var texCoords = new Float32Array(uCount * vCount * 2);
  var positions = new Float64Array(uCount * vCount * 3);
  var vertex = 0;
  var index = 0;

  for (var u = 0; u < uCount; u++) {
    var ut = u / (uCount - 1);

    for (var v = 0; v < vCount; v++) {
      var vt = v / (vCount - 1);
      var p = interpolateQuad(bounds, ut, vt);
      positions[vertex * 3 + 0] = p[0];
      positions[vertex * 3 + 1] = p[1];
      positions[vertex * 3 + 2] = p[2] || 0;
      texCoords[vertex * 2 + 0] = ut;
      texCoords[vertex * 2 + 1] = 1 - vt;

      if (u > 0 && v > 0) {
        indices[index++] = vertex - vCount;
        indices[index++] = vertex - vCount - 1;
        indices[index++] = vertex - 1;
        indices[index++] = vertex - vCount;
        indices[index++] = vertex - 1;
        indices[index++] = vertex;
      }

      vertex++;
    }
  }

  return {
    vertexCount: vertexCount,
    positions: positions,
    indices: indices,
    texCoords: texCoords
  };
}

function createQuad(bounds) {
  var positions = new Float64Array(12);

  for (var i = 0; i < bounds.length; i++) {
    positions[i * 3 + 0] = bounds[i][0];
    positions[i * 3 + 1] = bounds[i][1];
    positions[i * 3 + 2] = bounds[i][2] || 0;
  }

  return {
    vertexCount: 6,
    positions: positions,
    indices: DEFAULT_INDICES,
    texCoords: DEFAULT_TEX_COORDS
  };
}

function interpolateQuad(quad, ut, vt) {
  return (0, _core.lerp)((0, _core.lerp)(quad[0], quad[1], vt), (0, _core.lerp)(quad[3], quad[2], vt), ut);
}
//# sourceMappingURL=create-mesh.js.map