"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FaceUVToXYZ = FaceUVToXYZ;
exports.IJToST = IJToST;
exports.STToUV = STToUV;
exports.XYZToLngLat = XYZToLngLat;
exports.getCornerLngLats = getCornerLngLats;
exports.getS2CellFromQuadKey = getS2CellFromQuadKey;
exports.getS2CellIdFromQuadkey = getS2CellIdFromQuadkey;
exports.getS2LngLatFromS2Cell = getS2LngLatFromS2Cell;
exports.getS2QuadkeyFromCellId = getS2QuadkeyFromCellId;
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _long = _interopRequireDefault(require("long"));
var FACE_BITS = 3;
var MAX_LEVEL = 30;
var POS_BITS = 2 * MAX_LEVEL + 1;
var RADIAN_TO_DEGREE = 180 / Math.PI;
function getS2CellFromQuadKey(hilbertQuadkey) {
  if (hilbertQuadkey.length === 0) {
    throw new Error("Invalid Hilbert quad key ".concat(hilbertQuadkey));
  }
  var parts = hilbertQuadkey.split('/');
  var face = parseInt(parts[0], 10);
  var position = parts[1];
  var maxLevel = position.length;
  var level = 0;
  var point = [0, 0];
  for (var i = maxLevel - 1; i >= 0; i--) {
    level = maxLevel - i;
    var bit = position[i];
    var rx = 0;
    var ry = 0;
    if (bit === '1') {
      ry = 1;
    } else if (bit === '2') {
      rx = 1;
      ry = 1;
    } else if (bit === '3') {
      rx = 1;
    }
    var val = Math.pow(2, level - 1);
    rotateAndFlipQuadrant(val, point, rx, ry);
    point[0] += val * rx;
    point[1] += val * ry;
  }
  if (face % 2 === 1) {
    var t = point[0];
    point[0] = point[1];
    point[1] = t;
  }
  return {
    face: face,
    ij: point,
    level: level
  };
}
function getS2QuadkeyFromCellId(cellId) {
  if (cellId.isZero()) {
    return '';
  }
  var bin = cellId.toString(2);
  while (bin.length < FACE_BITS + POS_BITS) {
    bin = '0' + bin;
  }
  var lsbIndex = bin.lastIndexOf('1');
  var faceB = bin.substring(0, 3);
  var posB = bin.substring(3, lsbIndex);
  var levelN = posB.length / 2;
  var faceS = _long.default.fromString(faceB, true, 2).toString(10);
  var posS = '';
  if (levelN !== 0) {
    posS = _long.default.fromString(posB, true, 2).toString(4);
    while (posS.length < levelN) {
      posS = '0' + posS;
    }
  }
  return "".concat(faceS, "/").concat(posS);
}
function getS2CellIdFromQuadkey(hilbertQuadkey) {
  if (hilbertQuadkey.length === 0 || hilbertQuadkey.indexOf('/') !== 1) {
    throw new Error("Invalid Hilbert quad key ".concat(hilbertQuadkey));
  }
  var idS = '';
  var faceS = hilbertQuadkey[0];
  switch (faceS) {
    case '0':
      idS += '000';
      break;
    case '1':
      idS += '001';
      break;
    case '2':
      idS += '010';
      break;
    case '3':
      idS += '011';
      break;
    case '4':
      idS += '100';
      break;
    case '5':
      idS += '101';
      break;
    default:
      throw new Error("Invalid Hilbert quad key ".concat(hilbertQuadkey));
  }
  var maxLevel = hilbertQuadkey.length;
  for (var i = 2; i < maxLevel; i++) {
    var p = hilbertQuadkey[i];
    switch (p) {
      case '0':
        idS += '00';
        break;
      case '1':
        idS += '01';
        break;
      case '2':
        idS += '10';
        break;
      case '3':
        idS += '11';
        break;
      default:
        throw new Error("Invalid Hilbert quad key ".concat(hilbertQuadkey));
    }
  }
  idS += '1';
  var paddedId = idS.padEnd(64, '0');
  var id = _long.default.fromString(paddedId, true, 2);
  return id;
}
function IJToST(ij, level, offsets) {
  var maxSize = 1 << level;
  return [(ij[0] + offsets[0]) / maxSize, (ij[1] + offsets[1]) / maxSize];
}
function singleSTtoUV(st) {
  if (st >= 0.5) {
    return 1 / 3.0 * (4 * st * st - 1);
  }
  return 1 / 3.0 * (1 - 4 * (1 - st) * (1 - st));
}
function STToUV(st) {
  return [singleSTtoUV(st[0]), singleSTtoUV(st[1])];
}
function FaceUVToXYZ(face, _ref) {
  var _ref2 = (0, _slicedToArray2.default)(_ref, 2),
    u = _ref2[0],
    v = _ref2[1];
  switch (face) {
    case 0:
      return [1, u, v];
    case 1:
      return [-u, 1, v];
    case 2:
      return [-u, -v, 1];
    case 3:
      return [-1, -v, -u];
    case 4:
      return [v, -1, -u];
    case 5:
      return [v, u, -1];
    default:
      throw new Error('Invalid face');
  }
}
function XYZToLngLat(_ref3) {
  var _ref4 = (0, _slicedToArray2.default)(_ref3, 3),
    x = _ref4[0],
    y = _ref4[1],
    z = _ref4[2];
  var lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  var lng = Math.atan2(y, x);
  return [lng * RADIAN_TO_DEGREE, lat * RADIAN_TO_DEGREE];
}
function rotateAndFlipQuadrant(n, point, rx, ry) {
  if (ry === 0) {
    if (rx === 1) {
      point[0] = n - 1 - point[0];
      point[1] = n - 1 - point[1];
    }
    var x = point[0];
    point[0] = point[1];
    point[1] = x;
  }
}
function getS2LngLatFromS2Cell(s2Cell) {
  var st = IJToST(s2Cell.ij, s2Cell.level, [0.5, 0.5]);
  var uv = STToUV(st);
  var xyz = FaceUVToXYZ(s2Cell.face, uv);
  return XYZToLngLat(xyz);
}
function getCornerLngLats(s2Cell) {
  var result = [];
  var offsets = [[0.0, 0.0], [0.0, 1.0], [1.0, 1.0], [1.0, 0.0]];
  for (var i = 0; i < 4; i++) {
    var st = IJToST(s2Cell.ij, s2Cell.level, offsets[i]);
    var uv = STToUV(st);
    var xyz = FaceUVToXYZ(s2Cell.face, uv);
    result.push(XYZToLngLat(xyz));
  }
  return result;
}
//# sourceMappingURL=s2-geometry.js.map