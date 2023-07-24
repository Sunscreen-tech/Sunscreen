"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compressTextureCoordinates = compressTextureCoordinates;
exports.decompressTextureCoordinates = decompressTextureCoordinates;
exports.octDecode = octDecode;
exports.octDecodeFloat = octDecodeFloat;
exports.octDecodeFromVector4 = octDecodeFromVector4;
exports.octDecodeInRange = octDecodeInRange;
exports.octEncode = octEncode;
exports.octEncodeFloat = octEncodeFloat;
exports.octEncodeInRange = octEncodeInRange;
exports.octEncodeToVector4 = octEncodeToVector4;
exports.octPack = octPack;
exports.octPackFloat = octPackFloat;
exports.octUnpack = octUnpack;
exports.zigZagDeltaDecode = zigZagDeltaDecode;
var _core = require("@math.gl/core");
var _assert = require("../utils/assert");
var RIGHT_SHIFT = 1.0 / 256.0;
var LEFT_SHIFT = 256.0;
var scratchVector2 = new _core.Vector2();
var scratchVector3 = new _core.Vector3();
var scratchEncodeVector2 = new _core.Vector2();
var octEncodeScratch = new _core.Vector2();
var uint8ForceArray = new Uint8Array(1);
function forceUint8(value) {
  uint8ForceArray[0] = value;
  return uint8ForceArray[0];
}
function fromSNorm(value) {
  var rangeMaximum = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 255;
  return (0, _core.clamp)(value, 0.0, rangeMaximum) / rangeMaximum * 2.0 - 1.0;
}
function toSNorm(value) {
  var rangeMaximum = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 255;
  return Math.round(((0, _core.clamp)(value, -1.0, 1.0) * 0.5 + 0.5) * rangeMaximum);
}
function signNotZero(value) {
  return value < 0.0 ? -1.0 : 1.0;
}
function octEncodeInRange(vector, rangeMax, result) {
  (0, _assert.assert)(vector);
  (0, _assert.assert)(result);
  var vector3 = scratchVector3.from(vector);
  (0, _assert.assert)(Math.abs(vector3.magnitudeSquared() - 1.0) <= _core._MathUtils.EPSILON6);
  result.x = vector.x / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
  result.y = vector.y / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
  if (vector.z < 0) {
    var x = result.x;
    var y = result.y;
    result.x = (1.0 - Math.abs(y)) * signNotZero(x);
    result.y = (1.0 - Math.abs(x)) * signNotZero(y);
  }
  result.x = toSNorm(result.x, rangeMax);
  result.y = toSNorm(result.y, rangeMax);
  return result;
}
function octEncode(vector, result) {
  return octEncodeInRange(vector, 255, result);
}
function octEncodeToVector4(vector, result) {
  octEncodeInRange(vector, 65535, octEncodeScratch);
  result.x = forceUint8(octEncodeScratch.x * RIGHT_SHIFT);
  result.y = forceUint8(octEncodeScratch.x);
  result.z = forceUint8(octEncodeScratch.y * RIGHT_SHIFT);
  result.w = forceUint8(octEncodeScratch.y);
  return result;
}
function octDecodeInRange(x, y, rangeMax, result) {
  (0, _assert.assert)(result);
  if (x < 0 || x > rangeMax || y < 0 || y > rangeMax) {
    throw new Error("x and y must be unsigned normalized integers between 0 and ".concat(rangeMax));
  }
  result.x = fromSNorm(x, rangeMax);
  result.y = fromSNorm(y, rangeMax);
  result.z = 1.0 - (Math.abs(result.x) + Math.abs(result.y));
  if (result.z < 0.0) {
    var oldVX = result.x;
    result.x = (1.0 - Math.abs(result.y)) * signNotZero(oldVX);
    result.y = (1.0 - Math.abs(oldVX)) * signNotZero(result.y);
  }
  return result.normalize();
}
function octDecode(x, y, result) {
  return octDecodeInRange(x, y, 255, result);
}
function octDecodeFromVector4(encoded, result) {
  (0, _assert.assert)(encoded);
  (0, _assert.assert)(result);
  var x = encoded.x;
  var y = encoded.y;
  var z = encoded.z;
  var w = encoded.w;
  if (x < 0 || x > 255 || y < 0 || y > 255 || z < 0 || z > 255 || w < 0 || w > 255) {
    throw new Error('x, y, z, and w must be unsigned normalized integers between 0 and 255');
  }
  var xOct16 = x * LEFT_SHIFT + y;
  var yOct16 = z * LEFT_SHIFT + w;
  return octDecodeInRange(xOct16, yOct16, 65535, result);
}
function octPackFloat(encoded) {
  var vector2 = scratchVector2.from(encoded);
  return 256.0 * vector2.x + vector2.y;
}
function octEncodeFloat(vector) {
  octEncode(vector, scratchEncodeVector2);
  return octPackFloat(scratchEncodeVector2);
}
function octDecodeFloat(value, result) {
  (0, _assert.assert)(Number.isFinite(value));
  var temp = value / 256.0;
  var x = Math.floor(temp);
  var y = (temp - x) * 256.0;
  return octDecode(x, y, result);
}
function octPack(v1, v2, v3, result) {
  (0, _assert.assert)(v1);
  (0, _assert.assert)(v2);
  (0, _assert.assert)(v3);
  (0, _assert.assert)(result);
  var encoded1 = octEncodeFloat(v1);
  var encoded2 = octEncodeFloat(v2);
  var encoded3 = octEncode(v3, scratchEncodeVector2);
  result.x = 65536.0 * encoded3.x + encoded1;
  result.y = 65536.0 * encoded3.y + encoded2;
  return result;
}
function octUnpack(packed, v1, v2, v3) {
  var temp = packed.x / 65536.0;
  var x = Math.floor(temp);
  var encodedFloat1 = (temp - x) * 65536.0;
  temp = packed.y / 65536.0;
  var y = Math.floor(temp);
  var encodedFloat2 = (temp - y) * 65536.0;
  octDecodeFloat(encodedFloat1, v1);
  octDecodeFloat(encodedFloat2, v2);
  octDecode(x, y, v3);
}
function compressTextureCoordinates(textureCoordinates) {
  var x = textureCoordinates.x * 4095.0 | 0;
  var y = textureCoordinates.y * 4095.0 | 0;
  return 4096.0 * x + y;
}
function decompressTextureCoordinates(compressed, result) {
  var temp = compressed / 4096.0;
  var xZeroTo4095 = Math.floor(temp);
  result.x = xZeroTo4095 / 4095.0;
  result.y = (compressed - xZeroTo4095 * 4096) / 4095;
  return result;
}
function zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer) {
  (0, _assert.assert)(uBuffer);
  (0, _assert.assert)(vBuffer);
  (0, _assert.assert)(uBuffer.length === vBuffer.length);
  if (heightBuffer) {
    (0, _assert.assert)(uBuffer.length === heightBuffer.length);
  }
  function zigZagDecode(value) {
    return value >> 1 ^ -(value & 1);
  }
  var u = 0;
  var v = 0;
  var height = 0;
  for (var i = 0; i < uBuffer.length; ++i) {
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