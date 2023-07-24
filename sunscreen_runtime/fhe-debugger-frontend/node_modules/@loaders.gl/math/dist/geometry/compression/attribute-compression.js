"use strict";
// This file is derived from the Cesium code base under Apache 2 license
// See LICENSE.md and https://github.com/AnalyticalGraphicsInc/cesium/blob/master/LICENSE.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.zigZagDeltaDecode = exports.decompressTextureCoordinates = exports.compressTextureCoordinates = exports.octUnpack = exports.octPack = exports.octDecodeFloat = exports.octEncodeFloat = exports.octPackFloat = exports.octDecodeFromVector4 = exports.octDecode = exports.octDecodeInRange = exports.octEncodeToVector4 = exports.octEncode = exports.octEncodeInRange = void 0;
// Attribute compression and decompression functions.
const core_1 = require("@math.gl/core");
const assert_1 = require("../utils/assert");
const RIGHT_SHIFT = 1.0 / 256.0;
const LEFT_SHIFT = 256.0;
const scratchVector2 = new core_1.Vector2();
const scratchVector3 = new core_1.Vector3();
const scratchEncodeVector2 = new core_1.Vector2();
const octEncodeScratch = new core_1.Vector2();
const uint8ForceArray = new Uint8Array(1);
/**
 * Force a value to Uint8
 *
 * @param value
 * @returns
 */
function forceUint8(value) {
    uint8ForceArray[0] = value;
    return uint8ForceArray[0];
}
/**
 * Converts a SNORM value in the range [0, rangeMaximum] to a scalar in the range [-1.0, 1.0].
 *
 * @param value SNORM value in the range [0, rangeMaximum]
 * @param [rangeMaximum=255] The maximum value in the SNORM range, 255 by default.
 * @returns Scalar in the range [-1.0, 1.0].
 *
 * @see CesiumMath.toSNorm
 */
function fromSNorm(value, rangeMaximum = 255) {
    return ((0, core_1.clamp)(value, 0.0, rangeMaximum) / rangeMaximum) * 2.0 - 1.0;
}
/**
 * Converts a scalar value in the range [-1.0, 1.0] to a SNORM in the range [0, rangeMaximum].
 *
 * @param value The scalar value in the range [-1.0, 1.0]
 * @param [rangeMaximum=255] The maximum value in the mapped range, 255 by default.
 * @returns A SNORM value, where 0 maps to -1.0 and rangeMaximum maps to 1.0.
 *
 * @see CesiumMath.fromSNorm
 */
function toSNorm(value, rangeMaximum = 255) {
    return Math.round(((0, core_1.clamp)(value, -1.0, 1.0) * 0.5 + 0.5) * rangeMaximum);
}
/**
 * Returns 1.0 if the given value is positive or zero, and -1.0 if it is negative.
 * This is similar to `Math.sign` except that returns 1.0 instead of
 * 0.0 when the input value is 0.0.
 *
 * @param value The value to return the sign of.
 * @returns The sign of value.
 */
function signNotZero(value) {
    return value < 0.0 ? -1.0 : 1.0;
}
/**
 * Encodes a normalized vector into 2 SNORM values in the range of [0-rangeMax] following the 'oct' encoding.
 *
 * Oct encoding is a compact representation of unit length vectors.
 * The 'oct' encoding is described in "A Survey of Efficient Representations of Independent Unit Vectors",
 * Cigolle et al 2014: {@link http://jcgt.org/published/0003/02/01/}
 *
 * @param vector The normalized vector to be compressed into 2 component 'oct' encoding.
 * @param result The 2 component oct-encoded unit length vector.
 * @param rangeMax The maximum value of the SNORM range. The encoded vector is stored in log2(rangeMax+1) bits.
 * @returns The 2 component oct-encoded unit length vector.
 *
 * @exception vector must be normalized.
 *
 * @see octDecodeInRange
 */
function octEncodeInRange(vector, rangeMax, result) {
    (0, assert_1.assert)(vector);
    (0, assert_1.assert)(result);
    const vector3 = scratchVector3.from(vector);
    (0, assert_1.assert)(Math.abs(vector3.magnitudeSquared() - 1.0) <= core_1._MathUtils.EPSILON6);
    result.x = vector.x / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
    result.y = vector.y / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
    if (vector.z < 0) {
        const x = result.x;
        const y = result.y;
        result.x = (1.0 - Math.abs(y)) * signNotZero(x);
        result.y = (1.0 - Math.abs(x)) * signNotZero(y);
    }
    result.x = toSNorm(result.x, rangeMax);
    result.y = toSNorm(result.y, rangeMax);
    return result;
}
exports.octEncodeInRange = octEncodeInRange;
/**
 * Encodes a normalized vector into 2 SNORM values in the range of [0-255] following the 'oct' encoding.
 *
 * @param vector The normalized vector to be compressed into 2 byte 'oct' encoding.
 * @param result The 2 byte oct-encoded unit length vector.
 * @returns he 2 byte oct-encoded unit length vector.
 *
 * @exception vector must be normalized.
 *
 * @see octEncodeInRange
 * @see octDecode
 */
