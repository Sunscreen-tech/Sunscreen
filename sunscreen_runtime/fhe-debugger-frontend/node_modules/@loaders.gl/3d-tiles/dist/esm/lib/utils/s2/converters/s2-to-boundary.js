import { IJToST, STToUV, FaceUVToXYZ, XYZToLngLat } from '../s2geometry/s2-geometry';
const MAX_RESOLUTION = 100;
export function getS2BoundaryFlatFromS2Cell(s2cell) {
  const {
    face,
    ij,
    level
  } = s2cell;
  const offsets = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]];
  const resolution = Math.max(1, Math.ceil(MAX_RESOLUTION * Math.pow(2, -level)));
  const result = new Float64Array(4 * resolution * 2 + 2);
  let ptIndex = 0;
  let prevLng = 0;
  for (let i = 0; i < 4; i++) {
    const offset = offsets[i].slice(0);
    const nextOffset = offsets[i + 1];
    const stepI = (nextOffset[0] - offset[0]) / resolution;
    const stepJ = (nextOffset[1] - offset[1]) / resolution;
    for (let j = 0; j < resolution; j++) {
      offset[0] += stepI;
      offset[1] += stepJ;
      const st = IJToST(ij, level, offset);
      const uv = STToUV(st);
      const xyz = FaceUVToXYZ(face, uv);
      const lngLat = XYZToLngLat(xyz);
      if (Math.abs(lngLat[1]) > 89.999) {
        lngLat[0] = prevLng;
      }
      const deltaLng = lngLat[0] - prevLng;
      lngLat[0] += deltaLng > 180 ? -360 : deltaLng < -180 ? 360 : 0;
      result[ptIndex++] = lngLat[0];
      result[ptIndex++] = lngLat[1];
      prevLng = lngLat[0];
    }
  }
  result[ptIndex++] = result[0];
  result[ptIndex++] = result[1];
  return result;
}
//# sourceMappingURL=s2-to-boundary.js.map