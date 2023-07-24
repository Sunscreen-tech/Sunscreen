"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.normalize = normalize;
function normalize() {
  var normals = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var vector = arguments.length > 1 ? arguments[1] : undefined;
  normals = this.attributes.normal;
  for (var i = 0, il = normals.count; i < il; i++) {
    vector.x = normals.getX(i);
    vector.y = normals.getY(i);
    vector.z = normals.getZ(i);
    vector.normalize();
    normals.setXYZ(i, vector.x, vector.y, vector.z);
  }
}
//# sourceMappingURL=normalize.js.map