function octEncode(vector, result) {
    return octEncodeInRange(vector, 255, result);
}
exports.octEncode = octEncode;
/**
 * Encodes a normalized vector into 4-byte vector
 * @param vector The normalized vector to be compressed into 4 byte 'oct' encoding.
 * @param result The 4 byte oct-encoded unit length vector.
 * @returns The 4 byte oct-encoded unit length vector.
 *
 * @exception vector must be normalized.
 *
 * @see octEncodeInRange
 * @see octDecodeFromVector4
 */
function octEncodeToVector4(vector, result) {
    octEncodeInRange(vector, 65535, octEncodeScratch);
    result.x = forceUint8(octEncodeScratch.x * RIGHT_SHIFT);
    result.y = forceUint8(octEncodeScratch.x);
    result.z = forceUint8(octEncodeScratch.y * RIGHT_SHIFT);
    result.w = forceUint8(octEncodeScratch.y);
    return result;
}
exports.octEncodeToVector4 = octEncodeToVector4;
/**
 * Decodes a unit-length vector in 'oct' encoding to a normalized 3-component vector.
 *
 * @param x The x component of the oct-encoded unit length vector.
 * @param y The y component of the oct-encoded unit length vector.
 * @param rangeMax The maximum value of the SNORM range. The encoded vector is stored in log2(rangeMax+1) bits.
 * @param result The decoded and normalized vector
 * @returns The decoded and normalized vector.
 *
 * @exception x and y must be unsigned normalized integers between 0 and rangeMax.
 *
 * @see octEncodeInRange
 */
function octDecodeInRange(x, y, rangeMax, result) {
    (0, assert_1.assert)(result);
    if (x < 0 || x > rangeMax || y < 0 || y > rangeMax) {
        throw new Error(`x and y must be unsigned normalized integers between 0 and ${rangeMax}`);
    }
    result.x = fromSNorm(x, rangeMax);
    result.y = fromSNorm(y, rangeMax);
    result.z = 1.0 - (Math.abs(result.x) + Math.abs(result.y));
    if (result.z < 0.0) {
        const oldVX = result.x;
        result.x = (1.0 - Math.abs(result.y)) * signNotZero(oldVX);
        result.y = (1.0 - Math.abs(oldVX)) * signNotZero(result.y);
    }
    return result.normalize();
}
exports.octDecodeInRange = octDecodeInRange;
/**
 * Decodes a unit-length vector in 2 byte 'oct' encoding to a normalized 3-component vector.
 *
 * @param x The x component of the oct-encoded unit length vector.
 * @param y The y component of the oct-encoded unit length vector.
 * @param result The decoded and normalized vector.
 * @returns he decoded and normalized vector.
 *
 * @exception x and y must be an unsigned normalized integer between 0 and 255.
 *
 * @see octDecodeInRange
 */
function octDecode(x, y, result) {
    return octDecodeInRange(x, y, 255, result);
}
exports.octDecode = octDecode;
/**
 * Decodes a unit-length vector in 4 byte 'oct' encoding to a normalized 3-component vector.
 *
 * @param encoded The oct-encoded unit length vector.
 * @param esult The decoded and normalized vector.
 * @returns The decoded and normalized vector.
 *
 * @exception x, y, z, and w must be unsigned normalized integers between 0 and 255.
 *
 * @see octDecodeInRange
 * @see octEncodeToVector4
 */
function octDecodeFromVector4(encoded, result) {
    (0, assert_1.assert)(encoded);
    (0, assert_1.assert)(result);
    const x = encoded.x;
    const y = encoded.y;
    const z = encoded.z;
    const w = encoded.w;
    if (x < 0 || x > 255 || y < 0 || y > 255 || z < 0 || z > 255 || w < 0 || w > 255) {
        throw new Error('x, y, z, and w must be unsigned normalized integers between 0 and 255');
    }
    const xOct16 = x * LEFT_SHIFT + y;
    const yOct16 = z * LEFT_SHIFT + w;
    return octDecodeInRange(xOct16, yOct16, 65535, result);
}
exports.octDecodeFromVector4 = octDecodeFromVector4;
/**
 * Packs an oct encoded vector into a single floating-point number.
 *
 * @param encoded The oct encoded vector.
 * @returns The oct encoded vector packed into a single float.
 *
 */
function octPackFloat(encoded) {
    const vector2 = scratchVector2.from(encoded);
    return 256.0 * vector2.x + vector2.y;
}
exports.octPackFloat = octPackFloat;
/**
 * Encodes a normalized vector into 2 SNORM values in the range of [0-255] following the 'oct' encoding and
 * stores those values in a single float-point number.
 *
 * @param vector The normalized vector to be compressed into 2 byte 'oct' encoding.
 * @returns The 2 byte oct-encoded unit length vector.
 *
 * @exception vector must be normalized.
 */
