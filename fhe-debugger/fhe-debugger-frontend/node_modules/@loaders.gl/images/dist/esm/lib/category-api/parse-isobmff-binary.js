export function getISOBMFFMediaType(buffer) {
  if (!checkString(buffer, 'ftyp', 4)) {
    return null;
  }
  if ((buffer[8] & 0x60) === 0x00) {
    return null;
  }
  return decodeMajorBrand(buffer);
}
export function decodeMajorBrand(buffer) {
  const brandMajor = getUTF8String(buffer, 8, 12).replace('\0', ' ').trim();
  switch (brandMajor) {
    case 'avif':
    case 'avis':
      return {
        extension: 'avif',
        mimeType: 'image/avif'
      };
    default:
      return null;
  }
}
function getUTF8String(array, start, end) {
  return String.fromCharCode(...array.slice(start, end));
}
function stringToBytes(string) {
  return [...string].map(character => character.charCodeAt(0));
}
function checkString(buffer, header) {
  let offset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  const headerBytes = stringToBytes(header);
  for (let i = 0; i < headerBytes.length; ++i) {
    if (headerBytes[i] !== buffer[i + offset]) {
      return false;
    }
  }
  return true;
}
//# sourceMappingURL=parse-isobmff-binary.js.map