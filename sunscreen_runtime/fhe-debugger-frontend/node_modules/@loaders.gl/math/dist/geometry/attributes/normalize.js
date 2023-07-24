"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalize = void 0;
/**
 * Setting X, Y, Z for Vector
 * @param normals
 * @param vector
 */
function normalize(normals = {}, vector) {
    //@ts-ignore
    normals = this.attributes.normal;
    for (let i = 0, il = normals.count; i < il; i++) {
        vector.x = normals.getX(i);
        vector.y = normals.getY(i);
        vector.z = normals.getZ(i);
        vector.normalize();
        normals.setXYZ(i, vector.x, vector.y, vector.z);
    }
}
exports.normalize = normalize;