function octEncodeFloat(vector) {
    octEncode(vector, scratchEncodeVector2);
    return octPackFloat(scratchEncodeVector2);
}
exports.octEncodeFloat = octEncodeFloat;
/**
 * Decodes a unit-length vector in 'oct' encoding packed in a floating-point number to a normalized 3-component vector.
 *
 * @param value The oct-encoded unit length vector stored as a single floating-point number.
 * @param result The decoded and normalized vector
 * @returns The decoded and normalized vector.
 *
 */
function octDecodeFloat(value, result) {
    (0, assert_1.assert)(Number.isFinite(value));
    const temp = value / 256.0;
    const x = Math.floor(temp);
    const y = (temp - x) * 256.0;
    return octDecode(x, y, result);
}
exports.octDecodeFloat = octDecodeFloat;
/**
 * Encodes three normalized vectors into 6 SNORM values in the range of [0-255] following the 'oct' encoding and
 * packs those into two floating-point numbers.
 *
 * @param v1 A normalized vector to be compressed.
 * @param v2 A normalized vector to be compressed.
 * @param v3 A normalized vector to be compressed.
 * @param result The 'oct' encoded vectors packed into two floating-point numbers.
 * @returns The 'oct' encoded vectors packed into two floating-point numbers.
 *
 */
function octPack(v1, v2, v3, result) {
    (0, assert_1.assert)(v1);
    (0, assert_1.assert)(v2);
    (0, assert_1.assert)(v3);
    (0, assert_1.assert)(result);
    const encoded1 = octEncodeFloat(v1);
    const encoded2 = octEncodeFloat(v2);
    const encoded3 = octEncode(v3, scratchEncodeVector2);
    result.x = 65536.0 * encoded3.x + encoded1;
    result.y = 65536.0 * encoded3.y + encoded2;
    return result;
}
exports.octPack = octPack;
/**
 * Decodes three unit-length vectors in 'oct' encoding packed into a floating-point number to a normalized 3-component vector.
 *
 * @param packed The three oct-encoded unit length vectors stored as two floating-point number.
 * @param v1 One decoded and normalized vector.
 * @param v2 One decoded and normalized vector.
 * @param v3 One decoded and normalized vector.
 */
function octUnpack(packed, v1, v2, v3) {
    let temp = packed.x / 65536.0;
    const x = Math.floor(temp);
    const encodedFloat1 = (temp - x) * 65536.0;
    temp = packed.y / 65536.0;
    const y = Math.floor(temp);
    const encodedFloat2 = (temp - y) * 65536.0;
    octDecodeFloat(encodedFloat1, v1);
    octDecodeFloat(encodedFloat2, v2);
    octDecode(x, y, v3);
}
exports.octUnpack = octUnpack;
/**
 * Pack texture coordinates into a single float. The texture coordinates will only preserve 12 bits of precision.
 *
 * @param textureCoordinates The texture coordinates to compress.  Both coordinates must be in the range 0.0-1.0.
 * @returns The packed texture coordinates.
 *
 */
function compressTextureCoordinates(textureCoordinates) {
    // Move x and y to the range 0-4095;
    const x = (textureCoordinates.x * 4095.0) | 0;
    const y = (textureCoordinates.y * 4095.0) | 0;
    return 4096.0 * x + y;
}
exports.compressTextureCoordinates = compressTextureCoordinates;
/**
 * Decompresses texture coordinates that were packed into a single float.
 *
 * @param compressed The compressed texture coordinates.
 * @param result The decompressed texture coordinates.
 * @returns The modified result parameter.
 *
 */
function decompressTextureCoordinates(compressed, result) {
    const temp = compressed / 4096.0;
    const xZeroTo4095 = Math.floor(temp);
    result.x = xZeroTo4095 / 4095.0;
    result.y = (compressed - xZeroTo4095 * 4096) / 4095;
    return result;
}
exports.decompressTextureCoordinates = decompressTextureCoordinates;
/**
 * Decodes delta and ZigZag encoded vertices. This modifies the buffers in place.
 *
 * @param uBuffer The buffer view of u values.
 * @param vBuffer The buffer view of v values.
 * @param [heightBuffer] The buffer view of height values.
 *
 * @link https://github.com/AnalyticalGraphicsInc/quantized-mesh|quantized-mesh-1.0 terrain format
 */
function zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer) {
    (0, assert_1.assert)(uBuffer);
    (0, assert_1.assert)(vBuffer);
    (0, assert_1.assert)(uBuffer.length === vBuffer.length);
    if (heightBuffer) {
        (0, assert_1.assert)(uBuffer.length === heightBuffer.length);
    }
    function zigZagDecode(value) {
        return (value >> 1) ^ -(value & 1);
    }
    let u = 0;
    let v = 0;
    let height = 0;
    for (let i = 0; i < uBuffer.length; ++i) {
        u += zigZagDecode(uBuffer[i]);
        v += zigZagDecode(vBuffer[i]);
        uBuffer[i] = u;
        vBuffer[i] = v;
        if (heightBuffer) {
            height += zigZagDecode(heightBuffer[i]);
            heightBuffer[i] = height;
        }
    }
}
exports.zigZagDeltaDecode = zigZagDeltaDecode;
