import { Vector2, Vector3 } from '@math.gl/core';
type Vector4 = {
    x: number;
    y: number;
    z: number;
    w: number;
};
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
export declare function octEncodeInRange(vector: Vector3, rangeMax: number, result: Vector2): Vector2;
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
export declare function octEncode(vector: Vector3, result: Vector2): Vector2;
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
export declare function octEncodeToVector4(vector: Vector3, result: Vector4): Vector4;
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
export declare function octDecodeInRange(x: number, y: number, rangeMax: number, result: Vector3): Vector3;
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
export declare function octDecode(x: number, y: number, result: Vector3): Vector3;
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
export declare function octDecodeFromVector4(encoded: Vector4, result: Vector3): Vector3;
/**
 * Packs an oct encoded vector into a single floating-point number.
 *
 * @param encoded The oct encoded vector.
 * @returns The oct encoded vector packed into a single float.
 *
 */
export declare function octPackFloat(encoded: Vector2): number;
/**
 * Encodes a normalized vector into 2 SNORM values in the range of [0-255] following the 'oct' encoding and
 * stores those values in a single float-point number.
 *
 * @param vector The normalized vector to be compressed into 2 byte 'oct' encoding.
 * @returns The 2 byte oct-encoded unit length vector.
 *
 * @exception vector must be normalized.
 */
export declare function octEncodeFloat(vector: Vector3): number;
/**
 * Decodes a unit-length vector in 'oct' encoding packed in a floating-point number to a normalized 3-component vector.
 *
 * @param value The oct-encoded unit length vector stored as a single floating-point number.
 * @param result The decoded and normalized vector
 * @returns The decoded and normalized vector.
 *
 */
export declare function octDecodeFloat(value: number, result: Vector3): Vector3;
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
export declare function octPack(v1: Vector3, v2: Vector3, v3: Vector3, result: Vector2): Vector2;
/**
 * Decodes three unit-length vectors in 'oct' encoding packed into a floating-point number to a normalized 3-component vector.
 *
 * @param packed The three oct-encoded unit length vectors stored as two floating-point number.
 * @param v1 One decoded and normalized vector.
 * @param v2 One decoded and normalized vector.
 * @param v3 One decoded and normalized vector.
 */
export declare function octUnpack(packed: Vector2, v1: Vector3, v2: Vector3, v3: Vector3): void;
/**
 * Pack texture coordinates into a single float. The texture coordinates will only preserve 12 bits of precision.
 *
 * @param textureCoordinates The texture coordinates to compress.  Both coordinates must be in the range 0.0-1.0.
 * @returns The packed texture coordinates.
 *
 */
export declare function compressTextureCoordinates(textureCoordinates: Vector2): number;
/**
 * Decompresses texture coordinates that were packed into a single float.
 *
 * @param compressed The compressed texture coordinates.
 * @param result The decompressed texture coordinates.
 * @returns The modified result parameter.
 *
 */
export declare function decompressTextureCoordinates(compressed: number, result: Vector2): Vector2;
/**
 * Decodes delta and ZigZag encoded vertices. This modifies the buffers in place.
 *
 * @param uBuffer The buffer view of u values.
 * @param vBuffer The buffer view of v values.
 * @param [heightBuffer] The buffer view of height values.
 *
 * @link https://github.com/AnalyticalGraphicsInc/quantized-mesh|quantized-mesh-1.0 terrain format
 */
export declare function zigZagDeltaDecode(uBuffer: Uint16Array, vBuffer: Uint16Array, heightBuffer?: Uint16Array | number[]): void;
export {};
//# sourceMappingURL=attribute-compression.d.ts.map