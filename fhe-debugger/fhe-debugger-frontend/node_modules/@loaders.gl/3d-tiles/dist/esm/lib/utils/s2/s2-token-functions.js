import Long from 'long';
const MAXIMUM_TOKEN_LENGTH = 16;
export function getS2CellIdFromToken(token) {
  if (token === 'X') {
    token = '';
  }
  const paddedToken = token.padEnd(MAXIMUM_TOKEN_LENGTH, '0');
  return Long.fromString(paddedToken, true, 16);
}
export function getS2TokenFromCellId(cellId) {
  if (cellId.isZero()) {
    return 'X';
  }
  let numZeroDigits = cellId.countTrailingZeros();
  const remainder = numZeroDigits % 4;
  numZeroDigits = (numZeroDigits - remainder) / 4;
  const trailingZeroHexChars = numZeroDigits;
  numZeroDigits *= 4;
  const x = cellId.shiftRightUnsigned(numZeroDigits);
  const hexString = x.toString(16).replace(/0+$/, '');
  const zeroString = Array(17 - trailingZeroHexChars - hexString.length).join('0');
  return zeroString + hexString;
}
export function getS2ChildCellId(cellId, index) {
  const newLsb = lsb(cellId).shiftRightUnsigned(2);
  const childCellId = cellId.add(Long.fromNumber(2 * index + 1 - 4).multiply(newLsb));
  return childCellId;
}
function lsb(cellId) {
  return cellId.and(cellId.not().add(1));
}
//# sourceMappingURL=s2-token-functions.js.map