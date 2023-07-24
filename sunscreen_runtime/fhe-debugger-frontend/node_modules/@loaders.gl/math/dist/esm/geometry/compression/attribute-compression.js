import { Vector2, Vector3, clamp, _MathUtils } from '@math.gl/core';
import { assert } from '../utils/assert';
const RIGHT_SHIFT = 1.0 / 256.0;
const LEFT_SHIFT = 256.0;
const scratchVector2 = new Vector2();
const scratchVector3 = new Vector3();
const scratchEncodeVector2 = new Vector2();
const octEncodeScratch = new Vector2();
const uint8ForceArray = new Uint8Array(1);
function forceUint8(value) {
  uint8ForceArray[0] = value;
  return uint8ForceArray[0];
}
function fromSNorm(value) {
  let rangeMaximum = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 255;
  return clamp(value, 0.0, rangeMaximum) / rangeMaximum * 2.0 - 1.0;
}
function toSNorm(value) {
  let rangeMaximum = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 255;
  return Math.round((clamp(value, -1.0, 1.0) * 0.5 + 0.5) * rangeMaximum);
}
function signNotZero(value) {
  return value < 0.0 ? -1.0 : 1.0;
}
export function octEncodeInRange(vector, rangeMax, result) {
  assert(vector);
  assert(result);
  const vector3 = scratchVector3.from(vector);
  assert(Math.abs(vector3.magnitudeSquared() - 1.0) <= _MathUtils.EPSILON6);
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
export function octEncode(vector, result) {
  return octEncodeInRange(vector, 255, result);
}
export function octEncodeToVector4(vector, result) {
  octEncodeInRange(vector, 65535, octEncodeScratch);
  result.x = forceUint8(octEncodeScratch.x * RIGHT_SHIFT);
  result.y = forceUint8(octEncodeScratch.x);
  result.z = forceUint8(octEncodeScratch.y * RIGHT_SHIFT);
  result.w = forceUint8(octEncodeScratch.y);
  return result;
}
export function octDecodeInRange(x, y, rangeMax, result) {
  assert(result);
  if (x < 0 || x > rangeMax || y < 0 || y > rangeMax) {
    throw new Error("x and y must be unsigned normalized integers between 0 and ".concat(rangeMax));
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
export function octDecode(x, y, result) {
  return octDecodeInRange(x, y, 255, result);
}
export function octDecodeFromVector4(encoded, result) {
  assert(encoded);
  assert(result);
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
export function octPackFloat(encoded) {
  const vector2 = scratchVector2.from(encoded);
  return 256.0 * vector2.x + vector2.y;
}
export function octEncodeFloat(vector) {
  octEncode(vector, scratchEncodeVector2);
  return octPackFloat(scratchEncodeVector2);
}
export function octDecodeFloat(value, result) {
  assert(Number.isFinite(value));
  const temp = value / 256.0;
  const x = Math.floor(temp);
  const y = (temp - x) * 256.0;
  return octDecode(x, y, result);
}
export function octPack(v1, v2, v3, result) {
  assert(v1);
  assert(v2);
  assert(v3);
  assert(result);
  const encoded1 = octEncodeFloat(v1);
  const encoded2 = octEncodeFloat(v2);
  const encoded3 = octEncode(v3, scratchEncodeVector2);
  result.x = 65536.0 * encoded3.x + encoded1;
  result.y = 65536.0 * encoded3.y + encoded2;
  return result;
}
export function octUnpack(packed, v1, v2, v3) {
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
export function compressTextureCoordinates(textureCoordinates) {
  const x = textureCoordinates.x * 4095.0 | 0;
  const y = textureCoordinates.y * 4095.0 | 0;
  return 4096.0 * x + y;
}
export function decompressTextureCoordinates(compressed, result) {
  const temp = compressed / 4096.0;
  const xZeroTo4095 = Math.floor(temp);
  result.x = xZeroTo4095 / 4095.0;
  result.y = (compressed - xZeroTo4095 * 4096) / 4095;
  return result;
}
export function zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer) {
  assert(uBuffer);
  assert(vBuffer);
  assert(uBuffer.length === vBuffer.length);
  if (heightBuffer) {
    assert(uBuffer.length === heightBuffer.length);
  }
  function zigZagDecode(value) {
    return value >> 1 ^ -(value & 1);
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
//# sourceMappingURL=attribute-compression.js.map