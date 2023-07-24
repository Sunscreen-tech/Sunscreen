"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeVertexNormals = void 0;
const core_1 = require("@math.gl/core");
const constants_1 = require("../constants");
const assert_1 = require("../utils/assert");
const primitive_iterator_1 = require("../iterators/primitive-iterator");
const modes_1 = require("../primitives/modes");
const get_attribute_from_geometry_1 = require("./get-attribute-from-geometry");
/**
 * Computes vertex normals for a geometry
 * @param param0
 * @returns
 */
// eslint-disable-next-line max-statements
function computeVertexNormals(geometry) {
    // Only support GL.TRIANGLES, GL.TRIANGLE_STRIP, GL.TRIANGLE_FAN
    (0, assert_1.assert)((0, modes_1.getPrimitiveModeType)(geometry.mode) === constants_1.GL.TRIANGLES, 'TRIANGLES required');
    const { values: positions } = (0, get_attribute_from_geometry_1.getPositions)(geometry);
    const normals = new Float32Array(positions.length);
    const vectorA = new core_1.Vector3();
    const vectorB = new core_1.Vector3();
    const vectorC = new core_1.Vector3();
    const vectorCB = new core_1.Vector3();
    const vectorAB = new core_1.Vector3();
    for (const primitive of (0, primitive_iterator_1.makePrimitiveIterator)(geometry)) {
        vectorA.fromArray(positions, primitive.i1 * 3);
        vectorB.fromArray(positions, primitive.i2 * 3 + 3);
        vectorC.fromArray(positions, primitive.i3 * 3 + 6);
        vectorCB.subVectors(vectorC, vectorB);
        vectorAB.subVectors(vectorA, vectorB);
        const normal = vectorCB.cross(vectorAB);
        normal.normalize();
        // @ts-ignore
        const { primitiveIndex } = primitive;
        normals[primitiveIndex * 9 + 0] = normal.x;
        normals[primitiveIndex * 9 + 1] = normal.y;
        normals[primitiveIndex * 9 + 2] = normal.z;
        normals[primitiveIndex * 9 + 3] = normal.x;
        normals[primitiveIndex * 9 + 4] = normal.y;
        normals[primitiveIndex * 9 + 5] = normal.z;
        normals[primitiveIndex * 9 + 6] = normal.x;
        normals[primitiveIndex * 9 + 7] = normal.y;
        normals[primitiveIndex * 9 + 8] = normal.z;
    }
    return normals;
}
exports.computeVertexNormals = computeVertexNormals;
