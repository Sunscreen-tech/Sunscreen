import Long from 'long';
const FACE_BITS = 3;
const MAX_LEVEL = 30;
const POS_BITS = 2 * MAX_LEVEL + 1;
const RADIAN_TO_DEGREE = 180 / Math.PI;
export function getS2CellFromQuadKey(hilbertQuadkey) {
  if (hilbertQuadkey.length === 0) {
    throw new Error("Invalid Hilbert quad key ".concat(hilbertQuadkey));
  }
  const parts = hilbertQuadkey.split('/');
  const face = parseInt(parts[0], 10);
  const position = parts[1];
  const maxLevel = position.length;
  let level = 0;
  const point = [0, 0];
  for (let i = maxLevel - 1; i >= 0; i--) {
    level = maxLevel - i;
    const bit = position[i];
    let rx = 0;
    let ry = 0;
    if (bit === '1') {
      ry = 1;
    } else if (bit === '2') {
      rx = 1;
      ry = 1;
    } else if (bit === '3') {
      rx = 1;
    }
    const val = Math.pow(2, level - 1);
    rotateAndFlipQuadrant(val, point, rx, ry);
    point[0] += val * rx;
    point[1] += val * ry;
  }
  if (face % 2 === 1) {
    const t = point[0];
    point[0] = point[1];
    point[1] = t;
  }
  return {
    face,
    ij: point,
    level
  };
}
export function getS2QuadkeyFromCellId(cellId) {
  if (cellId.isZero()) {
    return '';
  }
  let bin = cellId.toString(2);
  while (bin.length < FACE_BITS + POS_BITS) {
    bin = '0' + bin;
  }
  const lsbIndex = bin.lastIndexOf('1');
  const faceB = bin.substring(0, 3);
  const posB = bin.substring(3, lsbIndex);
  const levelN = posB.length / 2;
  const faceS = Long.fromString(faceB, true, 2).toString(10);
  let posS = '';
  if (levelN !== 0) {
    posS = Long.fromString(posB, true, 2).toString(4);
    while (posS.length < levelN) {
      posS = '0' + posS;
    }
  }
  return "".concat(faceS, "/").concat(posS);
}
export function getS2CellIdFromQuadkey(hilbertQuadkey) {
  if (hilbertQuadkey.length === 0 || hilbertQuadkey.indexOf('/') !== 1) {
    throw new Error("Invalid Hilbert quad key ".concat(hilbertQuadkey));
  }
  let idS = '';
  const faceS = hilbertQuadkey[0];
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
  const maxLevel = hilbertQuadkey.length;
  for (let i = 2; i < maxLevel; i++) {
    const p = hilbertQuadkey[i];
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
  const paddedId = idS.padEnd(64, '0');
  const id = Long.fromString(paddedId, true, 2);
  return id;
}
export function IJToST(ij, level, offsets) {
  const maxSize = 1 << level;
  return [(ij[0] + offsets[0]) / maxSize, (ij[1] + offsets[1]) / maxSize];
}
function singleSTtoUV(st) {
  if (st >= 0.5) {
    return 1 / 3.0 * (4 * st * st - 1);
  }
  return 1 / 3.0 * (1 - 4 * (1 - st) * (1 - st));
}
export function STToUV(st) {
  return [singleSTtoUV(st[0]), singleSTtoUV(st[1])];
}
export function FaceUVToXYZ(face, _ref) {
  let [u, v] = _ref;
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
export function XYZToLngLat(_ref2) {
  let [x, y, z] = _ref2;
  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lng = Math.atan2(y, x);
  return [lng * RADIAN_TO_DEGREE, lat * RADIAN_TO_DEGREE];
}
function rotateAndFlipQuadrant(n, point, rx, ry) {
  if (ry === 0) {
    if (rx === 1) {
      point[0] = n - 1 - point[0];
      point[1] = n - 1 - point[1];
    }
    const x = point[0];
    point[0] = point[1];
    point[1] = x;
  }
}
export function getS2LngLatFromS2Cell(s2Cell) {
  const st = IJToST(s2Cell.ij, s2Cell.level, [0.5, 0.5]);
  const uv = STToUV(st);
  const xyz = FaceUVToXYZ(s2Cell.face, uv);
  return XYZToLngLat(xyz);
}
export function getCornerLngLats(s2Cell) {
  const result = [];
  const offsets = [[0.0, 0.0], [0.0, 1.0], [1.0, 1.0], [1.0, 0.0]];
  for (let i = 0; i < 4; i++) {
    const st = IJToST(s2Cell.ij, s2Cell.level, offsets[i]);
    const uv = STToUV(st);
    const xyz = FaceUVToXYZ(s2Cell.face, uv);
    result.push(XYZToLngLat(xyz));
  }
  return result;
}
//# sourceMappingURL=s2-geometry.js.map