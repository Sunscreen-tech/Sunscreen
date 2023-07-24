"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "getS2BoundaryFlat", {
  enumerable: true,
  get: function get() {
    return _s2GeometryFunctions.getS2BoundaryFlat;
  }
});
Object.defineProperty(exports, "getS2Cell", {
  enumerable: true,
  get: function get() {
    return _s2CellUtils.getS2Cell;
  }
});
Object.defineProperty(exports, "getS2CellFromQuadKey", {
  enumerable: true,
  get: function get() {
    return _s2Geometry.getS2CellFromQuadKey;
  }
});
Object.defineProperty(exports, "getS2CellIdFromQuadkey", {
  enumerable: true,
  get: function get() {
    return _s2Geometry.getS2CellIdFromQuadkey;
  }
});
Object.defineProperty(exports, "getS2CellIdFromToken", {
  enumerable: true,
  get: function get() {
    return _s2TokenFunctions.getS2CellIdFromToken;
  }
});
Object.defineProperty(exports, "getS2ChildCellId", {
  enumerable: true,
  get: function get() {
    return _s2TokenFunctions.getS2ChildCellId;
  }
});
Object.defineProperty(exports, "getS2LngLat", {
  enumerable: true,
  get: function get() {
    return _s2GeometryFunctions.getS2LngLat;
  }
});
Object.defineProperty(exports, "getS2LngLatFromS2Cell", {
  enumerable: true,
  get: function get() {
    return _s2Geometry.getS2LngLatFromS2Cell;
  }
});
Object.defineProperty(exports, "getS2OrientedBoundingBoxCornerPoints", {
  enumerable: true,
  get: function get() {
    return _s2ToObbPoints.getS2OrientedBoundingBoxCornerPoints;
  }
});
Object.defineProperty(exports, "getS2QuadKey", {
  enumerable: true,
  get: function get() {
    return _s2CellUtils.getS2QuadKey;
  }
});
Object.defineProperty(exports, "getS2QuadkeyFromCellId", {
  enumerable: true,
  get: function get() {
    return _s2Geometry.getS2QuadkeyFromCellId;
  }
});
Object.defineProperty(exports, "getS2Region", {
  enumerable: true,
  get: function get() {
    return _s2ToRegion.getS2Region;
  }
});
Object.defineProperty(exports, "getS2TokenFromCellId", {
  enumerable: true,
  get: function get() {
    return _s2TokenFunctions.getS2TokenFromCellId;
  }
});
var _s2TokenFunctions = require("./s2-token-functions");
var _s2GeometryFunctions = require("./s2-geometry-functions");
var _s2CellUtils = require("./s2geometry/s2-cell-utils");
var _s2Geometry = require("./s2geometry/s2-geometry");
var _s2ToRegion = require("./converters/s2-to-region");
var _s2ToObbPoints = require("./converters/s2-to-obb-points");
//# sourceMappingURL=index.js.map