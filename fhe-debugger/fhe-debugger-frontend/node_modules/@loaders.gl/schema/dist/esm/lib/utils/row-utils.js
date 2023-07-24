export function convertToObjectRow(arrayRow, headers) {
  if (!arrayRow) {
    throw new Error('null row');
  }
  if (!headers) {
    throw new Error('no headers');
  }
  const objectRow = {};
  for (let i = 0; i < headers.length; i++) {
    objectRow[headers[i]] = arrayRow[i];
  }
  return objectRow;
}
export function convertToArrayRow(objectRow, headers) {
  if (!objectRow) {
    throw new Error('null row');
  }
  if (!headers) {
    throw new Error('no headers');
  }
  const arrayRow = new Array(headers.length);
  for (let i = 0; i < headers.length; i++) {
    arrayRow[i] = objectRow[headers[i]];
  }
  return arrayRow;
}
//# sourceMappingURL=row-utils.js.map