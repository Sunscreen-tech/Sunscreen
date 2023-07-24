import { getS2CellFromQuadKey, getS2QuadkeyFromCellId } from './s2-geometry';
import { getS2CellIdFromToken } from '../s2-token-functions';
export function getS2Cell(tokenOrKey) {
  const key = getS2QuadKey(tokenOrKey);
  const s2cell = getS2CellFromQuadKey(key);
  return s2cell;
}
export function getS2QuadKey(tokenOrKey) {
  if (tokenOrKey.indexOf('/') > 0) {
    return tokenOrKey;
  }
  const id = getS2CellIdFromToken(tokenOrKey);
  return getS2QuadkeyFromCellId(id);
}
//# sourceMappingURL=s2-cell-utils.js.map