"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TILE3D_TYPES = exports.TILE3D_TYPE = exports.TILE3D_OPTIMIZATION_HINT = exports.MAGIC_ARRAY = void 0;
var TILE3D_TYPE = {
  COMPOSITE: 'cmpt',
  POINT_CLOUD: 'pnts',
  BATCHED_3D_MODEL: 'b3dm',
  INSTANCED_3D_MODEL: 'i3dm',
  GEOMETRY: 'geom',
  VECTOR: 'vect',
  GLTF: 'glTF'
};
exports.TILE3D_TYPE = TILE3D_TYPE;
var TILE3D_TYPES = Object.keys(TILE3D_TYPE);
exports.TILE3D_TYPES = TILE3D_TYPES;
var MAGIC_ARRAY = {
  BATCHED_MODEL: [98, 51, 100, 109],
  INSTANCED_MODEL: [105, 51, 100, 109],
  POINT_CLOUD: [112, 110, 116, 115],
  COMPOSITE: [99, 109, 112, 116]
};
exports.MAGIC_ARRAY = MAGIC_ARRAY;
var TILE3D_OPTIMIZATION_HINT = {
  NOT_COMPUTED: -1,
  USE_OPTIMIZATION: 1,
  SKIP_OPTIMIZATION: 0
};
exports.TILE3D_OPTIMIZATION_HINT = TILE3D_OPTIMIZATION_HINT;
//# sourceMappingURL=constants.js.map